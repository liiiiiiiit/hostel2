import {readdir,readFile,lstat,statfs} from 'node:fs/promises';
import path from 'node:path';
import type {Transaction} from '@libsql/client';
import type {User} from '../src/types/index.js';
import type {AdminHealth} from '../src/types/centralAdmin.js';
import {requireLivePermission} from './authorization.js';
import {applicationEnvironment} from './environment.js';
export async function backupReceiptStatus():Promise<AdminHealth['backup']>{
 const configured=!!(process.env.BACKUP_DIRECTORY&&process.env.BACKUP_ENCRYPTION_KEY);if(!configured)return {configured:false,lastReceiptAt:null,receiptCount:0,state:'none'};
 try{const root=path.resolve(process.env.BACKUP_DIRECTORY!),info=await lstat(root);if(!info.isDirectory()||info.isSymbolicLink())throw Error('Unavailable');const files=(await readdir(root,{withFileTypes:true})).filter(f=>f.isFile()&&/^yerevanhub-.*\.yhbak\.verified\.json$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name)).slice(0,100);let lastReceiptAt:string|null=null,receiptCount=0;
  for(const file of files){const full=path.join(root,file.name),meta=await lstat(full);if(meta.isSymbolicLink()||meta.size>8192)continue;const data=JSON.parse(await readFile(full,'utf8')),backup=await lstat(full.replace(/\.verified\.json$/,''));if(!backup.isFile()||backup.isSymbolicLink()||!backup.size||typeof data.sha256!=='string'||!/^[a-f0-9]{64}$/.test(data.sha256)||!Number.isFinite(Date.parse(data.verifiedAt))||Date.parse(data.verifiedAt)>Date.now())continue;receiptCount++;if(!lastReceiptAt||data.verifiedAt>lastReceiptAt)lastReceiptAt=data.verifiedAt;}
  return {configured,lastReceiptAt,receiptCount,state:lastReceiptAt?'receipt':'none'};
 }catch{return {configured,lastReceiptAt:null,receiptCount:0,state:'unavailable'};}
}
export async function adminHealth(tx:Transaction,actor:User|null):Promise<AdminHealth>{await requireLivePermission(tx,actor,'platform.admin');await tx.execute('SELECT 1');const pageCount=Number((await tx.execute('PRAGMA page_count')).rows[0].page_count),pageSize=Number((await tx.execute('PRAGMA page_size')).rows[0].page_size);const media=(await tx.execute('SELECT COALESCE(SUM(bytes),0) AS bytes,COUNT(*) AS n FROM media_assets')).rows[0];let filesystemFreeBytes:number|null=null;if(process.env.MEDIA_STORAGE==='local'&&process.env.MEDIA_DIRECTORY){try{const root=await lstat(process.env.MEDIA_DIRECTORY);if(root.isDirectory()&&!root.isSymbolicLink()){const s=await statfs(process.env.MEDIA_DIRECTORY);filesystemFreeBytes=s.bavail*s.bsize;}}catch{/* Unknown, never assumed healthy. */}}
 return {observedAt:new Date().toISOString(),database:{connected:true,foreignKeys:!!Number((await tx.execute('PRAGMA foreign_keys')).rows[0].foreign_keys),logicalBytes:pageCount*pageSize},application:{uptimeSeconds:Math.floor(process.uptime()),environment:applicationEnvironment()},storage:{trackedMediaBytes:Number(media.bytes),trackedMediaCount:Number(media.n),filesystemFreeBytes},backup:await backupReceiptStatus(),queue:Object.fromEntries((await tx.execute('SELECT status,COUNT(*) AS n FROM outbox GROUP BY status')).rows.map(r=>[String(r.status),Number(r.n)])),deliveryDisabled:process.env.NOTIFICATION_DELIVERY==='disabled'};
}
