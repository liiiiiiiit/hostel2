import type {Client,Transaction} from '@libsql/client';
import {releaseReady} from './release-storage.js';
export async function releasePreflight(db:Client|Transaction,env:NodeJS.ProcessEnv){
 const checks:Array<{name:string;status:'pass'|'fail'|'manual'}>=[];
 const add=(name:string,pass:boolean)=>checks.push({name,status:pass?'pass':'fail'});
 add('explicit_production_environment',env.APP_ENV==='production'&&env.NODE_ENV==='production');
 add('https_canonical_origin',env.APP_URL==='https://yerevanhub.ir');
 add('secure_sessions',env.HTTP_TEST_MODE!=='true');add('demo_disabled',env.DEMO_MODE==='false'&&env.DEMO_TOOLS_ENABLED!=='true');
 add('migration_backup_guard',env.REQUIRE_MIGRATION_BACKUP==='true');add('backup_key_configured',!!env.BACKUP_DIRECTORY&&Buffer.from(env.BACKUP_ENCRYPTION_KEY??'','base64').length===32);
 add('loopback_reverse_proxy',env.HOST==='127.0.0.1'&&env.TRUST_PROXY==='loopback');
 const names=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name)));
 add('environment_identity',!names.has('runtime_environment')||(await db.execute('SELECT environment FROM runtime_environment WHERE id=1')).rows[0]?.environment==='production');
 add('no_imported_demo_batches',!names.has('demo_batches')||Number((await db.execute("SELECT COUNT(*) AS n FROM demo_batches WHERE status='imported'")).rows[0].n)===0);
 add('no_published_sample_properties',Number((await db.execute("SELECT COUNT(*) AS n FROM properties WHERE sample_content=1 AND (is_published=1 OR listing_status='published')")).rows[0].n)===0);
 add('release_schema',await releaseReady(db));add('database_quick_check',(await db.execute('PRAGMA quick_check')).rows[0].quick_check==='ok');add('foreign_key_integrity',(await db.execute('PRAGMA foreign_key_check')).rows.length===0);
 // A local boolean cannot prove that an external identity gateway enforces MFA.
 for(const name of ['administrator_mfa_or_reviewed_compensating_control','verified_backup_and_separate_target_restore','owner_release_approval','vps_tls_firewall_worker_and_monitoring'])checks.push({name,status:'manual'});
 return {automatedChecksPassed:checks.every(c=>c.status!=='fail'),productionApproved:false,checks};
}
