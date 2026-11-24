// Fixed-path fixtures are restricted to a fresh, disposable GitHub Actions runner.
// NEVER execute this script on a VPS, even with a test environment file.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rename,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import {randomBytes,randomUUID} from 'node:crypto';
import {createClient} from '@libsql/client';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true')throw Error('Disposable GitHub Actions runner required; never run on a VPS.');
const root='/opt/hostel2';
if((await readdir(root)).length)throw Error('Refusing a nonempty production root; no existing resources may be used.');
const temp=await mkdtemp(tmpdir()+'/yh-persistent-http-');
const password=randomBytes(32).toString('hex'),key=randomBytes(32).toString('base64');
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const source={...process.env,APP_ENV:'production',NODE_ENV:'production',DEMO_MODE:'false',DATABASE_URL:'file:'+temp+'/source.db',DATABASE_AUTH_TOKEN:'',MEDIA_STORAGE:'local',MEDIA_DIRECTORY:temp+'/media',BACKUP_DIRECTORY:temp+'/backups',BACKUP_ENCRYPTION_KEY:key,HOST:'127.0.0.1',PORT:String(port),APP_URL:'http://127.0.0.1:'+port,HTTP_TEST_MODE:'true',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:password,NOTIFICATION_DELIVERY:'disabled',RESEND_API_KEY:'',NOTIFICATION_FROM:'',TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',GEMINI_API_KEY:'',BLOB_READ_WRITE_TOKEN:'',PERSISTENT_STORAGE_MODE:'',REQUIRE_MIGRATION_BACKUP:''};
const run=(args,env=source)=>spawnSync(process.execPath,['--import','tsx',...args],{env,encoding:'utf8'});
const ok=(result)=>assert.equal(result.status,0,result.stderr||result.stdout);
const backup=(env)=>{const result=run(['scripts/backup.ts'],env);ok(result);return JSON.parse(result.stdout.trim().split('\n').find(l=>l.startsWith('{')&&l.includes('"file"'))).file;};
let server,output='';
async function start(env){output='';server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);for(let i=0;!output.includes('server ready');i++){if(i===150||server.exitCode!==null)throw Error(output||'Startup timeout');await new Promise(r=>setTimeout(r,100));}}
async function stop(){if(server?.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}}
try{
 await mkdir(source.MEDIA_DIRECTORY,{mode:0o700});ok(run(['scripts/database.ts','migrate']));
 const id=randomUUID(),image=Buffer.from('immutable-CI-image'),raw=createClient({url:source.DATABASE_URL});
 await writeFile(source.MEDIA_DIRECTORY+'/'+id+'.webp',image);await mkdir(source.MEDIA_DIRECTORY+'/historical');await writeFile(source.MEDIA_DIRECTORY+'/historical/extra.webp','preserved-history');
 await raw.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,'/api/app?media='+id,id+'.webp','local',image.length,(await raw.execute("SELECT id FROM users WHERE role='admin'")).rows[0].id,'2026-01-01']});
 const credential=JSON.stringify((await raw.execute('SELECT * FROM user_credentials')).rows);raw.close();
 const prior=backup(source);ok(run(['scripts/backup.ts','verify',prior]));
 const copied=spawnSync('python3',['ops/persistence/copy-storage.py','--source-db',temp+'/source.db','--source-media',source.MEDIA_DIRECTORY,'--application-dir',process.cwd(),'--destination',root+'/candidate','--offline'],{encoding:'utf8'});ok(copied);
 await rename(root+'/candidate/data',root+'/data');await rename(root+'/candidate/media',root+'/media');await mkdir(root+'/backups',{mode:0o700});
 const env={...source,DATABASE_URL:'file:'+root+'/data/hostel.db',MEDIA_DIRECTORY:root+'/media',BACKUP_DIRECTORY:root+'/backups',PERSISTENT_STORAGE_MODE:'managed',REQUIRE_MIGRATION_BACKUP:'true'};
 const broken=run(['scripts/backup.ts'],{...source,DATABASE_URL:'file:'+temp+'/absent.db'});assert.notEqual(broken.status,0);await assert.rejects(access(temp+'/absent.db'));
 const altered=createClient({url:env.DATABASE_URL});await altered.execute('DROP INDEX service_listings_city');altered.close();
 const before=backup(env);assert.notEqual(run(['scripts/database.ts','migrate','--backup',before],env).status,0);
 const blocked=run(['scripts/database.ts','migrate','--offline'],env);assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/blocked/);
 // Real startup must also refuse pending migrations, before it writes new data.
 const guarded=run(['--input-type=module','-e',"const {Database}=await import('./server/database.ts');const d=new Database();try{await d.waitUntilReady()}finally{await d.close()}"],env);assert.notEqual(guarded.status,0);assert.match(guarded.stderr,/blocked/);
 ok(run(['scripts/database.ts','migrate','--offline','--backup',before],env));ok(run(['scripts/database.ts','check'],env));
 const ready=createClient({url:env.DATABASE_URL});assert.equal(JSON.stringify((await ready.execute('SELECT * FROM user_credentials')).rows),credential);ready.close();
 await start(env);const login=await fetch('http://127.0.0.1:'+port+'/api/app',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'YerevanHub',Origin:env.APP_URL},body:JSON.stringify({action:'login',args:[env.ADMIN_EMAIL,password]})});assert((await login.json()).success);const cookie=login.headers.get('set-cookie').split(';')[0];
 const state=await (await fetch('http://127.0.0.1:'+port+'/api/app',{headers:{Cookie:cookie}})).json();assert.equal(state.state.currentUser.email,env.ADMIN_EMAIL);
 await stop();ok(spawnSync('npm',['ci','--ignore-scripts'],{encoding:'utf8',env:process.env}));ok(spawnSync('npm',['run','build'],{encoding:'utf8',env:process.env}));await start(env);
 const persisted=await (await fetch('http://127.0.0.1:'+port+'/api/app',{headers:{Cookie:cookie}})).json();assert.equal(persisted.state.currentUser.email,env.ADMIN_EMAIL);assert.deepEqual(await readFile(root+'/media/'+id+'.webp'),image);assert.equal(await readFile(root+'/media/historical/extra.webp','utf8'),'preserved-history');
 await stop();const final=backup(env);ok(run(['scripts/backup.ts','verify',final],env));await mkdir(root+'/recovery');ok(run(['scripts/backup.ts','restore',final],{...env,RESTORE_DATABASE_URL:'file:'+root+'/recovery/check.db',RESTORE_MEDIA_DIRECTORY:root+'/recovery/media'}));assert.deepEqual(await readFile(root+'/recovery/media/'+id+'.webp'),image);assert.equal(await readFile(root+'/recovery/media/historical/extra.webp','utf8'),'preserved-history');
 console.log('PASS managed paths: WAL-safe relocation, credentials and media preserved, missing-source backup refused, migration/startup blocked without current backup, offline migration, login/session/media after npm install + rebuild + restart, encrypted backup + isolated recovery and database health.');
}finally{await stop();await rm(temp,{recursive:true,force:true});}
