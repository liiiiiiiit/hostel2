import path from 'node:path';
import {existsSync,realpathSync,statSync} from 'node:fs';
import type {Client} from '@libsql/client';
export type ApplicationEnvironment='development'|'testing'|'staging'|'production';
export const stagingPaths={root:'/opt/hostel2-staging',database:'/opt/hostel2-staging/data/staging.db',media:'/opt/hostel2-staging/data/uploads',backups:'/opt/hostel2-staging/backups'} as const;
export function applicationEnvironment(env:NodeJS.ProcessEnv=process.env):ApplicationEnvironment{
 const value=env.APP_ENV??(env.NODE_ENV==='test'?'testing':env.NODE_ENV==='production'||env.VERCEL?'production':'development');
 if(!['development','testing','staging','production'].includes(value))throw Error('APP_ENV must be development, testing, staging or production.');
 return value as ApplicationEnvironment;
}
// Resolve existing ancestors too: a nonexistent child beneath a symlink must not evade the boundary.
export function canonicalPath(input:string):string{const absolute=path.resolve(input);let parent=absolute;const parts:string[]=[];while(!existsSync(parent)){const next=path.dirname(parent);if(next===parent)break;parts.unshift(path.basename(parent));parent=next;}return path.join(realpathSync(parent),...parts);}
function assertPath(input:string,expected:string){if(path.resolve(input)!==expected||canonicalPath(input)!==expected)throw Error('Staging resource must use its dedicated canonical path.');}
export function assertDatabaseTarget(url:string,env:NodeJS.ProcessEnv=process.env,restore=false){
 const environment=applicationEnvironment(env);if(!['staging','testing'].includes(environment))return;
 if(!url.startsWith('file:/')||/[?#\0]/.test(url)||url.startsWith('file://'))throw Error('Isolated environments require a local absolute SQLite file URL.');
 const file=url.slice(5),resolved=canonicalPath(file);
 if(environment==='staging'){
  if(restore){if(!resolved.startsWith(stagingPaths.root+'/data/')||resolved===stagingPaths.database||resolved!==path.resolve(file))throw Error('Restore requires a separate staging data target.');}
  else assertPath(file,stagingPaths.database);
 }else if(['/opt/hostel2/','/var/lib/hostel2/','/opt/hostel2-staging/'].some(p=>(resolved+'/').startsWith(p)))throw Error('Automated tests cannot use deployed databases.');
 if(existsSync(file)&&statSync(file).nlink>1)throw Error('Isolated database files must not be hard linked.');
}
export function externalDeliveryAllowed(env:NodeJS.ProcessEnv=process.env){return !['staging','testing'].includes(applicationEnvironment(env))&&env.NOTIFICATION_DELIVERY!=='disabled';}
export function assertRuntimeEnvironment(env:NodeJS.ProcessEnv=process.env){
 const environment=applicationEnvironment(env);if(environment!=='staging')return environment;
 if(env.NODE_ENV!=='production'||env.DEMO_MODE!=='false'||env.HTTP_TEST_MODE==='true'||env.VERCEL)throw Error('Staging requires a production build, DEMO_MODE=false and HTTPS on the VPS.');
 if(env.APP_URL!=='https://test.yerevanhub.ir'||env.HOST!=='127.0.0.1'||env.PORT!=='3002')throw Error('Staging requires its own HTTPS origin and loopback port 3002.');
 assertDatabaseTarget(env.DATABASE_URL??'',env);
 if(env.MEDIA_STORAGE!=='local')throw Error('Staging requires dedicated local media storage.');
 assertPath(env.MEDIA_DIRECTORY??'',stagingPaths.media);assertPath(env.BACKUP_DIRECTORY??'',stagingPaths.backups);
 if(env.NOTIFICATION_DELIVERY!=='disabled')throw Error('Staging notification delivery must be explicitly disabled.');
 for(const key of ['DATABASE_AUTH_TOKEN','RESEND_API_KEY','NOTIFICATION_FROM','TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','SMS_API_KEY','TWILIO_AUTH_TOKEN','STRIPE_SECRET_KEY','PAYPAL_CLIENT_SECRET','GEMINI_API_KEY','BLOB_READ_WRITE_TOKEN','RESTORE_BLOB_READ_WRITE_TOKEN','RESTORE_DATABASE_AUTH_TOKEN'])if(env[key])throw Error('Remove external credentials from staging: '+key);
 if(env.RESTORE_DATABASE_URL)assertDatabaseTarget(env.RESTORE_DATABASE_URL,env,true);
 if(env.RESTORE_MEDIA_DIRECTORY){const target=canonicalPath(env.RESTORE_MEDIA_DIRECTORY);if(target!==path.resolve(env.RESTORE_MEDIA_DIRECTORY)||!target.startsWith(stagingPaths.root+'/data/')||target===stagingPaths.media)throw Error('Restore requires a separate staging media target.');}
 if(env.RESTORE_MEDIA_STORAGE==='blob')throw Error('Staging cannot restore remote media.');
 if(env.ADMIN_EMAIL&&!/^[^@\s]+@test\.yerevanhub\.ir$/.test(env.ADMIN_EMAIL))throw Error('Use a separate staging administrator identity at test.yerevanhub.ir.');
 if(env.ADMIN_PASSWORD&&(/CHANGE_ME|REPLACE_ME/i.test(env.ADMIN_PASSWORD)||env.ADMIN_PASSWORD.length<12||env.ADMIN_PASSWORD.length>128))throw Error('Set a unique generated staging administrator password.');
 if(!env.BACKUP_ENCRYPTION_KEY||Buffer.from(env.BACKUP_ENCRYPTION_KEY,'base64').length!==32)throw Error('Set a dedicated 32-byte base64 staging backup key.');
 return environment;
}
export async function assertDatabaseIdentity(client:Client,env:NodeJS.ProcessEnv=process.env){
 if(applicationEnvironment(env)!=='staging')return;
 const exists=(await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='runtime_environment'")).rows.length;
 if(!exists||(await client.execute('SELECT environment FROM runtime_environment WHERE id=1')).rows[0]?.environment!=='staging')throw Error('Staging tools require an existing marked staging database.');
}
export async function ensureDatabaseEnvironment(client:Client,env:NodeJS.ProcessEnv=process.env){
 const environment=applicationEnvironment(env);const tx=await client.transaction('write');
 try{
  const names=(await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.map(r=>String(r.name));
  if(names.includes('runtime_environment')){const row=(await tx.execute('SELECT environment FROM runtime_environment WHERE id=1')).rows[0];if(row?.environment!==environment)throw Error('Database belongs to another application environment.');}
  else if(['staging','testing'].includes(environment)){
   if(names.length)throw Error('Refusing an unmarked isolated database. Initialize a fresh database; do not copy production.');
   await tx.execute('CREATE TABLE runtime_environment(id INTEGER PRIMARY KEY CHECK(id=1),environment TEXT NOT NULL)');await tx.execute({sql:'INSERT INTO runtime_environment VALUES(1,?)',args:[environment]});
  }
  await tx.commit();
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export function environmentHtml(html:string,env:NodeJS.ProcessEnv=process.env){
 if(applicationEnvironment(env)!=='staging')return html;
 return html.replace(/<meta[^>]+name=["']robots["'][^>]*>/gi,'').replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"><meta name="yh-environment" content="staging"></head>').replace(/(<body[^>]*>)/i,'$1<aside class="environment-indicator" role="status" dir="ltr">STAGING · TEST ENVIRONMENT</aside>');
}
