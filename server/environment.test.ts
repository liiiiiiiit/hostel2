import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,symlink,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createClient} from '@libsql/client';
import {applicationEnvironment,assertRuntimeEnvironment,assertDatabaseTarget,canonicalPath,ensureDatabaseEnvironment,assertDatabaseIdentity,environmentHtml,externalDeliveryAllowed} from './environment.js';
import {sessionCookiePolicy} from './session-config.js';
import {deliverNotifications} from './notifications.js';
import {Database} from './database.js';
const staging=():NodeJS.ProcessEnv=>({APP_ENV:'staging',NODE_ENV:'production',DEMO_MODE:'false',HOST:'127.0.0.1',PORT:'3002',APP_URL:'https://test.yerevanhub.ir',DATABASE_URL:'file:/opt/hostel2-staging/data/staging.db',MEDIA_STORAGE:'local',MEDIA_DIRECTORY:'/opt/hostel2-staging/data/uploads',BACKUP_DIRECTORY:'/opt/hostel2-staging/backups',BACKUP_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),NOTIFICATION_DELIVERY:'disabled',ADMIN_EMAIL:'admin@test.yerevanhub.ir'});
test('environment identity is explicit and legacy production settings remain compatible',()=>{
 for(const APP_ENV of ['development','testing','staging','production'])assert.equal(applicationEnvironment({APP_ENV,NODE_ENV:'production'}),APP_ENV);
 assert.equal(applicationEnvironment({NODE_ENV:'production'}),'production');assert.equal(applicationEnvironment({NODE_ENV:'test'}),'testing');assert.throws(()=>applicationEnvironment({APP_ENV:'stage'}));assert.equal(assertRuntimeEnvironment(staging()),'staging');assert.throws(()=>assertRuntimeEnvironment({APP_ENV:'production',VERCEL:'1',VERCEL_GIT_COMMIT_REF:'codex/01-staging-environment'}),/VPS-only/);
 assert.deepEqual(sessionCookiePolicy({APP_ENV:'staging',NODE_ENV:'production'}),{name:'__Host-yh_staging_session',secure:true});assert.notEqual(sessionCookiePolicy({APP_ENV:'staging'}).name,sessionCookiePolicy({APP_ENV:'production',NODE_ENV:'production'}).name);assert.throws(()=>sessionCookiePolicy({APP_ENV:'staging',HTTP_TEST_MODE:'true'}));
});
test('staging rejects production/remote paths, shared credentials, unsafe cookies, origin/port mistakes and demo identities',()=>{
 const changes=[{DATABASE_URL:'file:/var/lib/hostel2/hostel.db'},{DATABASE_URL:'libsql://production.test'},{DATABASE_URL:'file:/opt/hostel2-staging/data/../staging.db'},{MEDIA_DIRECTORY:'/opt/hostel2/app/data/uploads'},{BACKUP_DIRECTORY:'/var/lib/hostel2'},{MEDIA_STORAGE:'blob'},{APP_URL:'https://yerevanhub.ir'},{PORT:'3001'},{HOST:'0.0.0.0'},{DEMO_MODE:'true'},{NODE_ENV:'development'},{NOTIFICATION_DELIVERY:'live'},{ADMIN_EMAIL:'admin@yerevanhub.ir'},{ADMIN_PASSWORD:'CHANGE_ME'},{BACKUP_ENCRYPTION_KEY:''},{HTTP_TEST_MODE:'true'},{VERCEL:'1'}];
 for(const change of changes)assert.throws(()=>assertRuntimeEnvironment({...staging(),...change}),JSON.stringify(change));
 for(const key of ['DATABASE_AUTH_TOKEN','RESEND_API_KEY','TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','SMS_API_KEY','TWILIO_AUTH_TOKEN','STRIPE_SECRET_KEY','GEMINI_API_KEY','BLOB_READ_WRITE_TOKEN'])assert.throws(()=>assertRuntimeEnvironment({...staging(),[key]:'copied-credential'}),key);
 for(const url of ['file:/var/lib/hostel2/hostel.db','file:/%76ar/lib/hostel2/hostel.db','file:/opt/hostel2/app/data/live.db','file:/opt/hostel2-staging/data/staging.db','libsql://live'])assert.throws(()=>assertDatabaseTarget(url,{APP_ENV:'testing'}));
});
test('path checks resolve symlink ancestors and isolated restore targets cannot alias the live staging database',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yh-paths-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(dir+'/real');await symlink(dir+'/real',dir+'/alias');assert.equal(canonicalPath(dir+'/alias/new/image.webp'),dir+'/real/new/image.webp');
 assert.throws(()=>assertDatabaseTarget('file:/opt/hostel2-staging/data/staging.db',staging(),true));assert.throws(()=>assertDatabaseTarget('file:/var/lib/hostel2/restore.db',staging(),true));assertDatabaseTarget('file:/opt/hostel2-staging/data/recovery/test.db',staging(),true);
});
test('database markers persist across reopen, reject cross-environment use and refuse unmarked imported databases',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yh-marker-'));t.after(()=>rm(dir,{recursive:true,force:true}));let c=createClient({url:`file:${dir}/isolated.db`});await ensureDatabaseEnvironment(c,{APP_ENV:'staging'});c.close();c=createClient({url:`file:${dir}/isolated.db`});await ensureDatabaseEnvironment(c,{APP_ENV:'staging'});await assert.rejects(ensureDatabaseEnvironment(c,{APP_ENV:'production'}),/another application environment/);c.close();
 const imported=createClient({url:`file:${dir}/imported.db`});await imported.execute('CREATE TABLE users(id TEXT)');await imported.execute("INSERT INTO users VALUES('historical-user')");await assert.rejects(ensureDatabaseEnvironment(imported,{APP_ENV:'staging'}),/unmarked/);await assert.rejects(assertDatabaseIdentity(imported,{APP_ENV:'staging'}),/marked staging/);assert.equal((await imported.execute('SELECT id FROM users')).rows[0].id,'historical-user');imported.close();
});
test('staging and automated testing cannot deliver notifications even with live keys or a worker invocation',async()=>{
 const old={APP_ENV:process.env.APP_ENV,RESEND_API_KEY:process.env.RESEND_API_KEY,TELEGRAM_BOT_TOKEN:process.env.TELEGRAM_BOT_TOKEN};
 try{for(const APP_ENV of ['staging','testing']){process.env.APP_ENV=APP_ENV;process.env.RESEND_API_KEY='accidental-key';process.env.TELEGRAM_BOT_TOKEN='accidental-token';let calls=0;const result=await deliverNotifications({sqlTransaction:()=>{throw Error('Outbox must remain untouched');}} as unknown as Database,async()=>{calls++;throw Error('No network');});assert.equal(result.attempted,0);assert.equal(calls,0);assert.equal(externalDeliveryAllowed(),false);}}
 finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test('staging runtime HTML is visibly marked and noindex; production HTML is byte-for-byte unchanged',()=>{
 const html='<html><head><meta name="robots" content="index,follow"></head><body><div id="root"></div></body></html>';const output=environmentHtml(html,staging());assert(output.includes('STAGING · TEST ENVIRONMENT'));assert(output.includes('noindex,nofollow,noarchive'));assert(!output.includes('content="index,follow"'));assert.equal(environmentHtml(html,{APP_ENV:'production'}),html);
});
test('isolated testing database data and administrator hashes survive restart without modifying a separate database',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yh-env-persist-'));t.after(()=>rm(dir,{recursive:true,force:true}));const live=createClient({url:`file:${dir}/untouched.db`});await live.execute('CREATE TABLE historical(id TEXT)');await live.execute("INSERT INTO historical VALUES('preserved')");const prior=process.env.APP_ENV;process.env.APP_ENV='testing';
 try{let d=new Database({url:`file:${dir}/test.db`,demo:false,adminEmail:'admin@test.example',adminPassword:'test-only-generated-long-password'});await d.waitUntilReady();const before=(await d.client.execute('SELECT * FROM user_credentials')).rows;assert.equal(before.length,1);await d.close();d=new Database({url:`file:${dir}/test.db`,demo:false});await d.waitUntilReady();assert.deepEqual((await d.client.execute('SELECT * FROM user_credentials')).rows,before);assert.equal((await d.client.execute('SELECT environment FROM runtime_environment')).rows[0].environment,'testing');assert.equal((await d.client.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');await d.close();assert.equal((await live.execute('SELECT id FROM historical')).rows[0].id,'preserved');}finally{if(prior===undefined)delete process.env.APP_ENV;else process.env.APP_ENV=prior;live.close();}
});
test('staging templates isolate service UID, filesystem, loopback port, proxy credentials and egress rules',async t=>{
 assert.equal(JSON.parse(await readFile('vercel.json','utf8')).git.deploymentEnabled['codex/01-staging-environment'],false);
 const dir=await mkdtemp(path.join(tmpdir(),'yh-egress-mock-'));t.after(()=>rm(dir,{recursive:true,force:true}));const unit=await readFile('ops/staging/hostel2-staging.service','utf8'),nginx=await readFile('ops/staging/nginx-https.conf','utf8');assert(unit.includes('User=hostel2-staging'));assert(unit.includes('InaccessiblePaths=-/opt/hostel2 -/var/lib/hostel2'));assert(unit.includes('Requires=hostel2-staging-egress.service'));assert(nginx.includes('proxy_pass http://127.0.0.1:3002'));assert(nginx.includes('auth_basic_user_file'));assert(nginx.includes('proxy_set_header Authorization ""'));assert(!nginx.includes('server_name yerevanhub.ir;'));
 for(const file of ['egress.sh'])assert.equal(spawnSync('bash',['-n','ops/staging/'+file]).status,0);
 await writeFile(dir+'/id','#!/bin/sh\nif [ "$2" = hostel2-staging ]; then echo 1701; else echo 1700; fi\n',{mode:0o755});
 for(const command of ['iptables','ip6tables'])await writeFile(dir+'/'+command,'#!/bin/sh\nprintf "%s\\n" "$*" >> "$MOCK_COMMAND_LOG"\ncase " $* " in *" -C "*) exit 1;; esac\nexit 0\n',{mode:0o755});
 const run=spawnSync('bash',['ops/staging/egress.sh','start'],{env:{...process.env,PATH:dir+':'+process.env.PATH,MOCK_COMMAND_LOG:dir+'/commands'}});assert.equal(run.status,0,run.stderr.toString());const commands=await readFile(dir+'/commands','utf8');assert(commands.includes('--uid-owner 1701'));assert(!commands.includes('--uid-owner 1700'));assert(commands.includes('--ctstate NEW -j REJECT'));assert(!commands.includes(' -F'));
});

test('explicit production identity enforces secure cookies and refuses implicit local/demo databases even without NODE_ENV production',()=>{
 assert.deepEqual(sessionCookiePolicy({APP_ENV:'production',NODE_ENV:'development'}),{secure:true,name:'__Host-yh_session'});
 const old={APP_ENV:process.env.APP_ENV,NODE_ENV:process.env.NODE_ENV,DATABASE_URL:process.env.DATABASE_URL};
 try{process.env.NODE_ENV='development';delete process.env.DATABASE_URL;for(const environment of ['production','testing']){process.env.APP_ENV=environment;assert.throws(()=>new Database({demo:true}),/DATABASE_URL is required/);}}finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
