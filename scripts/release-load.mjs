// Synthetic workload in a newly-created temporary database only. Never accepts a deployment URL.
import {mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir,cpus} from 'node:os';
import {once} from 'node:events';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../server/database.ts';
import {createApi} from '../server/api.ts';
import {completeHostel} from '../server/property-fixtures.ts';
const worker=process.argv[2]==='--isolated-worker';
if(worker&&!/^\/tmp\/yh-release-load-[^/]+\/load.db$/.test(process.argv[3]??''))throw Error('Isolated temporary target required');
const root=worker?process.argv[3].replace(/\/load.db$/,''):await mkdtemp(tmpdir()+'/yh-release-load-');
Object.assign(process.env,{APP_ENV:'testing',NODE_ENV:'test',DATABASE_URL:'file:'+root+'/load.db',MEDIA_DIRECTORY:root+'/uploads',MEDIA_STORAGE:'local',NOTIFICATION_DELIVERY:'disabled',DEMO_TOOLS_ENABLED:'false',PERSISTENT_STORAGE_MODE:'',REQUIRE_MIGRATION_BACKUP:'',ADMIN_EMAIL:'',ADMIN_PASSWORD:'',RESEND_API_KEY:'',TELEGRAM_BOT_TOKEN:'',GEMINI_API_KEY:'',BLOB_READ_WRITE_TOKEN:''});
const password=randomUUID(),db=new Database({demo:false,...(!worker?{adminEmail:'load@example.test',adminPassword:password}:{})});await db.waitUntilReady();
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)];
async function measure(fn,n=12){const values=[];let bytes=0;await fn();for(let i=0;i<n;i++){const start=performance.now(),v=await fn();values.push(performance.now()-start);bytes=Buffer.byteLength(JSON.stringify(v));}return {samples:n,p50Ms:+percentile(values,.5).toFixed(2),p95Ms:+percentile(values,.95).toFixed(2),bytes};}
if(worker){const values=[];let errors=0;for(let i=0;i<40;i++){const start=performance.now();try{await db.sqlTransaction(tx=>tx.execute('UPDATE release_load_counter SET value=value+1 WHERE id=1'));values.push(performance.now()-start);}catch{errors++;}}await db.close();console.log(JSON.stringify({values,errors}));}
else{let server;try{
 await db.transaction(state=>{state.hostels=Array.from({length:100},()=>{const h=completeHostel();h.isPublished=true;h.listingStatus='published';return h;});});
 await db.sqlTransaction(async tx=>{for(let i=0;i<5000;i++)await tx.execute({sql:"INSERT INTO users(id,email,name,role,is_active,created_at) VALUES(?,?,?,'traveler',1,?)",args:[randomUUID(),'synthetic-'+i+'@example.test','SYNTHETIC '+i,new Date(1700000000000+i*1000).toISOString()]});await tx.execute('CREATE TABLE release_load_counter(id INTEGER PRIMARY KEY,value INTEGER NOT NULL)');await tx.execute('INSERT INTO release_load_counter VALUES(1,0)');});
 const delay=monitorEventLoopDelay({resolution:10});delay.enable();const cpu=process.cpuUsage(),started=performance.now();server=createApi(db).listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 const login=await fetch(origin+'/api/app',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'YerevanHub','X-Admin-Workspace':'shell'},body:JSON.stringify({action:'login',args:['load@example.test',password]})});assert.equal((await login.json()).success,true);const cookie=login.headers.get('set-cookie').split(';')[0];
 const http=async route=>{const r=await fetch(origin+route,{headers:{cookie,'X-Admin-Workspace':'shell'}});assert.equal(r.status,200);return r.json();};
 const result={environment:{node:process.version,cpus:cpus().length,dataset:{users:5001,hostels:100,roomTypes:200}},seo:await measure(()=>db.publicSeoState?db.publicSeoState():db.publicState(),5),adminShell:await measure(()=>http('/api/app')),records:await measure(()=>http('/api/admin/central/records?module=users&page=100&pageSize=20')),search:await measure(()=>http('/api/admin/central/records?module=users&search=SYNTHETIC%2049&pageSize=20'))};
 result.queryPlan=(await db.client.execute('EXPLAIN QUERY PLAN SELECT id,name,created_at FROM users ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET 1980')).rows.map(r=>String(r.detail));
 const writeStart=performance.now();const outcomes=await Promise.all(Array.from({length:4},()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','scripts/release-load.mjs','--isolated-worker',root+'/load.db'],{env:process.env,stdio:['ignore','pipe','pipe']});let output='',error='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>error+=b);child.on('error',reject);child.on('exit',code=>code===0?resolve(JSON.parse(output)):resolve({values:[],errors:40,startupError:(error.match(/LibsqlError: [^\n]+/)||error.match(/Error: [^\n]+/)||['worker exit '+code])[0]}));})));
 const values=outcomes.flatMap(o=>o.values);result.writeContention={processes:4,attempted:160,committed:Number((await db.client.execute('SELECT value FROM release_load_counter')).rows[0].value),errors:outcomes.reduce((n,o)=>n+o.errors,0),startupErrors:outcomes.flatMap(o=>o.startupError?[o.startupError]:[]),p95Ms:+percentile(values,.95).toFixed(2),elapsedMs:+(performance.now()-writeStart).toFixed(2)};
 result.integrity=(await db.client.execute('PRAGMA integrity_check')).rows[0].integrity_check;result.foreignKeyViolations=(await db.client.execute('PRAGMA foreign_key_check')).rows.length;result.resources={processCpuMs:Object.values(process.cpuUsage(cpu)).reduce((a,b)=>a+b,0)/1000,elapsedMs:performance.now()-started,rssBytes:process.memoryUsage().rss,eventLoopP95Ms:delay.percentile(95)/1e6};delay.disable();console.log(JSON.stringify(result,null,2));assert.equal(result.writeContention.committed,160);assert.equal(result.writeContention.errors,0);
 }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await db.close();await rm(root,{recursive:true,force:true});}}
