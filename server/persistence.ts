import {serviceProvidersReady} from './service-provider-storage.js';
import {rentalOwnersReady} from './rental-owner-storage.js';
import {moderationReady} from './moderation-storage.js';
import {recruitmentReady} from './recruitment-storage.js';
import {jobSeekersReady} from './job-seekers.js';
import {authorizationReady} from './authorization.js';
import {mediaCleanupReady} from './media-cleanup.js';
import type {Client} from '@libsql/client';
import {providerIntegrity} from './provider-integrity.js';
import {serviceIntegrity} from './services.js';
import {verifyBackup,snapshotFingerprint} from './backup-files.js';
import {exportSnapshot} from './backups.js';
export {assertPersistentConfiguration,assertRestoreSeparation} from './storage-paths.js';
export async function pendingMigrations(client:Client){
 const names=new Set((await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name)));
 const version=names.has('schema_migrations')?Number((await client.execute('SELECT COALESCE(MAX(version),0) AS n FROM schema_migrations')).rows[0].n):0;
 if(version>3)throw Error('Database requires a newer application version.');
 if(version<3)return true;
 const tx=await client.transaction('read');try{const pending=!(await providerIntegrity(tx)).ready||!(await serviceIntegrity(tx)).ready||!await mediaCleanupReady(tx)||!await authorizationReady(tx)||!await jobSeekersReady(tx)||!await recruitmentReady(tx)||!await moderationReady(tx)||!await rentalOwnersReady(tx)||!await serviceProvidersReady(tx);await tx.commit();return pending;}catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function requireCurrentRecovery(client:Client,backupFile?:string,env:NodeJS.ProcessEnv=process.env){
 if(!backupFile)throw Error('Pending migration blocked. Stop web/workers; run db:migrate --offline --backup VERIFIED_FILE with a current verified backup.');
 if(!env.BACKUP_ENCRYPTION_KEY)throw Error('A backup key is required before migration.');
 const backup=await verifyBackup(backupFile,env.BACKUP_ENCRYPTION_KEY);const current=await exportSnapshot(client);
 if(snapshotFingerprint(current)!==backup.fingerprint)throw Error('Pre-migration backup is stale or belongs to another database/media state. Nothing migrated.');
}
export async function guardMigrations(client:Client,backupFile?:string,env:NodeJS.ProcessEnv=process.env){
 if(env.REQUIRE_MIGRATION_BACKUP!=='true'||!await pendingMigrations(client))return;
 await requireCurrentRecovery(client,backupFile,env);
}
