import {rentalInquiryTransitions as inquiryTransitions} from '../src/utils/rental-owner.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {Transaction} from '@libsql/client';
import type {User,RentalProperty,RentalInquiryStatus} from '../src/types/index.js';
import type {OwnerRental,RentalOwnerProfile,RentalOwnerState,RentalOwnerAdminState} from '../src/types/rentalOwner.js';
import {requireLivePermission,authorizationUser,revokeAuthorizationSessions,auditAuthorization} from './authorization.js';
import {rentalOwnerEvent} from './rental-owner-storage.js';
import {legacyModeration,writeModeration} from './moderation-storage.js';
import {moderationTransitions,type ModerationStatus} from '../src/types/moderation.js';
import {createPasswordCredential} from './passwords.js';
import {rentalSchema} from './property-schemas.js';
import {Store} from './domain.js';
import {loadState,flushState,none,where} from './relational-store.js';
import {tables} from './relational-schema.js';
const id=z.string().min(1).max(500),text=(n:number)=>z.string().trim().max(n),version=z.number().int().nonnegative();
export const ownerAccountInput=z.object({id:id.optional(),version,name:text(120).min(1),email:z.email().transform(v=>v.toLowerCase()),phone:text(100),password:z.string().max(128),status:z.enum(['active','suspended']),organization:text(160),bio:text(3000),city:text(160)}).strict();
export const ownerActionSchemas={
 saveRentalOwnerAccount:z.tuple([ownerAccountInput]),
 grantRentalOwner:z.tuple([z.object({userId:id,status:z.enum(['active','suspended']),reason:text(2000).min(1)}).strict()]),
 assignRentalOwner:z.tuple([z.object({propertyId:id,ownerId:id.nullable(),version,reason:text(2000).min(1)}).strict()]),
 saveOwnerProfile:z.tuple([z.object({version,organization:text(160),bio:text(3000),city:text(160)}).strict()]),
 saveOwnerRental:z.tuple([z.object({property:rentalSchema,expectedUpdatedAt:z.string().min(1).max(100).nullable(),mode:z.enum(['draft','pending_review','archived'])}).strict()]),
 setOwnerRentalAvailability:z.tuple([id,z.number().int().positive(),z.boolean()]),
 updateOwnerInquiry:z.tuple([id,z.string().min(1).max(100),z.enum(['pending_review','coordinating','proposed_terms','agreed','rejected','cancelled','completed']),z.enum(['pending_review','coordinating','proposed_terms','agreed','rejected','cancelled','completed'])]),
};
export const ownerQuery=z.object({search:text(120).default(''),page:z.coerce.number().int().min(1).max(100000).default(1),propertyId:z.string().max(500).default('')}).strict();
export {rentalInquiryTransitions as inquiryTransitions} from '../src/utils/rental-owner.js';

const empty=()=>Object.fromEntries(tables.map(t=>[t.table,none]));
const forbidden=()=>new Error('دسترسی مجاز نیست.');const conflict=()=>new Error('اطلاعات یا قیمت تغییر کرده است؛ شرایط جدید را بررسی کنید.');
export async function requireRentalOwner(tx:Transaction,actor:User|null){const user=await requireLivePermission(tx,actor,'rentals.manage');if(!user.rentalOwnerAuthorized)throw forbidden();return user;}
export async function requireOwnedRental(tx:Transaction,actor:User|null,propertyId:string){const user=await requireRentalOwner(tx,actor);const row=(await tx.execute({sql:'SELECT * FROM rental_owner_properties WHERE property_id=? AND owner_id=?',args:[propertyId,user.id]})).rows[0];if(!row)throw forbidden();return {user,row};}
async function profile(tx:Transaction,userId:string):Promise<RentalOwnerProfile>{const r=(await tx.execute({sql:'SELECT a.*,u.name,u.email,u.phone FROM rental_owner_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=?',args:[userId]})).rows[0];if(!r)throw forbidden();return {userId,status:r.status as RentalOwnerProfile['status'],version:Number(r.version),organization:String(r.organization),bio:String(r.bio),city:String(r.city),name:String(r.name),email:String(r.email),phone:String(r.phone??'')};}
async function properties(tx:Transaction,userId:string):Promise<OwnerRental[]>{
 const links=(await tx.execute({sql:'SELECT * FROM rental_owner_properties WHERE owner_id=? ORDER BY property_id',args:[userId]})).rows;
 const state=(await loadState(tx,{...empty(),properties:where("kind='rental' AND id IN (SELECT property_id FROM rental_owner_properties WHERE owner_id=?)",userId)})).state;
 const result:OwnerRental[]=[];
 for(const rental of state.rentals){const link=links.find(r=>r.property_id===rental.id)!;const m=(await tx.execute({sql:"SELECT status FROM content_moderation WHERE module='rental' AND content_id=?",args:[rental.id]})).rows[0];const feedback=(await tx.execute({sql:"SELECT note FROM moderation_events WHERE module='rental' AND content_id=? AND note!='content_saved' ORDER BY created_at DESC,id DESC LIMIT 1",args:[rental.id]})).rows[0];const ownedMediaIds=(await tx.execute({sql:'SELECT asset_id FROM rental_owner_media WHERE property_id=? AND owner_id=?',args:[rental.id,userId]})).rows.map(r=>String(r.asset_id));
  result.push({...rental,landlordInternalNotes:'',verifiedBadge:false,verifiedExplanation:'',lastCheckedAt:'',ownerVersion:Number(link.version),acceptingInquiries:!!link.accepts_inquiries,moderationStatus:(m?.status??legacyModeration('rental',rental as unknown as Record<string,unknown>)) as ModerationStatus,moderationFeedback:String(feedback?.note??''),ownedMediaIds});
 }
 return result;
}
export async function rentalOwnerState(tx:Transaction,actor:User|null,q:z.infer<typeof ownerQuery>):Promise<RentalOwnerState>{
 const user=await requireRentalOwner(tx,actor),rentals=await properties(tx,user.id);
 const filter=where('id IN (SELECT a.inquiry_id FROM rental_owner_inquiry_access a JOIN rental_inquiries i ON i.id=a.inquiry_id JOIN rental_owner_properties ro ON ro.property_id=i.property_id WHERE a.owner_id=? AND ro.owner_id=?)',user.id,user.id);
 const inquiries=(await loadState(tx,{...empty(),rental_inquiries:filter})).state.rentalInquiries;
 const selected=inquiries.filter(i=>(!q.propertyId||i.propertyId===q.propertyId)&&JSON.stringify([i.guestName,i.contact,i.notes]).toLocaleLowerCase().includes(q.search.toLocaleLowerCase())).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
 const history=(await tx.execute({sql:'SELECT id,kind,property_id,created_at FROM rental_owner_events WHERE owner_id=? ORDER BY created_at DESC,id DESC LIMIT 100',args:[user.id]})).rows.map(r=>({id:String(r.id),kind:String(r.kind),propertyId:r.property_id?String(r.property_id):null,createdAt:String(r.created_at)}));
 return {profile:await profile(tx,user.id),properties:rentals,inquiries:selected.slice((q.page-1)*10,q.page*10).map(({privateToken:_token,trackingCode:_tracking,adminNotes:_notes,...i})=>i),totalInquiries:selected.length,page:q.page,history,stats:{properties:rentals.length,published:rentals.filter(p=>p.moderationStatus==='published').length,available:rentals.filter(p=>p.acceptingInquiries&&p.moderationStatus==='published').length,inquiries:inquiries.length}};
}
export async function rentalOwnerAdminState(tx:Transaction,actor:User|null):Promise<RentalOwnerAdminState>{
 await requireLivePermission(tx,actor,'accounts.assign');const ids=(await tx.execute('SELECT user_id FROM rental_owner_accounts ORDER BY created_at,user_id')).rows;const accounts=[];for(const r of ids)accounts.push(await profile(tx,String(r.user_id)));
 return {accounts,users:(await tx.execute('SELECT id,name,email FROM users WHERE is_active=1 ORDER BY name,id')).rows.map(r=>({id:String(r.id),name:String(r.name),email:String(r.email)})),properties:(await tx.execute("SELECT p.id,COALESCE((SELECT value FROM property_translations t WHERE t.kind='rental' AND t.property_id=p.id AND t.field='title' ORDER BY t.language LIMIT 1),p.slug,p.id) AS title,ro.owner_id,COALESCE(ro.version,0) AS version FROM properties p LEFT JOIN rental_owner_properties ro ON ro.property_id=p.id WHERE p.kind='rental' ORDER BY p.sort_order,p.id")).rows.map(r=>({id:String(r.id),title:String(r.title),ownerId:r.owner_id?String(r.owner_id):null,version:Number(r.version)}))};
}
async function withdraw(tx:Transaction,user:User,propertyId:string,desired:ModerationStatus,note:string){const property=(await tx.execute({sql:"SELECT listing_status,updated_at FROM properties WHERE kind='rental' AND id=?",args:[propertyId]})).rows[0];const time=new Date(Math.max(Date.now(),(Date.parse(String(property?.updated_at??''))||0)+1)).toISOString();const old=(await tx.execute({sql:"SELECT status FROM content_moderation WHERE module='rental' AND content_id=?",args:[propertyId]})).rows[0];const before=(old?.status??(property?.listing_status==='published'?'published':property?.listing_status==='archived'?'archived':'draft')) as ModerationStatus;const next=before==='suspended'||before==='archived'?before:desired;if(before!==next&&!moderationTransitions[before].includes(next))throw conflict();await tx.execute({sql:"UPDATE properties SET listing_status=?,updated_at=? WHERE kind='rental' AND id=?",args:[next==='archived'?'archived':next==='draft'?'draft':'hidden',time,propertyId]});await writeModeration(tx,'rental',propertyId,before,next,user.id,note);}
export async function rentalOwnerAction(tx:Transaction,actor:User|null,action:keyof typeof ownerActionSchemas,args:unknown[]){
 args=ownerActionSchemas[action].parse(args) as unknown[];
 if(action==='saveRentalOwnerAccount'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=ownerAccountInput.parse(args[0]),userId=v.id??randomUUID(),old=v.id?await profile(tx,userId):null;
  if((old&&old.version!==v.version)||(!old&&v.version!==0))throw conflict();
  if((!old||v.password)&&v.password.length<12)throw Error('رمز عبور باید حداقل ۱۲ نویسه باشد.');
  if((await tx.execute({sql:'SELECT id FROM users WHERE email=? COLLATE NOCASE AND id<>?',args:[v.email,userId]})).rows.length)throw Error('این ایمیل قبلاً ثبت‌نام شده است.');
  if(!old)await tx.execute({sql:"INSERT INTO users(id,name,email,phone,role,is_active,created_at) VALUES(?,?,?,?,'traveler',1,?)",args:[userId,v.name,v.email,v.phone,new Date().toISOString()]});
  else await tx.execute({sql:'UPDATE users SET name=?,email=?,phone=?,email_verified_at=CASE WHEN email!=? COLLATE NOCASE THEN NULL ELSE email_verified_at END WHERE id=?',args:[v.name,v.email,v.phone,v.email,userId]});
  if(v.password){const c=await createPasswordCredential(v.password);await tx.execute({sql:'INSERT INTO user_credentials(user_id,hash,salt) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET hash=excluded.hash,salt=excluded.salt',args:[userId,c.hash,c.salt]});}
  const now=new Date().toISOString();
  if(old)await tx.execute({sql:'UPDATE rental_owner_accounts SET status=?,organization=?,bio=?,city=?,version=version+1,updated_at=? WHERE user_id=? AND version=?',args:[v.status,v.organization,v.bio,v.city,now,userId,v.version]});
  else await tx.execute({sql:'INSERT INTO rental_owner_accounts VALUES(?,?,1,?,?,?,?,?)',args:[userId,v.status,v.organization,v.bio,v.city,now,now]});
  await revokeAuthorizationSessions(tx,userId);await auditAuthorization(tx,admin.id,userId,old?{rentalOwnerStatus:old.status}:null,{rentalOwnerStatus:v.status},old?'rental_owner_account_updated':'rental_owner_account_created');await rentalOwnerEvent(tx,userId,admin.id,null,old?'account_updated':'account_created');
 }else if(action==='grantRentalOwner'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=args[0] as z.infer<typeof ownerActionSchemas.grantRentalOwner>[0];
  if(!(await tx.execute({sql:'SELECT id FROM users WHERE id=?',args:[v.userId]})).rows.length)throw forbidden();
  const now=new Date().toISOString();const r=await tx.execute({sql:"INSERT INTO rental_owner_accounts VALUES(?,?,1,'','','',?,?) ON CONFLICT(user_id) DO NOTHING",args:[v.userId,v.status,now,now]});if(!r.rowsAffected)throw conflict();
  await revokeAuthorizationSessions(tx,v.userId);await auditAuthorization(tx,admin.id,v.userId,null,{rentalOwnerStatus:v.status},v.reason);await rentalOwnerEvent(tx,v.userId,admin.id,null,'account_authorized');
 }else if(action==='assignRentalOwner'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=args[0] as z.infer<typeof ownerActionSchemas.assignRentalOwner>[0];
  if(!(await tx.execute({sql:"SELECT id FROM properties WHERE kind='rental' AND id=?",args:[v.propertyId]})).rows.length)throw forbidden();
  if(v.ownerId&&!(await tx.execute({sql:"SELECT a.user_id FROM rental_owner_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND a.status='active' AND u.is_active=1",args:[v.ownerId]})).rows.length)throw forbidden();
  const old=(await tx.execute({sql:'SELECT * FROM rental_owner_properties WHERE property_id=?',args:[v.propertyId]})).rows[0];if((!old&&!v.ownerId)||Number(old?.version??0)!==v.version||old?.owner_id===v.ownerId)throw conflict();
  const r=old?await tx.execute({sql:'UPDATE rental_owner_properties SET owner_id=?,version=version+1,accepts_inquiries=1,assigned_at=? WHERE property_id=? AND version=?',args:[v.ownerId,new Date().toISOString(),v.propertyId,v.version]}):await tx.execute({sql:'INSERT INTO rental_owner_properties VALUES(?,\'rental\',?,1,1,?) ON CONFLICT(property_id) DO NOTHING',args:[v.propertyId,v.ownerId,new Date().toISOString()]});if(!r.rowsAffected)throw conflict();
  await withdraw(tx,admin,v.propertyId,'pending_review',v.reason);
  await tx.execute({sql:"UPDATE properties SET extras_json=json_set(extras_json,'$.verifiedBadge',json('false'),'$.verifiedExplanation','','$.lastCheckedAt','') WHERE kind='rental' AND id=?",args:[v.propertyId]});
  for(const who of new Set([old?.owner_id,v.ownerId].filter(Boolean)))await revokeAuthorizationSessions(tx,String(who));
  await rentalOwnerEvent(tx,v.ownerId,admin.id,v.propertyId,'property_assigned',{previousOwnerId:old?.owner_id??null,reason:v.reason});await auditAuthorization(tx,admin.id,v.propertyId,{ownerId:old?.owner_id??null},{ownerId:v.ownerId},v.reason);
 }else if(action==='saveOwnerProfile'){
  const user=await requireRentalOwner(tx,actor),v=args[0] as z.infer<typeof ownerActionSchemas.saveOwnerProfile>[0];const r=await tx.execute({sql:'UPDATE rental_owner_accounts SET organization=?,bio=?,city=?,version=version+1,updated_at=? WHERE user_id=? AND version=?',args:[v.organization,v.bio,v.city,new Date().toISOString(),user.id,v.version]});if(!r.rowsAffected)throw conflict();await rentalOwnerEvent(tx,user.id,user.id,null,'profile_updated');
 }else if(action==='saveOwnerRental'){
  let user=await requireRentalOwner(tx,actor);const v=args[0] as z.infer<typeof ownerActionSchemas.saveOwnerRental>[0],p=v.property;
  const exists=(await tx.execute({sql:"SELECT updated_at FROM properties WHERE kind='rental' AND id=?",args:[p.id]})).rows[0];
  if(exists){await requireOwnedRental(tx,user,p.id);if(v.expectedUpdatedAt!==exists.updated_at)throw conflict();}else{if(v.expectedUpdatedAt!==null)throw conflict();z.uuid().parse(p.id);}
  const loaded=await loadState(tx,{...empty(),properties:where("kind='rental' AND (id=? OR (slug<>'' AND slug=?))",p.id,p.slug)}),previous=loaded.state.rentals.find(r=>r.id===p.id);
  if(p.landlordInternalNotes||p.verifiedBadge||p.verifiedExplanation||p.lastCheckedAt)throw forbidden();
  if(previous&&(p.commissionType!==previous.commissionType||p.commissionAmountText!==previous.commissionAmountText))throw forbidden();
  if(!previous&&(p.commissionType!=='none_direct'||p.commissionAmountText))throw forbidden();
  const meta=(await tx.execute({sql:"SELECT status FROM content_moderation WHERE module='rental' AND content_id=?",args:[p.id]})).rows[0];if(v.mode==='pending_review'&&meta&&['archived','suspended'].includes(String(meta.status)))throw forbidden();
  const oldMedia=previous?.media??previous?.photos.map((url,index)=>({id:'external-'+index,url}))??[];
  for(const image of p.media??[]){if(oldMedia.some(m=>m.id===image.id&&m.url===image.url))continue;if(!(await tx.execute({sql:'SELECT 1 FROM rental_owner_media om JOIN media_assets a ON a.id=om.asset_id WHERE om.asset_id=? AND om.property_id=? AND om.owner_id=? AND a.created_by=? AND a.url=?',args:[image.id,p.id,user.id,user.id,image.url]})).rows.length)throw forbidden();}
  if(!p.media&&JSON.stringify(p.photos)!==JSON.stringify(previous?.photos??[]))throw forbidden();
  // The shared Store is used with the real authenticated owner, never a forged admin.
  loaded.state.currentUser=user;const store=new Store(loaded.state,true);
  store.saveRental({...p,status:v.mode==='pending_review'?'published':'draft',landlordInternalNotes:previous?.landlordInternalNotes??'',publicPreview:previous?.publicPreview??false,sampleContent:previous?.sampleContent??false,providerType:previous?.providerType??'direct_owner'},v.expectedUpdatedAt??undefined);
  Object.assign(loaded.state,store.getState());await flushState(tx,loaded,user);
  if(!exists){await tx.execute({sql:"INSERT INTO rental_owner_properties VALUES(?,'rental',?,1,1,?)",args:[p.id,user.id,new Date().toISOString()]});user=(await authorizationUser(tx,user))!;}
  if(v.mode!=='draft')await withdraw(tx,user,p.id,v.mode,v.mode==='archived'?'owner_archived':'owner_submitted');
  await rentalOwnerEvent(tx,user.id,user.id,p.id,v.mode==='archived'?'property_archived':v.mode==='pending_review'?'property_submitted':'property_saved');
  return {success:true,rental:(await properties(tx,user.id)).find(r=>r.id===p.id)!};
 }else if(action==='setOwnerRentalAvailability'){
  const {user,row}=await requireOwnedRental(tx,actor,String(args[0]));if(row.version!==args[1])throw conflict();const changed=await tx.execute({sql:'UPDATE rental_owner_properties SET accepts_inquiries=?,version=version+1 WHERE property_id=? AND version=?',args:[Number(args[2]),String(args[0]),Number(args[1])]});if(changed.rowsAffected!==1)throw conflict();await rentalOwnerEvent(tx,user.id,user.id,String(args[0]),'availability_updated',{acceptsInquiries:args[2]});
 }else if(action==='updateOwnerInquiry'){
  const user=await requireRentalOwner(tx,actor),[inquiryId,updatedAt,previous,next]=args as [string,string,RentalInquiryStatus,RentalInquiryStatus];
  const row=(await tx.execute({sql:'SELECT i.property_id,i.status,i.updated_at FROM rental_inquiries i JOIN rental_owner_inquiry_access a ON a.inquiry_id=i.id JOIN rental_owner_properties ro ON ro.property_id=i.property_id WHERE i.id=? AND a.owner_id=? AND ro.owner_id=?',args:[inquiryId,user.id,user.id]})).rows[0];if(!row)throw forbidden();if(row.status!==previous||row.updated_at!==updatedAt||!inquiryTransitions[previous].includes(next))throw conflict();
  const now=new Date(Math.max(Date.now(),Date.parse(updatedAt)+1)).toISOString();const changed=await tx.execute({sql:'UPDATE rental_inquiries SET status=?,updated_at=? WHERE id=? AND status=? AND updated_at=?',args:[next,now,inquiryId,previous,updatedAt]});if(changed.rowsAffected!==1)throw conflict();await rentalOwnerEvent(tx,user.id,user.id,String(row.property_id),'inquiry_updated',{inquiryId,previous,next});
 }
 return {success:true};
}
