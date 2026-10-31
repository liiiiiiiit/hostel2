import 'dotenv/config';
import { createClient } from '@libsql/client';
import { Database } from '../server/database.js';
import { rollbackRelational } from '../server/relational-migration.js';
import { tables, indexSQL, quote } from '../server/relational-schema.js';
const command = process.argv[2] ?? 'status';
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required. Run from the project directory with the existing .env.');
try {
    if (command === 'migrate') {
        const database = new Database({ demo: false });
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
            await client.execute('PRAGMA foreign_keys=ON');
            if (command === 'rollback') {
                if (!process.argv.includes('--offline'))
                    throw new Error('Stop the web service and all workers, take a full backup, then pass --offline.');
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
                    const schemaReady = versions.some(row => Number(row.version) === 3) && !versions.some(row => Number(row.version) > 3) && missingTables.length === 0 && missingIndexes.length === 0;
                    console.log(JSON.stringify({ versions, schemaReady, missingTables, missingIndexes, counts, indexes: indexes.length, foreignKeyViolations: violations.length, ...(integrity ? { integrity } : {}) }, null, 2));
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
