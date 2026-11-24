// Runs only on disposable CI machines: never run this fixture on a VPS.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir,access,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import https from 'node:https';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true')throw Error('This destructive fixture is restricted to a disposable GitHub Actions runner. Never run on a VPS.');
const root='/opt/hostel2-staging';
try{await access(root+'/data/staging.db');throw Error('Refusing an existing staging database.');}catch(e){if(e.code!=='ENOENT')throw e;}
if((await readdir(root)).length)throw Error('Disposable staging root must be completely empty; refusing existing deployment files.');
const dir=await mkdtemp(path.join(tmpdir(),'yh-staging-http-'));const password=randomUUID()+randomUUID(),proxyPassword=randomBytes(24).toString('hex'),key=randomBytes(32).toString('base64');
const env={...process.env,APP_ENV:'staging',NODE_ENV:'production',DEMO_MODE:'false',HOST:'127.0.0.1',PORT:'3002',APP_URL:'https://test.yerevanhub.ir',DATABASE_URL:`file:${root}/data/staging.db`,MEDIA_STORAGE:'local',MEDIA_DIRECTORY:root+'/data/uploads',BACKUP_DIRECTORY:root+'/backups',BACKUP_ENCRYPTION_KEY:key,ADMIN_EMAIL:'admin@test.yerevanhub.ir',ADMIN_PASSWORD:password,NOTIFICATION_DELIVERY:'disabled',DATABASE_AUTH_TOKEN:'',RESEND_API_KEY:'',NOTIFICATION_FROM:'',TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',GEMINI_API_KEY:'',BLOB_READ_WRITE_TOKEN:''};
let server,nginx,output='';
async function start(){output='';server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);for(let i=0;!output.includes('server ready');i++){if(i===150||server.exitCode!==null)throw Error(output||'Startup timeout');await new Promise(r=>setTimeout(r,100));}}
async function stop(){if(server?.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}}
function request(route='/',{authenticated=true,cookie='',data}={}){return new Promise((resolve,reject)=>{const req=https.request({hostname:'127.0.0.1',port:8443,servername:'test.yerevanhub.ir',rejectUnauthorized:false,path:route,method:data?'POST':'GET',headers:{Host:'test.yerevanhub.ir',...(authenticated?{Authorization:'Basic '+Buffer.from('staging:'+proxyPassword).toString('base64')}:{}),Cookie:cookie,...(data?{'Content-Type':'application/json','X-Requested-With':'YerevanHub',Origin:'https://test.yerevanhub.ir'}:{})}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);if(data)req.write(JSON.stringify(data));req.end();});}
try{
 await mkdir(root+'/backups',{recursive:true});await mkdir(root+'/data/uploads',{recursive:true});
 assert.equal(spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',dir+'/key.pem','-out',dir+'/cert.pem','-days','1','-subj','/CN=test.yerevanhub.ir'],{stdio:'ignore'}).status,0);
 const hashed=spawnSync('htpasswd',['-niB','staging'],{input:proxyPassword+'\n',encoding:'utf8'});assert.equal(hashed.status,0);await writeFile(dir+'/htpasswd',hashed.stdout);
 let template=await readFile('ops/staging/nginx-https.conf','utf8');template=template.replaceAll('listen 80;','listen 8080;').replaceAll('listen [::]:80;','listen [::]:8080;').replaceAll('listen 443 ssl;','listen 8443 ssl;').replaceAll('listen [::]:443 ssl;','listen [::]:8443 ssl;').replaceAll('/etc/letsencrypt/live/test.yerevanhub.ir/fullchain.pem',dir+'/cert.pem').replaceAll('/etc/letsencrypt/live/test.yerevanhub.ir/privkey.pem',dir+'/key.pem').replaceAll('/etc/nginx/hostel2-staging.htpasswd',dir+'/htpasswd').replaceAll('/var/log/nginx/hostel2-staging.',dir+'/nginx.');
 await writeFile(dir+'/nginx.conf',`pid ${dir}/nginx.pid;\nerror_log ${dir}/error.log;\nevents {}\nhttp { client_body_temp_path ${dir}/body; proxy_temp_path ${dir}/proxy; fastcgi_temp_path ${dir}/fastcgi; uwsgi_temp_path ${dir}/uwsgi; scgi_temp_path ${dir}/scgi; access_log off; ${template} }\n`);
 const check=spawnSync('nginx',['-p',dir,'-c',dir+'/nginx.conf','-t'],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
 await start();nginx=spawn('nginx',['-p',dir,'-c',dir+'/nginx.conf','-g','daemon off;'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,700));
 assert.equal((await request('/fa/services',{authenticated:false})).status,401);assert.equal((await request('/api/app',{authenticated:false})).status,401);
 const page=await request('/fa/services');assert.equal(page.status,200);assert(page.text.includes('STAGING · TEST ENVIRONMENT'));assert(page.text.includes('noindex,nofollow,noarchive'));assert.match(page.headers['x-robots-tag'],/noindex/);assert.match((await request('/robots.txt',{authenticated:false})).text,/Disallow: \//);assert.equal((await request('/sitemap.xml')).status,404);
 const login=await request('/api/app',{data:{action:'login',args:[env.ADMIN_EMAIL,password]}});assert(JSON.parse(login.text).success);const cookie=login.headers['set-cookie'][0].split(';')[0];assert(cookie.startsWith('__Host-yh_staging_session='));assert.match(login.headers['set-cookie'][0],/Secure/);assert.match(login.headers['set-cookie'][0],/HttpOnly/);assert(!/Domain=/i.test(login.headers['set-cookie'][0]));
 assert.equal(JSON.parse((await request('/api/app',{cookie:cookie.replace('__Host-yh_staging_session','__Host-yh_session')})).text).state.currentUser,null);
 const listing={id:randomUUID(),slug:'isolated-staging-record',icon:'other',order:10,isActive:true,name:{fa:'آزمایشی',en:'Isolated fixture',ru:'Тест',hy:'Թեստ'},version:0};assert(JSON.parse((await request('/api/app',{cookie,data:{action:'saveServiceCategory',args:[listing]}})).text).success);
 const worker=spawnSync(process.execPath,['--import','tsx','scripts/worker.ts','--once'],{env,encoding:'utf8'});assert.equal(worker.status,0,worker.stderr);assert(!worker.stdout.includes('"sent":1'));
 await stop();await start();const persisted=JSON.parse((await request('/api/app',{cookie})).text).state;assert.equal(persisted.currentUser.email,env.ADMIN_EMAIL);assert(persisted.serviceCategories.some(c=>c.id===listing.id));
 const backup=spawnSync(process.execPath,['--import','tsx','scripts/backup.ts'],{env,encoding:'utf8'});assert.equal(backup.status,0,backup.stderr);
 const health=spawnSync(process.execPath,['--import','tsx','scripts/database.ts','check'],{env,encoding:'utf8'});assert.equal(health.status,0,health.stderr);assert(JSON.parse(health.stdout).schemaReady);
 console.log('PASS real staging startup, HTTPS/Basic Auth Nginx, noindex/banner, admin login and cookie isolation, persisted edit/session after restart, safe worker, encrypted backup and schema integrity');
}finally{if(nginx?.exitCode===null){nginx.kill();await new Promise(r=>nginx.once('exit',r));}await stop();await rm(dir,{recursive:true,force:true});}
