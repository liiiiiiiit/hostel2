import {z} from 'zod';
import type {Transaction} from '@libsql/client';
import type {User} from '../src/types/index.js';
import {adminModules,type AdminModule,type AdminQuery,type AdminRecords} from '../src/types/centralAdmin.js';
import type {ContentModule} from '../src/types/moderation.js';
import {requireLivePermission} from './authorization.js';
import {imageIsReferenced} from './repository.js';
export const adminQuery=z.object({module:z.enum(adminModules).default('users'),search:z.string().trim().max(120).default(''),status:z.string().max(50).default(''),page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20),sort:z.enum(['title','status','updatedAt','id']).default('updatedAt'),direction:z.enum(['asc','desc']).default('desc'),language:z.enum(['fa','en','ru','hy']).default('fa')}).strict();
export {adminWorkspaces as registryWorkspace} from '../src/types/centralAdmin.js';
export const moderationModules:Partial<Record<AdminModule,ContentModule>>={hostels:'hostel',rentals:'rental',jobs:'job',tours:'tour',services:'service',articles:'article',reviews:'review'};
// No caller controls SQL identifiers. Only these projections are selectable; no tokens, contacts, notes, CVs or credentials.
export function registrySQL(module:AdminModule,language:AdminQuery['language']){
 const tr=(field:string)=>`COALESCE(json_extract(${field},'$.${language}'),json_extract(${field},'$.en'),'')`;
 const properties=(kind:string)=>`SELECT p.id,COALESCE((SELECT value FROM property_translations t WHERE t.kind=p.kind AND t.property_id=p.id AND t.field IN ('title','name') ORDER BY t.language='${language}' DESC,t.language LIMIT 1),p.slug,p.id) AS title,COALESCE(m.status,CASE WHEN p.listing_status='published' OR p.is_published=1 THEN 'published' ELSE p.listing_status END,'draft') AS status,p.updated_at AS updatedAt,COALESCE(m.version,0) AS version FROM properties p LEFT JOIN content_moderation m ON m.module=p.kind AND m.content_id=p.id WHERE p.kind='${kind}'`;
 const moderated=(table:string,mod:string,title:string,date:string,legacy:string)=>`SELECT s.id,${title} AS title,COALESCE(m.status,${legacy}) AS status,${date} AS updatedAt,COALESCE(m.version,0) AS version FROM ${table} s LEFT JOIN content_moderation m ON m.module='${mod}' AND m.content_id=s.id`;
 switch(module){
 case 'users':case 'managers':return `SELECT id,name AS title,CASE WHEN is_active=1 THEN 'active' ELSE 'suspended' END AS status,created_at AS updatedAt,0 AS version FROM users ${module==='managers'?"WHERE role='hostel_manager'":''}`;
 case 'hostels':return properties('hostel');case 'rentals':return properties('rental');
 case 'rooms':return `SELECT r.hostel_id||':'||r.id AS id,COALESCE((SELECT value FROM room_translations t WHERE t.hostel_id=r.hostel_id AND t.room_id=r.id AND t.field='name' ORDER BY t.language='${language}' DESC,t.language LIMIT 1),r.type) AS title,'room_type' AS status,'' AS updatedAt,0 AS version FROM room_types r`;
 case 'bookings':return "SELECT id,hostel_name AS title,status,created_at AS updatedAt,0 AS version FROM bookings";
 case 'rentalOwners':return "SELECT a.user_id AS id,COALESCE(NULLIF(a.organization,''),u.name) AS title,a.status,a.updated_at AS updatedAt,a.version FROM rental_owner_accounts a JOIN users u ON u.id=a.user_id";
 case 'rentalInquiries':return 'SELECT id,property_title AS title,status,updated_at AS updatedAt,0 AS version FROM rental_inquiries';
 case 'employers':case 'tourProviders':return `SELECT u.id,COALESCE(NULLIF(p.organization,''),u.name) AS title,CASE WHEN u.is_active=1 THEN 'active' ELSE 'suspended' END AS status,u.created_at AS updatedAt,0 AS version FROM users u LEFT JOIN provider_accounts p ON p.user_id=u.id WHERE p.provider_role='${module==='employers'?'job_provider':'tour_provider'}' OR EXISTS(SELECT 1 FROM legacy_provider_access l WHERE l.user_id=u.id AND l.provider_role='${module==='employers'?'job_provider':'tour_provider'}')`;
 case 'seekers':return "SELECT user_id AS id,COALESCE(json_extract(profile_json,'$.headline'),'') AS title,'profile' AS status,updated_at AS updatedAt,version FROM job_seeker_profiles";
 case 'jobs':return moderated('job_postings','job','s.title','s.created_at',"CASE WHEN s.approved=1 THEN 'published' ELSE 'pending_review' END");
 case 'applications':return "SELECT a.reference AS id,j.title AS title,CASE WHEN l.withdrawn_at IS NOT NULL THEN 'withdrawn' WHEN a.status='reviewing' AND r.stage IS NOT NULL THEN r.stage ELSE a.status END AS status,a.submitted_at AS updatedAt,COALESCE(r.version,0) AS version FROM job_applications a JOIN job_postings j ON j.id=a.job_id LEFT JOIN account_job_applications l ON l.reference=a.reference LEFT JOIN recruitment_applications r ON r.reference=a.reference";
 case 'tours':return moderated('tour_listings','tour','s.title','s.created_at',"CASE WHEN s.published=1 AND s.approved=1 AND s.hidden=0 THEN 'published' ELSE 'draft' END");
 case 'tourBookings':return 'SELECT reference AS id,title,status,created_at AS updatedAt,0 AS version FROM tour_bookings';
 case 'serviceProviders':return 'SELECT user_id AS id,business_name AS title,status,updated_at AS updatedAt,version FROM service_provider_accounts';
 case 'services':return moderated('service_listings','service',tr('s.title_json'),'s.updated_at',"CASE WHEN s.is_active=1 THEN 'published' ELSE 'draft' END");
 case 'serviceRequests':return `SELECT reference AS id,${tr('title_json')} AS title,status,created_at AS updatedAt,0 AS version FROM service_requests`;
 case 'categories':return `SELECT id,${tr('name_json')} AS title,CASE WHEN is_active=1 THEN 'active' ELSE 'inactive' END AS status,'' AS updatedAt,version FROM service_categories`;
 case 'articles':return moderated('articles','article','s.title','s.updated_at','s.status');
 case 'translations':return "SELECT article_id||':'||language AS id,title,language AS status,'' AS updatedAt,0 AS version FROM article_translations";
 case 'reviews':return moderated('reviews','review',"substr(s.comment,1,160)",'s.created_at',"CASE WHEN s.status='approved' THEN 'published' WHEN s.status='rejected' THEN 'rejected' ELSE 'pending_review' END");
 case 'coupons':return "SELECT code AS id,description AS title,CASE WHEN active=1 THEN 'active' ELSE 'inactive' END AS status,'' AS updatedAt,0 AS version FROM coupons";
 case 'media':return "SELECT id,id AS title,backend AS status,created_at AS updatedAt,0 AS version,url AS imageUrl,bytes FROM media_assets";
 case 'activity':return `SELECT 'central:'||id AS id,kind AS title,module AS status,created_at AS updatedAt,0 AS version FROM admin_activity
 UNION ALL SELECT 'audit:'||id,action,target_type,timestamp,0 FROM audit_logs
 UNION ALL SELECT 'access:'||id,'access_updated','users',created_at,0 FROM authorization_events
 UNION ALL SELECT 'moderation:'||id,to_status,module,created_at,0 FROM moderation_events
 UNION ALL SELECT 'rental-owner:'||id,kind,'rentals',created_at,0 FROM rental_owner_events
 UNION ALL SELECT 'service-provider:'||id,kind,'services',created_at,0 FROM service_provider_events
 UNION ALL SELECT 'recruitment:'||id,kind,'jobs',created_at,0 FROM recruitment_events`;
 }
}
export const unicodePattern=(text:string)=>'*'+Array.from(text).map(ch=>{const lo=ch.toLocaleLowerCase(),up=ch.toLocaleUpperCase();return /^\p{L}$/u.test(ch)&&lo!==up&&Array.from(lo).length===1&&Array.from(up).length===1?'['+lo+up+']':({'*':'[*]','?':'[?]','[':'[[]',']':'[]]'}[ch]??ch);}).join('')+'*';
export async function adminRecords(tx:Transaction,actor:User|null,q:AdminQuery):Promise<AdminRecords>{
 await requireLivePermission(tx,actor,'platform.admin');const source=registrySQL(q.module,q.language),args:(string|number)[]=[];const clauses=[];
 if(q.search){clauses.push("(title||' '||id) GLOB ?");args.push(unicodePattern(q.search));}if(q.status){clauses.push('status=?');args.push(q.status);}const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
 const total=Number((await tx.execute({sql:'SELECT COUNT(*) AS n FROM ('+source+')'+where,args})).rows[0].n);
 const rows=(await tx.execute({sql:'SELECT * FROM ('+source+')'+where+' ORDER BY '+q.sort+' COLLATE NOCASE '+q.direction+',id '+q.direction+' LIMIT ? OFFSET ?',args:[...args,q.pageSize,(q.page-1)*q.pageSize]})).rows;
 const items=[];for(const r of rows){items.push({id:String(r.id),title:String(r.title??'').slice(0,250),status:String(r.status??''),updatedAt:String(r.updatedAt??''),version:Number(r.version),...(moderationModules[q.module]?{moderationModule:moderationModules[q.module]}:{}),...(q.module==='media'?{imageUrl:String(r.imageUrl),bytes:Number(r.bytes),referenced:await imageIsReferenced(tx,String(r.imageUrl))}:{})});}
 const statuses=(await tx.execute('SELECT DISTINCT status FROM ('+source+') WHERE status IS NOT NULL ORDER BY status LIMIT 50')).rows.map(r=>String(r.status));return {items,total,page:q.page,pageSize:q.pageSize,statuses,module:q.module};
}
export async function assertAdminTarget(tx:Transaction,module:AdminModule,id:string){if(!(await tx.execute({sql:'SELECT 1 FROM ('+registrySQL(module,'en')+') WHERE id=?',args:[id]})).rows.length)throw Error('اطلاعات واردشده معتبر نیست.');}
