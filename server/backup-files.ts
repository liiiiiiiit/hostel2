import {createClient,type Client} from '@libsql/client';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,open,readFile,rm,readdir,lstat,link,unlink} from 'node:fs/promises';
import path from 'node:path';
import {exportSnapshot,encryptSnapshot,decryptSnapshot,restoreSnapshot,encodeSQLValue,type Snapshot} from './backups.js';
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
function canonical(value:unknown):unknown{if(typeof value==='number'&&Number.isInteger(value))return {__yh_integer:String(value)};if(Array.isArray(value))return value.map(canonical);return encodeSQLValue(value);}
export function snapshotFingerprint(snapshot:Snapshot){return sha(JSON.stringify({tables:snapshot.tables.map(t=>({name:t.name,columns:t.columns,sql:t.sql,rows:t.rows.map(r=>JSON.stringify(r.map(canonical))).sort()})).sort((a,b)=>a.name.localeCompare(b.name)),indexes:[...(snapshot.indexes??[])].sort((a,b)=>a.name.localeCompare(b.name)),sequences:(snapshot.sequences??[]).map(s=>({name:s.name,value:canonical(s.value)})).sort((a,b)=>a.name.localeCompare(b.name)),assets:snapshot.assets.map(a=>({id:a.id,url:a.url,sha256:a.sha256})).sort((a,b)=>a.id.localeCompare(b.id)),extras:(snapshot.extraFiles??[]).map(a=>({path:a.path,sha256:a.sha256})).sort((a,b)=>a.path.localeCompare(b.path))}));}
export async function verifySnapshot(snapshot:Snapshot,temporaryParent:string){
 const directory=await mkdtemp(path.join(temporaryParent,'.verify-'));const client=createClient({url:'file:'+directory+'/check.db',intMode:'bigint'});
 try{
  await restoreSnapshot(client,snapshot,directory+'/media');
  const urls=new Map(snapshot.assets.map(a=>[a.url,`/api/app?media=${a.id}`]));
  const replace=(value:unknown)=>{if(typeof value!=='string')return value;let text=value;for(const [from,to] of urls)text=text.split(from).join(to);return text;};
  for(const table of snapshot.tables){const actual=await client.execute('SELECT * FROM "'+table.name+'"');const expected=table.rows.map(r=>r.map(replace));
   if(table.name==='media_assets')for(const row of expected){row[table.columns.indexOf('backend')]='local';row[table.columns.indexOf('storage_key')]=String(row[table.columns.indexOf('id')])+'.webp';}
   const normalize=(rows:unknown[][])=>JSON.stringify(rows.map(r=>JSON.stringify(r.map(canonical))).sort());
   if(JSON.stringify(actual.columns)!==JSON.stringify(table.columns)||normalize(actual.rows.map(r=>actual.columns.map(c=>r[c])))!==normalize(expected))throw Error('Recovery verification mismatch in '+table.name);
  }
  if(snapshot.sequences?.length){const sequences=(await client.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name')).rows.map(r=>({name:r.name,value:canonical(r.seq)}));const expected=snapshot.sequences.map(s=>({name:s.name,value:canonical(s.value)})).sort((a,b)=>a.name.localeCompare(b.name));if(JSON.stringify(sequences)!==JSON.stringify(expected))throw Error('Recovery sequence mismatch');}
  return {tables:snapshot.tables.length,rows:snapshot.tables.reduce((n,t)=>n+t.rows.length,0),assets:snapshot.assets.length,extraFiles:snapshot.extraFiles?.length??0,fingerprint:snapshotFingerprint(snapshot)};
 }finally{client.close();await rm(directory,{recursive:true,force:true});}
}
export async function verifyBackup(file:string,key:string,temporaryParent=path.dirname(file)){
 const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink())throw Error('Backup must be a regular file.');
 const bytes=await readFile(file),snapshot=decryptSnapshot(bytes,key);const result=await verifySnapshot(snapshot,temporaryParent);return {...result,sha256:sha(bytes),snapshot};
}
async function privateFile(file:string,bytes:Buffer|string){const handle=await open(file,'wx',0o600);try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}}
export async function createVerifiedBackup(client:Client,directory:string,key:string){
 await mkdir(directory,{recursive:true,mode:0o700});const dirInfo=await lstat(directory);if(!dirInfo.isDirectory()||dirInfo.isSymbolicLink()||(dirInfo.mode&0o077)!==0)throw Error('Backup directory must be private (0700) and not a symlink.');
 const snapshot=await exportSnapshot(client);const max=Number(process.env.BACKUP_MAX_BYTES??67108864);if(!Number.isSafeInteger(max)||max<1048576||Buffer.byteLength(JSON.stringify(snapshot))>max)throw Error('Backup exceeds BACKUP_MAX_BYTES or the configured limit is invalid. No backup published.');
 const file=path.join(directory,'yerevanhub-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.yhbak'),partial=file+'.partial';
 try{
  await privateFile(partial,encryptSnapshot(snapshot,key));const result=await verifyBackup(partial,key,directory);
  // Hard-link publication is atomic, exclusive, and never replaces an old backup.
  await link(partial,file);await unlink(partial);
  await privateFile(file+'.verified.json',JSON.stringify({version:1,verifiedAt:new Date().toISOString(),sha256:result.sha256,fingerprint:result.fingerprint,tables:result.tables,rows:result.rows,assets:result.assets,extraFiles:result.extraFiles})+'\n');
  const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}
  return {file,sha256:result.sha256,fingerprint:result.fingerprint,tables:result.tables,rows:result.rows,assets:result.assets,extraFiles:result.extraFiles};
 }catch(e){await rm(partial,{force:true});throw e;}
}
export async function retainVerifiedBackups(directory:string,key:string,{days,minimum,now=Date.now()}:{days:number;minimum:number;now?:number}){
 if(!Number.isInteger(days)||days<1||!Number.isInteger(minimum)||minimum<2)throw Error('Retention requires positive days and at least two verified recovery points.');
 const candidates=[];const skipped:string[]=[];
 for(const file of await readdir(directory)){if(!/^yerevanhub-.*\.yhbak$/.test(file))continue;const full=path.join(directory,file);try{const receipt=JSON.parse(await readFile(full+'.verified.json','utf8'));const result=await verifyBackup(full,key,directory);if(result.sha256!==receipt.sha256)throw Error('Receipt mismatch');candidates.push({file:full,time:(await lstat(full)).mtimeMs});}catch{skipped.push(file);}}
 candidates.sort((a,b)=>b.time-a.time);const removed:string[]=[];
 for(const entry of candidates.slice(minimum)){if(entry.time>=now-days*86400000)continue;await unlink(entry.file);await rm(entry.file+'.verified.json',{force:true});removed.push(path.basename(entry.file));}
 return {removed,skipped,retained:candidates.length-removed.length};
}
