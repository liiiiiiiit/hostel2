import type { Client, Transaction } from '@libsql/client';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ServiceCategory, ServiceListing, ServicePage, ServiceRequest, ServiceText } from '../src/types/services.js';
import type { User, AppLanguage } from '../src/types/index.js';
import { servicesText } from '../src/i18n/services.js';
import { imageUrl } from './property-schemas.js';
import { isTourPhone } from '../src/utils/tour-contact.js';
import { yerevanToday } from '../src/utils/dates.js';

export class ServiceError extends Error {
  constructor(readonly code:'conflict'|'duplicate'|'missing'|'referenced'|'invalid'|'unavailable'|'forbidden',readonly status=400){super(code);}
  localized(language:unknown){return servicesText[['fa','en','ru','hy'].includes(String(language))?language as AppLanguage:'fa'][this.code];}
}
const languages=['fa','en','ru','hy'] as const;
const localized=(max:number)=>z.object({fa:z.string().trim().max(max),en:z.string().trim().max(max),ru:z.string().trim().max(max),hy:z.string().trim().max(max)});
const slug=z.string().trim().min(1).max(160).regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u).transform(s=>s.toLowerCase());
const https=z.string().trim().max(2000).refine(v=>!v||URL.canParse(v)&&new URL(v).protocol==='https:'&&!new URL(v).username&&!new URL(v).password);
const optionalPhone=z.string().trim().max(60).refine(v=>!v||isTourPhone(v));
const handle=(host:string)=>z.string().trim().max(250).refine(v=>!v||/^@?[A-Za-z0-9_.]{1,64}$/.test(v)||URL.canParse(v)&&new URL(v).protocol==='https:'&&[host,'www.'+host].includes(new URL(v).hostname)&&!new URL(v).username&&!new URL(v).password);
export const categoryInput=z.object({id:z.uuid(),slug,icon:z.enum(['medical','dining','legal','wellness','finance','other']),order:z.number().int().min(0).max(10000),isActive:z.boolean(),name:localized(120).refine(v=>languages.every(l=>v[l].length>0)),version:z.number().int().nonnegative()});
export const serviceInput=z.object({
  id:z.uuid(),slug,categoryId:z.uuid(),version:z.number().int().nonnegative(),isActive:z.boolean(),isFeatured:z.boolean(),isVerified:z.boolean(),allowBookingRequest:z.boolean(),
  title:localized(160),shortDescription:localized(350),description:localized(12000),address:localized(1000),workingHours:localized(500),priceRange:localized(250),
  coverImage:z.union([z.literal(''),imageUrl]),gallery:z.array(imageUrl).max(20),phone:optionalPhone,whatsapp:optionalPhone,telegram:handle('t.me'),instagram:handle('instagram.com'),website:https,
  city:z.string().trim().max(120),district:z.string().trim().max(160),mapUrl:https,
  latitude:z.number().finite().min(-85.05112878).max(85.05112878).nullable(),longitude:z.number().finite().min(-180).max(180).nullable(),
  languagesSpoken:z.array(z.enum(languages)).max(4).refine(a=>new Set(a).size===a.length),highlights:z.array(localized(200)).max(20),
}).refine(v=>(v.latitude===null)===(v.longitude===null),'Coordinates must be paired').refine(v=>!v.isActive||!!v.city&&languages.every(l=>[v.title,v.shortDescription,v.description,v.address,v.workingHours].every(f=>!!f[l])),'Publication content is incomplete');
export const serviceRequestInput=z.object({requestId:z.uuid(),serviceId:z.uuid(),version:z.number().int().positive(),name:z.string().trim().min(1).max(120),contact:z.string().trim().max(250).refine(v=>z.email().safeParse(v).success||isTourPhone(v)),preferredDate:z.union([z.literal(''),z.iso.date().refine(v=>v>=yerevanToday())]).default(''),note:z.string().trim().max(2000).default('')});
export const requestStatus=z.enum(['new','contacted','closed']);
export const serviceActionSchemas={saveService:z.tuple([serviceInput]),deleteService:z.tuple([z.uuid(),z.number().int().positive()]),saveServiceCategory:z.tuple([categoryInput]),deleteServiceCategory:z.tuple([z.uuid(),z.number().int().positive()]),requestService:z.tuple([serviceRequestInput]),updateServiceRequest:z.tuple([z.uuid(),requestStatus,requestStatus])};
export const serviceSchemaSQL=[
 `CREATE TABLE IF NOT EXISTS module_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS service_categories(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,icon TEXT NOT NULL,sort_order INTEGER NOT NULL,is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),name_json TEXT NOT NULL CHECK(json_valid(name_json)),version INTEGER NOT NULL DEFAULT 1 CHECK(version>0))`,
 `CREATE TABLE IF NOT EXISTS service_listings(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),is_featured INTEGER NOT NULL CHECK(is_featured IN (0,1)),is_verified INTEGER NOT NULL CHECK(is_verified IN (0,1)),allow_booking_request INTEGER NOT NULL CHECK(allow_booking_request IN (0,1)),title_json TEXT NOT NULL CHECK(json_valid(title_json)),short_description_json TEXT NOT NULL CHECK(json_valid(short_description_json)),description_json TEXT NOT NULL CHECK(json_valid(description_json)),address_json TEXT NOT NULL CHECK(json_valid(address_json)),working_hours_json TEXT NOT NULL CHECK(json_valid(working_hours_json)),price_range_json TEXT NOT NULL CHECK(json_valid(price_range_json)),cover_image TEXT NOT NULL,gallery_json TEXT NOT NULL CHECK(json_valid(gallery_json)),phone TEXT NOT NULL,whatsapp TEXT NOT NULL,telegram TEXT NOT NULL,instagram TEXT NOT NULL,website TEXT NOT NULL,city TEXT NOT NULL,district TEXT NOT NULL,map_url TEXT NOT NULL,latitude REAL,longitude REAL,languages_json TEXT NOT NULL CHECK(json_valid(languages_json)),highlights_json TEXT NOT NULL CHECK(json_valid(highlights_json)),search_text TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,CHECK((latitude IS NULL)=(longitude IS NULL)))`,
 `CREATE TABLE IF NOT EXISTS service_requests(reference TEXT PRIMARY KEY,request_id TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,service_id TEXT NOT NULL REFERENCES service_listings(id) ON DELETE RESTRICT,title_json TEXT NOT NULL CHECK(json_valid(title_json)),name TEXT NOT NULL,contact TEXT NOT NULL,preferred_date TEXT NOT NULL,note TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('new','contacted','closed')),created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS service_listings_public ON service_listings(is_active,is_featured,category_id,updated_at)`,
 `CREATE INDEX IF NOT EXISTS service_listings_city ON service_listings(city,is_active)`,
 `CREATE INDEX IF NOT EXISTS service_listings_cover ON service_listings(cover_image)`,
 `CREATE INDEX IF NOT EXISTS service_requests_listing ON service_requests(service_id,status,created_at)`,
];
export async function migrateServices(client:Client){
 const tx=await client.transaction('write');try{
  for(const sql of serviceSchemaSQL)await tx.execute(sql);
  if(!(await tx.execute("SELECT name FROM module_migrations WHERE name='services-v1'")).rows.length){
   for(const [index,key] of (['medical','dining','legal','wellness','finance','other'] as const).entries()){
    const name=Object.fromEntries(languages.map(lang=>[lang,servicesText[lang][key]]));
    await tx.execute({sql:'INSERT OR IGNORE INTO service_categories(id,slug,icon,sort_order,is_active,name_json) VALUES(?,?,?,?,1,?)',args:[`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,key,key,index,JSON.stringify(name)]});
   }
   await tx.execute({sql:"INSERT INTO module_migrations VALUES('services-v1',?)",args:[new Date().toISOString()]});
  }
  await tx.commit();
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
function requireAdmin(actor:User|null){if(actor?.role!=='admin'||!actor.isActive)throw new ServiceError('forbidden',403);}
const parse=<T>(value:unknown)=>JSON.parse(String(value)) as T;
function listing(row:Record<string,unknown>):ServiceListing{return {
 id:String(row.id),slug:String(row.slug),categoryId:String(row.category_id),version:Number(row.version),isActive:!!row.is_active,isFeatured:!!row.is_featured,isVerified:!!row.is_verified,allowBookingRequest:!!row.allow_booking_request,
 title:parse(row.title_json),shortDescription:parse(row.short_description_json),description:parse(row.description_json),address:parse(row.address_json),workingHours:parse(row.working_hours_json),priceRange:parse(row.price_range_json),
 coverImage:String(row.cover_image),gallery:parse(row.gallery_json),phone:String(row.phone),whatsapp:String(row.whatsapp),telegram:String(row.telegram),instagram:String(row.instagram),website:String(row.website),city:String(row.city),district:String(row.district),mapUrl:String(row.map_url),latitude:row.latitude===null?null:Number(row.latitude),longitude:row.longitude===null?null:Number(row.longitude),languagesSpoken:parse(row.languages_json),highlights:parse(row.highlights_json),createdAt:String(row.created_at),updatedAt:String(row.updated_at),
};}
export async function serviceCategories(tx:Transaction,admin=false):Promise<ServiceCategory[]>{return(await tx.execute(`SELECT * FROM service_categories ${admin?'':'WHERE is_active=1'} ORDER BY sort_order,slug`)).rows.map(r=>({id:String(r.id),slug:String(r.slug),icon:String(r.icon),order:Number(r.sort_order),isActive:!!r.is_active,name:parse(r.name_json),version:Number(r.version)}));}
const boolQuery=z.enum(['true','false','1','0']).transform(v=>v==='true'||v==='1');
export const serviceQuery=z.object({category:z.string().trim().max(160).optional(),city:z.string().trim().max(120).optional(),language_spoken:z.enum(languages).optional(),search:z.string().trim().max(160).optional(),featured:boolQuery.optional(),verified:boolQuery.optional(),page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(48).default(12)});
export async function searchServices(tx:Transaction,query:z.infer<typeof serviceQuery>):Promise<ServicePage>{
 const clauses=['s.is_active=1','c.is_active=1'],args:(string|number)[]=[];
 if(query.category){clauses.push('(c.slug=? OR c.id=?)');args.push(query.category,query.category);}
 if(query.city){clauses.push('s.city=? COLLATE NOCASE');args.push(query.city);}
 if(query.language_spoken){clauses.push('EXISTS(SELECT 1 FROM json_each(s.languages_json) WHERE value=?)');args.push(query.language_spoken);}
 if(query.search){clauses.push('instr(s.search_text,?)>0');args.push(query.search.normalize('NFKC').toLocaleLowerCase());}
 for(const [field,value] of [['is_featured',query.featured],['is_verified',query.verified]] as const)if(value!==undefined){clauses.push('s.'+field+'=?');args.push(Number(value));}
 const from='FROM service_listings s JOIN service_categories c ON c.id=s.category_id WHERE '+clauses.join(' AND ');
 const total=Number((await tx.execute({sql:'SELECT COUNT(*) AS n '+from,args})).rows[0].n);
 const rows=(await tx.execute({sql:'SELECT s.* '+from+' ORDER BY s.is_featured DESC,s.updated_at DESC,s.id LIMIT ? OFFSET ?',args:[...args,query.pageSize,(query.page-1)*query.pageSize]})).rows;
 return {items:rows.map(listing),total,page:query.page,pageSize:query.pageSize};
}
export async function getService(tx:Transaction,slugOrId:string):Promise<ServiceListing>{
 const row=(await tx.execute({sql:'SELECT s.* FROM service_listings s JOIN service_categories c ON c.id=s.category_id WHERE (s.slug=? OR s.id=?) AND s.is_active=1 AND c.is_active=1',args:[slugOrId,slugOrId]})).rows[0];
 if(!row)throw new ServiceError('missing',404);return listing(row);
}
export async function serviceCities(tx:Transaction){return(await tx.execute('SELECT DISTINCT s.city FROM service_listings s JOIN service_categories c ON s.category_id=c.id WHERE s.is_active=1 AND c.is_active=1 ORDER BY s.city')).rows.map(r=>String(r.city));}
export async function servicesState(tx:Transaction,actor:User|null){
 const admin=actor?.role==='admin';
 const services=admin?(await tx.execute('SELECT * FROM service_listings ORDER BY updated_at DESC,id')).rows.map(listing):(await searchServices(tx,{page:1,pageSize:6})).items;
 const serviceRequests:ServiceRequest[]=admin?(await tx.execute('SELECT * FROM service_requests ORDER BY created_at DESC,reference')).rows.map(r=>({reference:String(r.reference),serviceId:String(r.service_id),serviceTitle:parse(r.title_json),name:String(r.name),contact:String(r.contact),preferredDate:String(r.preferred_date),note:String(r.note),status:r.status as ServiceRequest['status'],createdAt:String(r.created_at)})):[];
 return {services,serviceCategories:await serviceCategories(tx,admin),serviceRequests};
}
async function uniqueSlug(tx:Transaction,table:'service_categories'|'service_listings',id:string,value:string){if((await tx.execute({sql:'SELECT id FROM '+table+' WHERE slug=? AND id<>?',args:[value,id]})).rows.length)throw new ServiceError('duplicate',409);}
export async function serviceAction(tx:Transaction,actor:User|null,action:keyof typeof serviceActionSchemas,args:unknown[]){
 if(action==='requestService'){
  const input=args[0] as z.infer<typeof serviceRequestInput>,fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous=(await tx.execute({sql:'SELECT reference,fingerprint FROM service_requests WHERE request_id=?',args:[input.requestId]})).rows[0];
  if(previous){if(previous.fingerprint!==fingerprint)throw new ServiceError('conflict',409);return {success:true,serviceReference:String(previous.reference)};}
  const service=await getService(tx,input.serviceId);if(!service.allowBookingRequest||service.version!==input.version)throw new ServiceError('unavailable',409);
  const reference=randomUUID();await tx.execute({sql:"INSERT INTO service_requests VALUES(?,?,?,?,?,?,?,?,?,'new',?)",args:[reference,input.requestId,fingerprint,service.id,JSON.stringify(service.title),input.name,input.contact,input.preferredDate,input.note,new Date().toISOString()]});
  return {success:true,serviceReference:reference};
 }
 requireAdmin(actor);
 if(action==='saveServiceCategory'){
  const input=args[0] as z.infer<typeof categoryInput>;await uniqueSlug(tx,'service_categories',input.id,input.slug);
  const values=[input.slug,input.icon,input.order,Number(input.isActive),JSON.stringify(input.name)];
  const result=input.version===0?await tx.execute({sql:'INSERT INTO service_categories(id,slug,icon,sort_order,is_active,name_json) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',args:[input.id,...values]}):await tx.execute({sql:'UPDATE service_categories SET slug=?,icon=?,sort_order=?,is_active=?,name_json=?,version=version+1 WHERE id=? AND version=?',args:[...values,input.id,input.version]});
  if(!result.rowsAffected)throw new ServiceError('conflict',409);
 }else if(action==='saveService'){
  const input=args[0] as z.infer<typeof serviceInput>;await uniqueSlug(tx,'service_listings',input.id,input.slug);
  if(!(await tx.execute({sql:'SELECT id FROM service_categories WHERE id=?',args:[input.categoryId]})).rows.length)throw new ServiceError('missing',404);
  const jsonFields=['title','shortDescription','description','address','workingHours','priceRange'] as const;
  const values=[input.slug,input.categoryId,...[input.isActive,input.isFeatured,input.isVerified,input.allowBookingRequest].map(Number),...jsonFields.map(k=>JSON.stringify(input[k])),input.coverImage,JSON.stringify(input.gallery),input.phone,input.whatsapp,input.telegram,input.instagram,input.website,input.city,input.district,input.mapUrl,input.latitude,input.longitude,JSON.stringify(input.languagesSpoken),JSON.stringify(input.highlights),[...jsonFields.flatMap(k=>Object.values(input[k])),input.city,input.district,...input.highlights.flatMap(v=>Object.values(v))].join(' ').normalize('NFKC').toLocaleLowerCase()];
  const columns='slug,category_id,is_active,is_featured,is_verified,allow_booking_request,title_json,short_description_json,description_json,address_json,working_hours_json,price_range_json,cover_image,gallery_json,phone,whatsapp,telegram,instagram,website,city,district,map_url,latitude,longitude,languages_json,highlights_json,search_text'.split(',');
  const now=new Date().toISOString();
  const result=input.version===0?await tx.execute({sql:`INSERT INTO service_listings(id,${columns.join(',')},created_at,updated_at) VALUES(${Array(values.length+3).fill('?').join(',')}) ON CONFLICT(id) DO NOTHING`,args:[input.id,...values,now,now]}):await tx.execute({sql:`UPDATE service_listings SET ${columns.map(c=>c+'=?').join(',')},updated_at=?,version=version+1 WHERE id=? AND version=?`,args:[...values,now,input.id,input.version]});
  if(!result.rowsAffected)throw new ServiceError('conflict',409);
 }else if(action==='deleteService'||action==='deleteServiceCategory'){
  const table=action==='deleteService'?'service_listings':'service_categories';
  const references=action==='deleteService'?'SELECT 1 FROM service_requests WHERE service_id=?':'SELECT 1 FROM service_listings WHERE category_id=?';
  if((await tx.execute({sql:references,args:[String(args[0])]})).rows.length)throw new ServiceError('referenced',409);
  if(!(await tx.execute({sql:'DELETE FROM '+table+' WHERE id=? AND version=?',args:[String(args[0]),Number(args[1])]})).rowsAffected)throw new ServiceError('conflict',409);
 }else if(action==='updateServiceRequest'){
  if(!(await tx.execute({sql:'UPDATE service_requests SET status=? WHERE reference=? AND status=?',args:[String(args[2]),String(args[0]),String(args[1])]})).rowsAffected)throw new ServiceError('conflict',409);
 }
 return {success:true};
}

export async function serviceIntegrity(tx:Transaction){
 const required={service_categories:'id slug icon sort_order is_active name_json version',service_listings:'id slug category_id is_active is_featured is_verified allow_booking_request title_json short_description_json description_json address_json working_hours_json price_range_json cover_image gallery_json phone whatsapp telegram instagram website city district map_url latitude longitude languages_json highlights_json search_text version created_at updated_at',service_requests:'reference request_id fingerprint service_id title_json name contact preferred_date note status created_at'};
 const existing=new Set((await tx.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name)));
 const missingTables:string[]=[],missingColumns:string[]=[];const counts:Record<string,number>={};
 for(const [table,columns] of Object.entries(required)){
  if(!existing.has(table)){missingTables.push(table);continue;}
  const present=new Set((await tx.execute('PRAGMA table_info('+table+')')).rows.map(r=>String(r.name)));
  for(const column of columns.split(' '))if(!present.has(column))missingColumns.push(table+'.'+column);
  counts[table]=Number((await tx.execute('SELECT COUNT(*) AS n FROM '+table)).rows[0].n);
 }
 const indexes=new Set((await tx.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r=>String(r.name)));
 const missingIndexes=['service_listings_public','service_listings_city','service_listings_cover','service_requests_listing'].filter(name=>!indexes.has(name));
 const migrated=existing.has('module_migrations')&&(await tx.execute("SELECT name FROM module_migrations WHERE name='services-v1'")).rows.length>0;
 return {ready:!!migrated&&!missingTables.length&&!missingColumns.length&&!missingIndexes.length,migrated,missingTables,missingColumns,missingIndexes,counts};
}
