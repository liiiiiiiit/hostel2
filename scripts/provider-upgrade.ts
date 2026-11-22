import 'dotenv/config';
import {createClient} from '@libsql/client';
import {createHash} from 'node:crypto';
import {migrateProviderTables} from '../server/provider-accounts.js';

if(!process.argv.includes('--offline'))throw new Error('Stop the web service and workers, back up SQLite, then pass --offline.');
const url=process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required. Existing data is required for this upgrade.');
const client=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN});
const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';
const checksum=(rows:unknown[])=>createHash('sha256').update(JSON.stringify(rows,(_key,value)=>typeof value==='bigint'?value.toString():value)).digest('hex');
const tx=await client.transaction('write');
try {
  const version=await tx.execute('SELECT MAX(version) AS version FROM schema_migrations');
  if(Number(version.rows[0]?.version)!==3)throw new Error('This upgrade expects the existing relational schema v3.');
  const tables=(await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.map(row=>String(row.name));
  for(const required of ['users','user_credentials','job_postings','job_applications','tour_listings','tour_bookings'])if(!tables.includes(required))throw new Error('Missing existing table '+required);
  const before=new Map<string,{columns:string[],count:number,hash:string}>();
  for(const table of tables){
    const result=await tx.execute('SELECT * FROM '+quote(table));
    const rows=result.rows.map(row=>JSON.stringify(result.columns.map(col=>row[col]))).sort();
    before.set(table,{columns:result.columns,count:rows.length,hash:checksum(rows)});
  }
  await migrateProviderTables(tx);
  for(const [table,snapshot] of before){
    const result=await tx.execute('SELECT '+snapshot.columns.map(quote).join(',')+' FROM '+quote(table));
    const rows=result.rows.map(row=>JSON.stringify(snapshot.columns.map(col=>row[col]))).sort();
    if(rows.length!==snapshot.count||checksum(rows)!==snapshot.hash)throw new Error('Verification failed for '+table+'. Keep the site stopped and retain the backup.');
  }
  const integrity=(await tx.execute('PRAGMA integrity_check')).rows;
  const violations=(await tx.execute('PRAGMA foreign_key_check')).rows;
  if(integrity.some(row=>row.integrity_check!=='ok')||violations.length)throw new Error('SQLite integrity check failed.');
  await tx.commit();
  console.log(JSON.stringify({verified:true,tablesVerified:before.size,counts:Object.fromEntries([...before].map(([table,value])=>[table,value.count])),integrity:'ok',foreignKeyViolations:0},null,2));
}catch(error){await tx.rollback();throw error;}finally{tx.close();client.close();}
