import type {Client,Transaction} from '@libsql/client';
import {randomUUID} from 'node:crypto';
export const serviceProviderSQL=[
 `CREATE TABLE IF NOT EXISTS service_provider_accounts(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,status TEXT NOT NULL CHECK(status IN ('active','suspended')),business_name TEXT NOT NULL,bio TEXT NOT NULL,city TEXT NOT NULL,version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS service_provider_listings(service_id TEXT PRIMARY KEY REFERENCES service_listings(id) ON DELETE RESTRICT,owner_id TEXT REFERENCES service_provider_accounts(user_id) ON DELETE RESTRICT,version INTEGER NOT NULL CHECK(version>0))`,
 `CREATE TABLE IF NOT EXISTS service_provider_request_access(reference TEXT PRIMARY KEY REFERENCES service_requests(reference) ON DELETE CASCADE,owner_id TEXT NOT NULL REFERENCES service_provider_accounts(user_id) ON DELETE RESTRICT)`,
 `CREATE TABLE IF NOT EXISTS service_provider_media(asset_id TEXT PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,service_id TEXT NOT NULL REFERENCES service_listings(id) ON DELETE RESTRICT,owner_id TEXT NOT NULL REFERENCES service_provider_accounts(user_id) ON DELETE RESTRICT)`,
 `CREATE TABLE IF NOT EXISTS service_verification_reviews(id TEXT PRIMARY KEY,service_id TEXT NOT NULL REFERENCES service_listings(id) ON DELETE RESTRICT,reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,verified INTEGER NOT NULL CHECK(verified IN (0,1)),evidence TEXT NOT NULL CHECK(length(evidence)>0 AND length(evidence)<=4000),created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS service_provider_events(id TEXT PRIMARY KEY,owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,service_id TEXT,kind TEXT NOT NULL,created_at TEXT NOT NULL)`,
 'CREATE INDEX IF NOT EXISTS service_provider_listings_owner ON service_provider_listings(owner_id,service_id)',
 'CREATE INDEX IF NOT EXISTS service_provider_requests_owner ON service_provider_request_access(owner_id,reference)',
 'CREATE INDEX IF NOT EXISTS service_provider_media_owner ON service_provider_media(owner_id,service_id)',
 'CREATE INDEX IF NOT EXISTS service_verification_service ON service_verification_reviews(service_id,created_at)',
 'CREATE INDEX IF NOT EXISTS service_provider_events_owner ON service_provider_events(owner_id,created_at)'
];
export async function serviceProvidersReady(db:Client|Transaction){
 const names=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name)));
 if(!names.has('module_migrations'))return false;
 for(const [table,required] of Object.entries({service_provider_accounts:'user_id status business_name bio city version created_at updated_at',service_provider_listings:'service_id owner_id version',service_provider_request_access:'reference owner_id',service_provider_media:'asset_id service_id owner_id',service_verification_reviews:'id service_id reviewer_id verified evidence created_at',service_provider_events:'id owner_id actor_id service_id kind created_at'})){
  if(!names.has(table))return false;
  const cols=new Set((await db.execute('PRAGMA table_info('+table+')')).rows.map(r=>String(r.name)));
  if(required.split(' ').some(c=>!cols.has(c)))return false;
 }
 const indexes=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r=>String(r.name)));
 return ['service_provider_listings_owner','service_provider_requests_owner','service_provider_media_owner','service_verification_service','service_provider_events_owner'].every(i=>indexes.has(i))&&!!(await db.execute("SELECT name FROM module_migrations WHERE name='service-provider-v1'")).rows.length;
}
export async function migrateServiceProviders(db:Client){
 const tx=await db.transaction('write');try{
  for(const sql of serviceProviderSQL)await tx.execute(sql);
  await tx.execute("INSERT OR IGNORE INTO module_migrations VALUES('service-provider-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
  if(!await serviceProvidersReady(tx))throw Error('Incomplete service provider schema');
  await tx.commit();
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export const serviceProviderVisible=(id:string)=>`NOT EXISTS(SELECT 1 FROM service_provider_listings sp LEFT JOIN service_provider_accounts a ON a.user_id=sp.owner_id LEFT JOIN users u ON u.id=a.user_id WHERE sp.service_id=${id} AND sp.owner_id IS NOT NULL AND (COALESCE(a.status,'suspended')!='active' OR COALESCE(u.is_active,0)!=1))`;
export async function serviceProviderEvent(tx:Transaction,ownerId:string|null,actorId:string|null,serviceId:string|null,kind:string){
 await tx.execute({sql:'INSERT INTO service_provider_events VALUES(?,?,?,?,?,?)',args:[randomUUID(),ownerId,actorId,serviceId,kind,new Date().toISOString()]});
}
export async function shareServiceRequest(tx:Transaction,reference:string,consent:boolean){
 if(!consent)return;
 await tx.execute({sql:"INSERT INTO service_provider_request_access SELECT r.reference,p.owner_id FROM service_requests r JOIN service_provider_listings p ON p.service_id=r.service_id JOIN service_provider_accounts a ON a.user_id=p.owner_id JOIN users u ON u.id=a.user_id WHERE r.reference=? AND a.status='active' AND u.is_active=1 ON CONFLICT(reference) DO NOTHING",args:[reference]});
}
