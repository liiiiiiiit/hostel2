import {centralAdminReady} from '../server/central-admin-storage.js';
import {serviceProvidersReady} from '../server/service-provider-storage.js';
import {rentalOwnersReady} from '../server/rental-owner-storage.js';
import {moderationReady} from '../server/moderation-storage.js';
import {recruitmentReady} from '../server/recruitment-storage.js';
import {jobSeekersReady} from '../server/job-seekers.js';
import {authorizationReady} from '../server/authorization.js';
import {mediaCleanupReady} from '../server/media-cleanup.js';
import {requireCurrentRecovery,assertPersistentConfiguration} from '../server/persistence.js';
import {assertRuntimeEnvironment,assertDatabaseTarget,assertDatabaseIdentity} from '../server/environment.js';
import { serviceIntegrity } from '../server/services.js';
import 'dotenv/config';
import { providerIntegrity } from '../server/provider-integrity.js';
import { createClient } from '@libsql/client';
import { Database } from '../server/database.js';
import { rollbackRelational } from '../server/relational-migration.js';
import { tables, indexSQL, quote } from '../server/relational-schema.js';
assertRuntimeEnvironment();
if(process.env.DATABASE_URL)assertDatabaseTarget(process.env.DATABASE_URL);
const command = process.argv[2] ?? 'status';
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Run from the project directory with the existing .env.');
assertPersistentConfiguration();
try {
    if (command === 'migrate') {
        const backupIndex=process.argv.indexOf('--backup');const backup=backupIndex>=0?process.argv[backupIndex+1]:undefined;
        if(process.env.REQUIRE_MIGRATION_BACKUP==='true'&&!process.argv.includes('--offline'))throw Error('Managed migration requires --offline after stopping web and workers.');
        const database = new Database({ demo: false, migrationBackup:backup });
        try {
            const versions = await database.sqlTransaction(async (tx) => (await tx.execute('SELECT version FROM schema_migrations ORDER BY version')).rows, 'read');
            console.log(JSON.stringify({ migrated: true, versions: versions.map(row => Number(row.version)) }));
        }
        finally {
            await database.close();
        }
    }
    else {
        const client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
        try {
            await assertDatabaseIdentity(client);
            await client.execute('PRAGMA foreign_keys=ON');
            if (command === 'rollback') {
                if (!process.argv.includes('--offline'))
                    throw new Error('Stop the web service and all workers, take a full backup, then pass --offline.');
                if(process.env.REQUIRE_MIGRATION_BACKUP==='true'){const i=process.argv.indexOf('--backup');await requireCurrentRecovery(client,i>=0?process.argv[i+1]:undefined);}
                await rollbackRelational(client);
                console.log('Schema restored to v2 using current records. Start the previous application release; v3 code would migrate forward again.');
            }
            else if (command === 'status' || command === 'check') {
                const tx = await client.transaction('read');
                try {
                    const existing = (await tx.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(row => String(row.name));
                    const versions = existing.includes('schema_migrations') ? (await tx.execute('SELECT version,applied_at FROM schema_migrations ORDER BY version')).rows : [];
                    const counts: Record<string, number> = {};
                    for (const table of tables)
                        if (existing.includes(table.table))
                            counts[table.table] = Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${quote(table.table)}`)).rows[0].n);
                    const violations = (await tx.execute('PRAGMA foreign_key_check')).rows;
                    const integrity = command === 'check' ? (await tx.execute('PRAGMA integrity_check')).rows : undefined;
                    const indexes = (await tx.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")).rows.map(row => String(row.name));
                    const missingTables = tables.map(table => table.table).filter(name => !existing.includes(name));
                    const missingIndexes = indexSQL.map(sql => sql.match(/INDEX\s+(\w+)/)![1]).filter(name => !indexes.includes(name));
                    const services = await serviceIntegrity(tx);
                    const providers = await providerIntegrity(tx);
                    Object.assign(counts,providers.counts,services.counts);
                    const mediaCleanup=await mediaCleanupReady(tx);
                    const authorization=await authorizationReady(tx);
                    const jobSeekers=await jobSeekersReady(tx);
                    const recruitment=await recruitmentReady(tx);
                    const moderation=await moderationReady(tx);
                    const rentalOwners=await rentalOwnersReady(tx);
                    const serviceProviders=await serviceProvidersReady(tx);
                    const centralAdmin=await centralAdminReady(tx);
                    const schemaReady = centralAdmin && serviceProviders && rentalOwners && moderation && recruitment && jobSeekers && authorization && mediaCleanup && services.ready && providers.ready && versions.some(row => Number(row.version) === 3) && !versions.some(row => Number(row.version) > 3) && missingTables.length === 0 && missingIndexes.length === 0;
                    console.log(JSON.stringify({ versions, schemaReady, centralAdmin, serviceProviders, rentalOwners, moderation, recruitment, jobSeekers, authorization, mediaCleanup, missingTables, missingIndexes, providers, services, counts, indexes: indexes.length, foreignKeyViolations: violations.length, ...(integrity ? { integrity } : {}) }, null, 2));
                    if (violations.length || integrity?.some(row => row.integrity_check !== 'ok') || (command === 'check' && !schemaReady))
                        process.exitCode = 1;
                    await tx.commit();
                }
                catch (error) {
                    await tx.rollback();
                    throw error;
                }
                finally {
                    tx.close();
                }
            }
            else
                throw new Error('Use migrate, status, check, or rollback --offline.');
        }
        finally {
            client.close();
        }
    }
}
catch (error) {
    console.error(error instanceof Error ? error.message : 'Database operation failed');
    process.exitCode = 1;
}
