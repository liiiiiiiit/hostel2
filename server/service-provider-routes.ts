import express from 'express';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Database} from './database.js';
import type {User} from '../src/types/index.js';
import type {Transaction} from '@libsql/client';
import {requireOwnedService,serviceProviderState,serviceProviderAdminState,providerQuery} from './service-providers.js';
import {serviceProviderEvent} from './service-provider-storage.js';
import {MAX_IMAGE_BYTES,optimizeImage,storeImage,deleteStoredImage} from './media.js';
import {imageIsReferenced} from './repository.js';
import {queueMediaDeletion,drainMediaDeletions} from './media-cleanup.js';
import {ServiceError} from './services.js';
export function mountServiceProviderRoutes(app:express.Express,db:Database,session:(req:express.Request,tx:Transaction)=>Promise<User|null>){
 app.get('/api/service-provider',async(req,res,next)=>{try{res.set('Cache-Control','no-store');const q=providerQuery.parse(req.query);res.json(await db.sqlTransaction(async tx=>serviceProviderState(tx,await session(req,tx),q),'read'));}catch(e){next(e);}});
 app.get('/api/admin/service-providers',async(req,res,next)=>{try{res.set('Cache-Control','no-store');res.json(await db.sqlTransaction(async tx=>serviceProviderAdminState(tx,await session(req,tx)),'read'));}catch(e){next(e);}});
 // The high entropy receipt is a bearer credential. Return operational progress only.
 app.get('/api/service-requests/:reference',async(req,res,next)=>{try{
  const reference=z.uuid().parse(req.params.reference);res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  const row=await db.sqlTransaction(async tx=>(await tx.execute({sql:'SELECT title_json,status,created_at FROM service_requests WHERE reference=?',args:[reference]})).rows[0],'read');
  if(!row)throw new ServiceError('missing',404);res.json({title:JSON.parse(String(row.title_json)),status:String(row.status),createdAt:String(row.created_at)});
 }catch(e){next(e);}});
 app.post('/api/service-provider/media',express.raw({type:['image/jpeg','image/png','image/webp'],limit:MAX_IMAGE_BYTES}),async(req,res,next)=>{try{
  if(req.headers['x-requested-with']!=='YerevanHub'||req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new ServiceError('forbidden',403);
  const serviceId=z.uuid().parse(req.query.serviceId);
  const user=await db.sqlTransaction(async tx=>{
   const {user}=await requireOwnedService(tx,await session(req,tx),serviceId);
   const bucket='service-provider-media:'+user.id+':'+Math.floor(Date.now()/60000);
   await tx.execute({sql:'INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',args:[bucket,Date.now()+60000]});
   if(Number((await tx.execute({sql:'SELECT count FROM rate_limits WHERE key=?',args:[bucket]})).rows[0].count)>30)throw new ServiceError('unavailable',429);
   return user;
  });
  if(req.query.deleteMedia){
   const assetId=z.uuid().parse(req.query.deleteMedia);
   await db.sqlTransaction(async tx=>{
    await requireOwnedService(tx,await session(req,tx),serviceId);
    const asset=(await tx.execute({sql:'SELECT a.* FROM media_assets a JOIN service_provider_media m ON m.asset_id=a.id WHERE m.asset_id=? AND m.service_id=? AND m.owner_id=? AND a.created_by=?',args:[assetId,serviceId,user.id,user.id]})).rows[0];
    if(!asset)throw new ServiceError('forbidden',403);if(await imageIsReferenced(tx,String(asset.url)))throw new ServiceError('referenced',409);
    await queueMediaDeletion(tx,asset);await serviceProviderEvent(tx,user.id,user.id,serviceId,'image_removed');
   });
   const cleanup=await drainMediaDeletions(db,assetId);res.json({success:true,cleanupPending:cleanup.pending>0});return;
  }
  if(!Buffer.isBuffer(req.body))throw new ServiceError('invalid');
  const bytes=await optimizeImage(req.body,String(req.headers['content-type']).split(';')[0]),assetId=randomUUID(),stored=await storeImage(assetId,bytes);
  try{await db.sqlTransaction(async tx=>{
   await requireOwnedService(tx,await session(req,tx),serviceId);
   if(Number((await tx.execute({sql:'SELECT COUNT(*) AS n FROM service_provider_media WHERE service_id=?',args:[serviceId]})).rows[0].n)>=60)throw new ServiceError('invalid');
   await tx.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[assetId,stored.url,stored.key,stored.backend,bytes.length,user.id,new Date().toISOString()]});
   await tx.execute({sql:'INSERT INTO service_provider_media VALUES(?,?,?)',args:[assetId,serviceId,user.id]});await serviceProviderEvent(tx,user.id,user.id,serviceId,'image_uploaded');
  });}catch(e){await deleteStoredImage({backend:stored.backend,storage_key:stored.key});throw e;}
  res.status(201).json({success:true,image:{id:assetId,url:stored.url}});
 }catch(e){next(e);}});
}
