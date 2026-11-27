import express from 'express';
import type {Database} from './database.js';
import type {User} from '../src/types/index.js';
import type {Transaction} from '@libsql/client';
import {z} from 'zod';
import {requireOwnedRental} from './rental-owners.js';
import {rentalOwnerEvent} from './rental-owner-storage.js';
import {MAX_IMAGE_BYTES,optimizeImage,storeImage,deleteStoredImage} from './media.js';
import {imageIsReferenced} from './repository.js';
import {queueMediaDeletion,drainMediaDeletions} from './media-cleanup.js';
export function mountRentalOwnerMedia(app:express.Express,database:Database,session:(req:express.Request,tx:Transaction)=>Promise<User|null>){
 app.post('/api/rental-owner/media',express.raw({type:['image/jpeg','image/png','image/webp'],limit:MAX_IMAGE_BYTES}),async(req,res,next)=>{try{
  if(req.headers['x-requested-with']!=='YerevanHub'||req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.sendStatus(403);return;}
  const propertyId=z.string().min(1).max(500).parse(req.query.propertyId);
  const actor=await database.sqlTransaction(async tx=>{const {user}=await requireOwnedRental(tx,await session(req,tx),propertyId);const bucket='rental-media:'+user.id+':'+Math.floor(Date.now()/60000);await tx.execute({sql:'INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',args:[bucket,Date.now()+60000]});if(Number((await tx.execute({sql:'SELECT count FROM rate_limits WHERE key=?',args:[bucket]})).rows[0].count)>30)throw Error('تعداد درخواست زیاد است؛ یک دقیقه صبر کنید.');return user;});
  if(req.query.deleteMedia){
   const assetId=z.uuid().parse(req.query.deleteMedia);
   await database.sqlTransaction(async tx=>{await requireOwnedRental(tx,await session(req,tx),propertyId);const asset=(await tx.execute({sql:'SELECT a.* FROM media_assets a JOIN rental_owner_media om ON om.asset_id=a.id WHERE a.id=? AND om.property_id=? AND om.owner_id=? AND a.created_by=?',args:[assetId,propertyId,actor.id,actor.id]})).rows[0];if(!asset)throw Error('دسترسی مجاز نیست.');if(await imageIsReferenced(tx,String(asset.url)))throw Error('ابتدا تصویر را از ملک جدا و تغییرات را ذخیره کنید.');await queueMediaDeletion(tx,asset);await rentalOwnerEvent(tx,actor.id,actor.id,propertyId,'photo_removed',{assetId});});
   const cleanup=await drainMediaDeletions(database,assetId);res.json({success:true,cleanupPending:cleanup.pending>0});return;
  }
  if(!Buffer.isBuffer(req.body))throw Error('فایل تصویر معتبر ارسال کنید.');
  const bytes=await optimizeImage(req.body,String(req.headers['content-type']).split(';')[0]),assetId=crypto.randomUUID(),stored=await storeImage(assetId,bytes);
  try{await database.sqlTransaction(async tx=>{await requireOwnedRental(tx,await session(req,tx),propertyId);const count=Number((await tx.execute({sql:'SELECT COUNT(*) AS n FROM rental_owner_media WHERE property_id=?',args:[propertyId]})).rows[0].n);if(count>=60)throw Error('اطلاعات واردشده معتبر نیست.');await tx.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[assetId,stored.url,stored.key,stored.backend,bytes.length,actor.id,new Date().toISOString()]});await tx.execute({sql:"INSERT INTO rental_owner_media VALUES(?,?,'rental',?)",args:[assetId,propertyId,actor.id]});await rentalOwnerEvent(tx,actor.id,actor.id,propertyId,'photo_uploaded',{assetId});});}
  catch(e){await deleteStoredImage({backend:stored.backend,storage_key:stored.key});throw e;}
  res.status(201).json({success:true,image:{id:assetId,url:stored.url,alt:{fa:'',en:'',ru:'',hy:''}}});
 }catch(e){next(e);}});
}
