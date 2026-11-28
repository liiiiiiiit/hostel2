import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createClient } from '@libsql/client';
import { Database } from './database.js';
import { createApi } from './api.js';
import { imageIsReferenced } from './repository.js';
import { exportSnapshot,restoreSnapshot } from './backups.js';
import { serviceIntegrity } from './services.js';
import { servicesForPage } from './service-pages.js';
import { publicPage,sitemap } from './public-pages.js';
import { servicesText } from '../src/i18n/services.js';
import { addCalendarDays,yerevanToday } from '../src/utils/dates.js';
const translated=(value='Service')=>({fa:'خدمات '+value,en:value,ru:'Услуга '+value,hy:'Ծառայություն '+value});
async function fixture(t:TestContext){
 const dir=await mkdtemp(path.join(tmpdir(),'yh-services-')),url=`file:${dir}/test.db`,database=new Database({url,demo:true});await database.waitUntilReady();
 const server=createApi(database).listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 t.after(async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await database.close();await rm(dir,{recursive:true,force:true});});
 function client(){let cookie='';return {
  async request(route:string,method='GET',body?:unknown,extra:Record<string,string>={}){const response=await fetch(origin+route,{method,headers:{cookie,'Content-Type':'application/json','X-Requested-With':'YerevanHub','X-App-Language':'en',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return {response,data:await response.json()};},
  action(action:string,args:unknown[]){return this.request('/api/app','POST',{action,args});},
 };}
 const admin=client(),visitor=client();assert.equal((await admin.action('login',['admin@yerevanhub.com','Admin@2026'])).data.success,true);
 const categories=(await visitor.request('/api/service-categories')).data.categories;
 const listing=(overrides:Record<string,unknown>={})=>({id:crypto.randomUUID(),slug:'test-'+crypto.randomUUID(),categoryId:categories[0].id,version:0,isActive:true,isFeatured:false,isVerified:false,allowBookingRequest:true,title:translated(),shortDescription:translated('Short'),description:translated('Full description'),address:translated('Yerevan address'),workingHours:translated('09:00–18:00'),priceRange:translated('AMD'),coverImage:'https://example.test/cover.webp',gallery:['https://example.test/gallery.webp'],phone:'+37491123456',whatsapp:'+37491123456',telegram:'@example',instagram:'example',website:'https://example.test',city:'Yerevan',district:'Kentron',mapUrl:'https://yandex.com/maps/',latitude:40.18,longitude:44.51,languagesSpoken:['fa','hy'],highlights:[translated('Helpful staff')],...overrides});
 return {database,dir,url,server,origin,client,admin,visitor,categories,listing};
}
test('services migration adds only taxonomy, preserves every old row, is idempotent and does not resurrect deleted categories',async t=>{
 const {database}=await fixture(t);
 const tables=(await database.client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'service_%' AND name<>'module_migrations'")).rows.map(r=>String(r.name));
 const snapshot=new Map<string,string[]>();for(const table of tables){const r=await database.client.execute('SELECT * FROM "'+table+'"');snapshot.set(table,r.rows.map(row=>JSON.stringify(r.columns.map(c=>row[c]))).sort());}
 await database.sqlTransaction(async tx=>{await tx.execute('DROP TABLE service_requests');await tx.execute('DROP TABLE service_listings');await tx.execute('DROP TABLE service_categories');await tx.execute('DROP TABLE module_migrations');});
 const {migrateServices}=await import('./services.js');await migrateServices(database.client);await migrateServices(database.client);
 for(const [table,rows] of snapshot){const r=await database.client.execute('SELECT * FROM "'+table+'"');assert.deepEqual(r.rows.map(row=>JSON.stringify(r.columns.map(c=>row[c]))).sort(),rows,table);}
 assert.equal(Number((await database.client.execute('SELECT COUNT(*) AS n FROM service_categories')).rows[0].n),6);assert.equal(Number((await database.client.execute('SELECT COUNT(*) AS n FROM service_listings')).rows[0].n),0);
 await database.client.execute("DELETE FROM service_categories WHERE slug='other'");await migrateServices(database.client);assert.equal(Number((await database.client.execute('SELECT COUNT(*) AS n FROM service_categories')).rows[0].n),5);
 assert.equal((await database.client.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');
});
test('admin CRUD and paginated public filtering honor category activity, city, language, verification, feature and Unicode search',async t=>{
 const {admin,visitor,categories,listing,database}=await fixture(t);
 const a=listing({slug:'trusted-clinic',verificationEvidence:'SYNTHETIC supporting registry review',isVerified:true,isFeatured:true,title:translated('Здоровье Dental')}),b=listing({city:'Gyumri',languagesSpoken:['en']}),draft=listing({isActive:false});
 for(const item of [a,b,draft])assert.equal((await admin.request('/api/admin/services','POST',item)).data.success,true);
 let data=(await visitor.request('/api/services?featured=true&verified=true&language_spoken=fa&city=Yerevan')).data;assert.equal(data.total,1);assert.equal(data.items[0].id,a.id);
 assert.equal((await visitor.request('/api/services?featured=false')).data.total,1);
 assert.equal((await visitor.request('/api/services?search='+encodeURIComponent('ЗДОРОВЬЕ'))).data.total,1);
 assert.equal((await visitor.request('/api/services?category='+categories[0].slug+'&pageSize=1&page=2')).data.items.length,1);
 assert.equal((await visitor.request('/api/services?pageSize=999')).response.status,400);
 assert.equal((await visitor.request('/api/services/'+draft.slug)).response.status,404);
 assert.equal((await admin.request('/api/admin/services/'+a.id,'PUT',{...a,version:1,isFeatured:false})).data.success,true);
 assert.equal((await admin.request('/api/admin/services/'+a.id,'PUT',{...a,version:1})).response.status,409);
 const cat={...categories[0],isActive:false};assert.equal((await admin.request('/api/admin/service-categories/'+cat.id,'PUT',cat)).data.success,true);
 assert.equal((await visitor.request('/api/services')).data.total,0);assert.equal((await visitor.request('/api/services/'+a.slug)).response.status,404);
 assert.equal((await database.publicState()).services?.length,0);
});
test('only administrators can manage categories/listings or read private service inquiries',async t=>{
 const {admin,visitor,client,categories,listing}=await fixture(t);const service=listing();await admin.action('saveService',[service]);
 const actors=[visitor];const traveler=client();await traveler.action('registerTraveler',['Traveler','services-traveler@example.test',null,crypto.randomUUID()]);actors.push(traveler);
 const manager=client();await manager.action('login',['manager.kentron@yerevanhub.com','Hostel@2026']);actors.push(manager);
 for(const role of ['job_provider','tour_provider']){const email=role+'@services.test',password=crypto.randomUUID();await admin.action('saveProvider',[{name:role,email,password,role,phone:'',organization:'',isActive:true}]);const provider=client();await provider.action('login',[email,password]);actors.push(provider);}
 for(const actor of actors){
  assert.equal((await actor.request('/api/admin/services')).response.status,403);
  assert.equal((await actor.request('/api/admin/service-requests')).response.status,403);
  assert.equal((await actor.request('/api/admin/services','POST',listing())).response.status,403);
  assert.equal((await actor.action('saveServiceCategory',[{...categories[0],isActive:false}])).response.status,403);
  assert.equal((await actor.action('deleteService',[service.id,1])).response.status,403);
 }
 const forbidden=await admin.request('/api/admin/services','POST',listing(),{Origin:'https://evil.example'});assert.equal(forbidden.response.status,403);
});
test('guest service requests are idempotent, private, version-checked and retained when listings change',async t=>{
 const {admin,visitor,listing,database}=await fixture(t);const service=listing();await admin.action('saveService',[service]);
 const body={requestId:crypto.randomUUID(),version:1,name:'PRIVATE-APPLICANT',contact:'private@example.test',preferredDate:addCalendarDays(yerevanToday(),2),note:'PRIVATE-NOTE'};
 const pair=await Promise.all([visitor.request('/api/services/'+service.id+'/request','POST',body),visitor.request('/api/services/'+service.id+'/request','POST',body)]);
 assert(pair.every(r=>r.data.success));assert.equal(pair[0].data.serviceReference,pair[1].data.serviceReference);
 const reference=pair[0].data.serviceReference;
 assert.equal(Number((await database.client.execute('SELECT COUNT(*) AS n FROM service_requests')).rows[0].n),1);
 assert(!JSON.stringify(pair[0].data).includes('PRIVATE-APPLICANT'));assert(!JSON.stringify((await visitor.request('/api/app')).data).includes('PRIVATE-NOTE'));
 assert.equal((await visitor.request('/api/services/'+service.id+'/request','POST',{...body,note:'Changed'})).response.status,409);
 assert.equal((await admin.request('/api/admin/service-requests/'+reference,'PATCH',{previous:'new',status:'contacted'})).data.success,true);
 assert.equal((await admin.request('/api/admin/service-requests/'+reference,'PATCH',{previous:'new',status:'closed'})).response.status,409);
 assert.equal((await admin.action('deleteService',[service.id,1])).response.status,409);
 assert.equal((await admin.action('deleteServiceCategory',[service.categoryId,1])).response.status,409);
 assert.equal((await admin.action('saveService',[{...service,version:1,isActive:false,title:translated('Edited')}])).data.success,true);
 assert.equal((await visitor.request('/api/services/'+service.id+'/request','POST',{...body,requestId:crypto.randomUUID(),version:2})).response.status,404);
 const requests=(await admin.request('/api/admin/service-requests')).data.serviceRequests;assert.equal(requests[0].serviceTitle.en,'Service');assert.equal(requests[0].status,'contacted');
});
test('service validation rejects unsafe URLs, incomplete publication, invalid contacts, stale/disabled requests and excess requests',async t=>{
 const {admin,visitor,listing}=await fixture(t);
 for(const change of [{website:'javascript:alert(1)'},{telegram:'https://evil.test/'},{latitude:40,longitude:null},{title:{...translated(),hy:''}}])assert.equal((await admin.action('saveService',[listing(change)])).response.status,400);
 const service=listing({allowBookingRequest:false});await admin.action('saveService',[service]);
 const body={requestId:crypto.randomUUID(),version:1,name:'Guest',contact:'guest@example.test',note:'',preferredDate:''};
 assert.equal((await visitor.request('/api/services/'+service.id+'/request','POST',body)).response.status,409);
 assert.equal((await visitor.request('/api/services/'+service.id+'/request','POST',{...body,contact:'invalid'})).response.status,400);
 for(let i=0;i<3;i++)await visitor.request('/api/services/'+service.id+'/request','POST',{...body,requestId:crypto.randomUUID()});
 assert.equal((await visitor.request('/api/services/'+service.id+'/request','POST',body)).response.status,429);
});
test('service media references prevent cleanup and backup restoration preserves populated module rows',async t=>{
 const {admin,listing,database,dir}=await fixture(t);const service=listing();await admin.action('saveService',[service]);
 await database.sqlTransaction(async tx=>{assert(await imageIsReferenced(tx,service.coverImage));assert(await imageIsReferenced(tx,service.gallery[0]));assert.equal(await imageIsReferenced(tx,'https://example.test/unreferenced.webp'),false);});
 const snapshot=await exportSnapshot(database.client),target=createClient({url:`file:${dir}/restored.db`});t.after(()=>target.close());await restoreSnapshot(target,snapshot,path.join(dir,'restored-media'));
 for(const table of snapshot.tables.filter(t=>t.name.startsWith('service_')||t.name==='module_migrations')){const r=await target.execute('SELECT * FROM '+table.name);assert.deepEqual(r.rows.map(row=>JSON.stringify(table.columns.map(c=>row[c]))).sort(),table.rows.map(row=>JSON.stringify(row)).sort(),table.name);}
 assert.equal((await target.execute('PRAGMA foreign_key_check')).rows.length,0);assert.equal((await database.sqlTransaction(serviceIntegrity,'read')).ready,true);
});
test('deep services links and sitemap resolve services outside the homepage preview without exposing unpublished content',async t=>{
 const {admin,listing,database}=await fixture(t);const services=[];
 for(let i=0;i<8;i++){const s=listing({slug:'directory-'+i,title:translated(i===7?'<script>alert(1)</script>':'Service '+i)});services.push(s);await admin.action('saveService',[s]);}
 const initial=await database.publicState();assert.equal(initial.services?.length,6);
 const target=services.find(s=>!initial.services?.some(p=>p.id===s.id))!;
 const state=await servicesForPage(database,initial,'/en/services/'+target.slug);assert.equal(publicPage(state,'/en/services/'+target.slug,'https://example.test').status,200);
 const unsafe=await servicesForPage(database,initial,'/en/services/directory-7');assert(!publicPage(unsafe,'/en/services/directory-7','https://example.test').content.includes('<script>'));
 const map=sitemap(await servicesForPage(database,initial,'/sitemap.xml'),'https://example.test');for(const s of services)assert(map.includes('/en/services/'+s.slug));
});
test('all Services UI dictionary keys exist in Persian, English, Russian and Armenian',()=>{const keys=Object.keys(servicesText.en).sort();for(const language of ['fa','en','ru','hy'] as const){assert.deepEqual(Object.keys(servicesText[language]).sort(),keys);for(const value of Object.values(servicesText[language]))assert(value.trim().length);}});

test('unreferenced service/category deletion, duplicate slugs and concurrent edits use optimistic versions',async t=>{
 const {admin,categories,listing,database}=await fixture(t);
 const category={...categories[0],id:crypto.randomUUID(),slug:'temporary-category',version:0};
 assert.equal((await admin.action('saveServiceCategory',[category])).data.success,true);
 const service=listing({categoryId:category.id,slug:'temporary-service'});
 assert.equal((await admin.action('saveService',[service])).data.success,true);
 assert.equal((await admin.action('saveService',[{...listing(),slug:service.slug}])).response.status,409);
 const responses=await Promise.all([admin.action('saveService',[{...service,version:1,city:'Gyumri'}]),admin.action('saveService',[{...service,version:1,city:'Yerevan'}])]);
 assert.deepEqual(responses.map(r=>r.response.status).sort(),[200,409]);
 assert.equal((await admin.action('deleteService',[service.id,1])).response.status,409);
 assert.equal((await admin.action('deleteService',[service.id,2])).data.success,true);
 assert.equal((await admin.action('deleteServiceCategory',[category.id,1])).data.success,true);
 assert.equal((await database.client.execute({sql:'SELECT id FROM service_listings WHERE id=?',args:[service.id]})).rows.length,0);
});
