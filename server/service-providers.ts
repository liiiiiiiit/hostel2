import {z} from 'zod';
import {randomUUID,createHash} from 'node:crypto';
import type {Transaction} from '@libsql/client';
import type {User} from '../src/types/index.js';
import type {ServiceBusiness,ServiceProviderState,ServiceProviderAdminState} from '../src/types/serviceProvider.js';
import {requireLivePermission,authorizationUser,revokeAuthorizationSessions,auditAuthorization} from './authorization.js';
import {createPasswordCredential} from './passwords.js';
import {serviceInput,serviceAction,listing,serviceCategories,ServiceError} from './services.js';
import {serviceProviderEvent} from './service-provider-storage.js';
import {writeModeration} from './moderation-storage.js';
import {moderationTransitions,type ModerationStatus} from '../src/types/moderation.js';
const id=z.uuid(),userIdSchema=z.string().min(1).max(500),text=(max:number)=>z.string().trim().max(max),version=z.number().int().nonnegative();
export const businessInput=z.object({userId:userIdSchema.optional(),version,name:text(120).min(1),email:z.email().max(254).transform(s=>s.toLowerCase()),phone:text(100),password:z.string().max(128),status:z.enum(['active','suspended']),businessName:text(160).min(1),bio:text(3000),city:text(160)}).strict();
export const serviceProviderSchemas={
 saveServiceProviderAccount:z.tuple([businessInput]),
 grantServiceProvider:z.tuple([z.object({userId:userIdSchema,businessName:text(160).min(1),reason:text(2000).min(1)}).strict()]),
 assignServiceProvider:z.tuple([z.object({serviceId:id,ownerId:userIdSchema.nullable(),version,reason:text(2000).min(1)}).strict()]),
 saveServiceBusiness:z.tuple([z.object({version,businessName:text(160).min(1),bio:text(3000),city:text(160)}).strict()]),
 saveProviderService:z.tuple([z.object({service:serviceInput,submit:z.boolean()}).strict()]),
 updateProviderServiceRequest:z.tuple([z.string().regex(/^[a-f0-9]{64}$/),z.enum(['new','contacted','closed']),z.enum(['new','contacted','closed'])]),
 reviewServiceVerification:z.tuple([z.object({serviceId:id,version:z.number().int().positive(),verified:z.boolean(),evidence:text(4000).min(1)}).strict()])
};
export const providerQuery=z.object({search:text(120).default(''),serviceId:z.union([z.literal(''),id]).default(''),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
const forbidden=()=>new ServiceError('forbidden',403),conflict=()=>new ServiceError('conflict',409);
export async function requireServiceProvider(tx:Transaction,actor:User|null){
 const user=await requireLivePermission(tx,actor,'services.provide');
 if(!user.serviceProviderAuthorized)throw forbidden();return user;
}
export async function requireOwnedService(tx:Transaction,actor:User|null,serviceId:string){
 const user=await requireServiceProvider(tx,actor);
 const row=(await tx.execute({sql:'SELECT * FROM service_provider_listings WHERE service_id=? AND owner_id=?',args:[serviceId,user.id]})).rows[0];
 if(!row)throw forbidden();return {user,row};
}
async function business(tx:Transaction,userId:string):Promise<ServiceBusiness>{
 const r=(await tx.execute({sql:'SELECT a.*,u.name,u.email,u.phone FROM service_provider_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=?',args:[userId]})).rows[0];
 if(!r)throw forbidden();
 return {userId,name:String(r.name),email:String(r.email),phone:String(r.phone??''),status:r.status as 'active'|'suspended',businessName:String(r.business_name),bio:String(r.bio),city:String(r.city),version:Number(r.version)};
}
export async function serviceProviderState(tx:Transaction,actor:User|null,q:z.infer<typeof providerQuery>):Promise<ServiceProviderState>{
 const user=await requireServiceProvider(tx,actor);
 const rows=(await tx.execute({sql:"SELECT s.*,p.version AS ownership_version,COALESCE(m.status,CASE WHEN s.is_active=1 THEN 'published' ELSE 'draft' END) AS moderation_status FROM service_listings s JOIN service_provider_listings p ON p.service_id=s.id LEFT JOIN content_moderation m ON m.module='service' AND m.content_id=s.id WHERE p.owner_id=? ORDER BY s.updated_at DESC,s.id",args:[user.id]})).rows;
 const listings=rows.map(r=>({...listing(r),ownershipVersion:Number(r.ownership_version),moderationStatus:String(r.moderation_status)}));
 const clauses=" FROM service_requests r JOIN service_provider_request_access a ON a.reference=r.reference JOIN service_provider_listings p ON p.service_id=r.service_id WHERE a.owner_id=? AND p.owner_id=?";
 const requestRows=(await tx.execute({sql:'SELECT r.*'+clauses+' ORDER BY r.created_at DESC,r.reference',args:[user.id,user.id]})).rows;
 const filtered=requestRows.filter(r=>(!q.serviceId||r.service_id===q.serviceId)&&JSON.stringify([r.name,r.contact,r.note]).toLocaleLowerCase().includes(q.search.toLocaleLowerCase()));
 return {profile:await business(tx,user.id),categories:await serviceCategories(tx),listings,requests:filtered.slice((q.page-1)*10,q.page*10).map(r=>({id:createHash('sha256').update(String(r.reference)+':provider').digest('hex'),serviceId:String(r.service_id),serviceTitle:JSON.parse(String(r.title_json)),name:String(r.name),contact:String(r.contact),preferredDate:String(r.preferred_date),note:String(r.note),status:r.status as 'new'|'contacted'|'closed',createdAt:String(r.created_at)})),totalRequests:filtered.length,page:q.page,stats:{listings:listings.length,published:listings.filter(s=>s.moderationStatus==='published').length,requests:requestRows.length},history:(await tx.execute({sql:'SELECT id,kind,created_at FROM service_provider_events WHERE owner_id=? ORDER BY created_at DESC,id DESC LIMIT 100',args:[user.id]})).rows.map(r=>({id:String(r.id),kind:String(r.kind),createdAt:String(r.created_at)}))};
}
export async function serviceProviderAdminState(tx:Transaction,actor:User|null):Promise<ServiceProviderAdminState>{
 await requireLivePermission(tx,actor,'accounts.assign');
 const ids=(await tx.execute('SELECT user_id FROM service_provider_accounts ORDER BY created_at,user_id')).rows;
 const accounts=[];for(const r of ids)accounts.push(await business(tx,String(r.user_id)));
 return {accounts,users:(await tx.execute('SELECT id,name,email FROM users WHERE is_active=1 ORDER BY name,id')).rows.map(r=>({id:String(r.id),name:String(r.name),email:String(r.email)})),listings:(await tx.execute("SELECT s.id,s.title_json,s.version,s.is_verified,p.owner_id,COALESCE(p.version,0) AS ownership_version FROM service_listings s LEFT JOIN service_provider_listings p ON p.service_id=s.id ORDER BY s.updated_at DESC,s.id")).rows.map(r=>({id:String(r.id),title:String(JSON.parse(String(r.title_json)).en??''),ownerId:r.owner_id?String(r.owner_id):null,ownershipVersion:Number(r.ownership_version),version:Number(r.version),isVerified:!!r.is_verified}))};
}
export async function serviceProviderAction(tx:Transaction,actor:User|null,action:keyof typeof serviceProviderSchemas,args:unknown[]){
 args=serviceProviderSchemas[action].parse(args) as unknown[];
 if(action==='saveServiceProviderAccount'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=businessInput.parse(args[0]),userId=v.userId??randomUUID(),old=v.userId?await business(tx,userId):null,now=new Date().toISOString();
  if((old?old.version:0)!==v.version)throw conflict();
  if((!old||v.password)&&v.password.length<12)throw new ServiceError('invalid');
  if((await tx.execute({sql:'SELECT id FROM users WHERE email=? COLLATE NOCASE AND id<>?',args:[v.email,userId]})).rows.length)throw new ServiceError('duplicate',409);
  if(!old)await tx.execute({sql:"INSERT INTO users(id,name,email,phone,role,is_active,created_at) VALUES(?,?,?,?,'traveler',1,?)",args:[userId,v.name,v.email,v.phone,now]});
  else await tx.execute({sql:'UPDATE users SET name=?,phone=?,email_verified_at=CASE WHEN email!=? COLLATE NOCASE THEN NULL ELSE email_verified_at END,email=? WHERE id=?',args:[v.name,v.phone,v.email,v.email,userId]});
  if(v.password){const c=await createPasswordCredential(v.password);await tx.execute({sql:'INSERT INTO user_credentials(user_id,hash,salt) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET hash=excluded.hash,salt=excluded.salt',args:[userId,c.hash,c.salt]});}
  if(old)await tx.execute({sql:'UPDATE service_provider_accounts SET status=?,business_name=?,bio=?,city=?,version=version+1,updated_at=? WHERE user_id=?',args:[v.status,v.businessName,v.bio,v.city,now,userId]});
  else await tx.execute({sql:'INSERT INTO service_provider_accounts VALUES(?,?,?,?,?,1,?,?)',args:[userId,v.status,v.businessName,v.bio,v.city,now,now]});
  await revokeAuthorizationSessions(tx,userId);await auditAuthorization(tx,admin.id,userId,old?{status:old.status}:null,{status:v.status},'service_provider_account_saved');await serviceProviderEvent(tx,userId,admin.id,null,'account_saved');
 }else if(action==='grantServiceProvider'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=args[0] as z.infer<typeof serviceProviderSchemas.grantServiceProvider>[0],now=new Date().toISOString();
  if(!(await tx.execute({sql:'SELECT id FROM users WHERE id=? AND is_active=1',args:[v.userId]})).rows.length)throw forbidden();
  const changed=await tx.execute({sql:"INSERT INTO service_provider_accounts VALUES(?,'active',?,'','',1,?,?) ON CONFLICT(user_id) DO NOTHING",args:[v.userId,v.businessName,now,now]});if(!changed.rowsAffected)throw conflict();
  await revokeAuthorizationSessions(tx,v.userId);await auditAuthorization(tx,admin.id,v.userId,null,{serviceProvider:true},v.reason);await serviceProviderEvent(tx,v.userId,admin.id,null,'account_authorized');
 }else if(action==='assignServiceProvider'){
  const admin=await requireLivePermission(tx,actor,'accounts.assign'),v=args[0] as z.infer<typeof serviceProviderSchemas.assignServiceProvider>[0];
  const s=(await tx.execute({sql:'SELECT id FROM service_listings WHERE id=?',args:[v.serviceId]})).rows[0];if(!s)throw forbidden();
  if(v.ownerId&&!(await tx.execute({sql:"SELECT 1 FROM service_provider_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND a.status='active' AND u.is_active=1",args:[v.ownerId]})).rows.length)throw forbidden();
  const old=(await tx.execute({sql:'SELECT * FROM service_provider_listings WHERE service_id=?',args:[v.serviceId]})).rows[0];
  if(Number(old?.version??0)!==v.version||old?.owner_id===v.ownerId||!old&&!v.ownerId)throw conflict();
  if(old)await tx.execute({sql:'UPDATE service_provider_listings SET owner_id=?,version=version+1 WHERE service_id=?',args:[v.ownerId,v.serviceId]});
  else await tx.execute({sql:'INSERT INTO service_provider_listings VALUES(?,?,1)',args:[v.serviceId,v.ownerId]});
  const m=(await tx.execute({sql:"SELECT status FROM content_moderation WHERE module='service' AND content_id=?",args:[v.serviceId]})).rows[0];
  const before=(m?.status??'draft') as ModerationStatus,next=['archived','suspended'].includes(before)?before:'pending_review';
  await tx.execute({sql:'UPDATE service_listings SET is_active=0,is_verified=0,version=version+1,updated_at=? WHERE id=?',args:[new Date().toISOString(),v.serviceId]});
  await writeModeration(tx,'service',v.serviceId,before,next,admin.id,v.reason);
  for(const who of new Set([old?.owner_id,v.ownerId].filter(Boolean)))await revokeAuthorizationSessions(tx,String(who));
  await auditAuthorization(tx,admin.id,v.serviceId,{ownerId:old?.owner_id??null},{ownerId:v.ownerId},v.reason);await serviceProviderEvent(tx,v.ownerId,admin.id,v.serviceId,'listing_assigned');
 }else if(action==='saveServiceBusiness'){
  const user=await requireServiceProvider(tx,actor),v=args[0] as z.infer<typeof serviceProviderSchemas.saveServiceBusiness>[0];
  const r=await tx.execute({sql:'UPDATE service_provider_accounts SET business_name=?,bio=?,city=?,version=version+1,updated_at=? WHERE user_id=? AND version=?',args:[v.businessName,v.bio,v.city,new Date().toISOString(),user.id,v.version]});if(!r.rowsAffected)throw conflict();await serviceProviderEvent(tx,user.id,user.id,null,'profile_saved');
 }else if(action==='saveProviderService'){
  const user=await requireServiceProvider(tx,actor),v=args[0] as z.infer<typeof serviceProviderSchemas.saveProviderService>[0],s=v.service;
  const old=(await tx.execute({sql:'SELECT * FROM service_listings WHERE id=?',args:[s.id]})).rows[0];
  if(old)await requireOwnedService(tx,user,s.id);else if(s.version!==0)throw conflict();
  if(s.isFeatured!==!!old?.is_featured||s.isVerified!==!!old?.is_verified)throw forbidden();
  const prior=old?listing(old):null,oldUrls=prior?[prior.coverImage,...prior.gallery]:[];
  for(const url of [s.coverImage,...s.gallery].filter(Boolean)){if(oldUrls.includes(url))continue;if(!(await tx.execute({sql:'SELECT 1 FROM service_provider_media m JOIN media_assets a ON a.id=m.asset_id WHERE m.service_id=? AND m.owner_id=? AND a.created_by=? AND a.url=?',args:[s.id,user.id,user.id,url]})).rows.length)throw forbidden();}
  const m=(await tx.execute({sql:"SELECT status FROM content_moderation WHERE module='service' AND content_id=?",args:[s.id]})).rows[0];
  if(v.submit&&m&&['suspended','archived'].includes(String(m.status)))throw forbidden();
  await serviceAction(tx,user,'saveService',[{...s,isActive:v.submit}],{provider:true});
  if(!old)await tx.execute({sql:'INSERT INTO service_provider_listings VALUES(?,?,1)',args:[s.id,user.id]});
  await serviceProviderEvent(tx,user.id,user.id,s.id,v.submit?'listing_submitted':'listing_saved');
 }else if(action==='updateProviderServiceRequest'){
  const user=await requireServiceProvider(tx,actor),[token,previous,next]=args as [string,'new'|'contacted'|'closed','new'|'contacted'|'closed'];
  if(!({new:['contacted','closed'],contacted:['closed'],closed:[]} as Record<string,string[]>)[previous].includes(next))throw conflict();
  const rows=(await tx.execute({sql:'SELECT r.reference,r.service_id FROM service_requests r JOIN service_provider_request_access a ON a.reference=r.reference JOIN service_provider_listings p ON p.service_id=r.service_id WHERE a.owner_id=? AND p.owner_id=?',args:[user.id,user.id]})).rows;
  const r=rows.find(r=>createHash('sha256').update(String(r.reference)+':provider').digest('hex')===token);if(!r)throw forbidden();
  const result=await tx.execute({sql:'UPDATE service_requests SET status=? WHERE reference=? AND status=?',args:[next,String(r.reference),previous]});if(!result.rowsAffected)throw conflict();await serviceProviderEvent(tx,user.id,user.id,String(r.service_id),'request_updated');
 }else if(action==='reviewServiceVerification'){
  const admin=await requireLivePermission(tx,actor,'platform.admin'),v=args[0] as z.infer<typeof serviceProviderSchemas.reviewServiceVerification>[0];
  const result=await tx.execute({sql:'UPDATE service_listings SET is_verified=?,version=version+1,updated_at=? WHERE id=? AND version=?',args:[Number(v.verified),new Date().toISOString(),v.serviceId,v.version]});if(!result.rowsAffected)throw conflict();
  await tx.execute({sql:'INSERT INTO service_verification_reviews VALUES(?,?,?,?,?,?)',args:[randomUUID(),v.serviceId,admin.id,Number(v.verified),v.evidence,new Date().toISOString()]});await serviceProviderEvent(tx,null,admin.id,v.serviceId,'verification_reviewed');
 }
 return {success:true};
}
