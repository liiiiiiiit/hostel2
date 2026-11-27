import sharp from 'sharp';
import {completeRental} from './property-fixtures.js';
import {rentalOwnerAction,rentalOwnerState,ownerQuery} from './rental-owners.js';
import {migrateRentalOwners,rentalOwnersReady} from './rental-owner-storage.js';
import {moderationDetail,moderateContent} from './moderation.js';
import {rentalOwnerText} from '../src/i18n/rentalOwner.js';
import {can} from '../src/utils/authorization.js';
import {routeHash,parseRoute} from '../src/utils/navigation.js';
import {readFile} from 'node:fs/promises';
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@libsql/client';
import { Database } from './database.js';
import { createApi } from './api.js';
import { saveJob, jobInput } from './job-postings.js';
import { applicationInput, applyForJob, reviewApplication } from './job-applications.js';
import { syntheticResume } from './resume-fixtures.js';
import { recruitmentAction, recruitmentQuery, recruitmentState } from './recruitment.js';
import { recruitmentReady, migrateRecruitment } from './recruitment-storage.js';
import { pendingMigrations, guardMigrations } from './persistence.js';
import { exportSnapshot, restoreSnapshot } from './backups.js';
import { createVerifiedBackup, verifyBackup, snapshotFingerprint } from './backup-files.js';
import { recruitmentText } from '../src/i18n/recruitment.js';
import type { User } from '../src/types/index.js';
async function fixture(t: TestContext) {
    const root = await mkdtemp('/tmp/yh-seeker-'), env = { ...process.env };
    Object.assign(process.env, { APP_ENV: 'testing', NODE_ENV: 'test', DATABASE_URL: 'file:' + root + '/db.sqlite', MEDIA_STORAGE: 'local', MEDIA_DIRECTORY: root + '/uploads', BACKUP_DIRECTORY: root + '/backups', BACKUP_ENCRYPTION_KEY: randomBytes(32).toString('base64'), PERSISTENT_STORAGE_MODE: '', REQUIRE_MIGRATION_BACKUP: '', DEMO_TOOLS_ENABLED: 'false', NOTIFICATION_DELIVERY: 'disabled', RESEND_API_KEY: '', NOTIFICATION_FROM: '', TELEGRAM_BOT_TOKEN: '', GEMINI_API_KEY: '', BLOB_READ_WRITE_TOKEN: '', APP_URL: 'http://127.0.0.1' });
    const password = randomUUID(), db = new Database({ demo: false, adminEmail: 'admin@example.test', adminPassword: password });
    await db.waitUntilReady();
    const server = createApi(db).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + (server.address() as {
        port: number;
    }).port;
    t.after(async () => {
        server.closeAllConnections();
        await new Promise<void>(r => server.close(() => r()));
        await db.close();
        for (const k of Object.keys(process.env))
            if (!(k in env))
                delete process.env[k];
        Object.assign(process.env, env);
        await rm(root, { recursive: true, force: true });
    });
    function client() {
        let cookie = '';
        return { get cookie() { return cookie; }, async request(path: string, init: RequestInit = {}) { return fetch(origin + path, { ...init, headers: { Cookie: cookie, 'X-Requested-With': 'YerevanHub', ...init.headers } }); }, async get(path = '/api/job-seeker') { const r = await this.request(path); return { status: r.status, data: await r.json() }; }, async action(action: string, args: unknown[]) {
                const r = await this.request('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) });
                if (r.headers.get('set-cookie'))
                    cookie = r.headers.get('set-cookie')!.split(';')[0];
                return { status: r.status, data: await r.json() };
            }, async upload(bytes = syntheticResume(), name = 'resume.pdf', mime = 'application/pdf') { return this.request('/api/job-seeker/documents', { method: 'POST', headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(name) }, body: bytes }); } };
    }
    const admin = client();
    assert.equal((await admin.action('login', ['admin@example.test', password])).data.success, true);
    const adminUser = (await admin.get('/api/app')).data.state.currentUser as User;
    async function traveler() { const c = client(), email = randomUUID() + '@example.test'; const result = await c.action('registerTraveler', ['Synthetic seeker', email, '', password]); assert.equal(result.data.success, true, result.data.error); return { c, user: result.data.state.currentUser as User }; }
    async function job(owner = adminUser) { const value = jobInput.parse({ id: randomUUID(), version: 0, title: 'Synthetic role', company: 'Fictional company', location: 'Yerevan', schedule: 'Full time', description: 'Synthetic job only', contact: 'jobs@example.test', salary: 200000, period: 'month', status: 'open' }); await db.sqlTransaction(tx => saveJob(tx, owner, value)); return { ...value, version: 1 }; }
    const input = (jobId: string, extra = {}) => applicationInput.parse({ requestId: randomUUID(), jobId, version: 1, name: 'Synthetic seeker', contact: 'seeker@example.test', message: 'Fictional application', ...extra });
    return { root, db, admin, adminUser, client, traveler, job, input, password };
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function owner(f:Fixture,status:'active'|'suspended'='active'){
 const input={version:0,name:'SYNTHETIC rental owner',email:randomUUID()+'@example.test',password:f.password,phone:'',organization:'Synthetic agency',bio:'Fictional owner',city:'Yerevan',status};
 const r=await f.admin.action('saveRentalOwnerAccount',[input]);assert.equal(r.data.success,true,r.data.error);
 const account=(await f.admin.get('/api/admin/rental-owners')).data.accounts.find(a=>a.email===input.email),c=f.client();assert.equal((await c.action('login',[input.email,f.password])).data.success,true);
 return {input,account,c,user:(await c.get('/api/app')).data.state.currentUser as User};
}
async function draft(f:Fixture,o:Awaited<ReturnType<typeof owner>>){
 const p={...completeRental(),landlordInternalNotes:'',verifiedBadge:false,verifiedExplanation:'',lastCheckedAt:'',photos:[],media:[],status:'draft' as const,propertyType:'room' as const};
 const r=await o.c.action('saveOwnerRental',[{property:p,mode:'draft',expectedUpdatedAt:null}]);assert.equal(r.data.success,true,r.data.error);return r.data.rental;
}
async function submit(f:Fixture,o:Awaited<ReturnType<typeof owner>>){
 let p=await draft(f,o);const bytes=await sharp({create:{width:12,height:12,channels:3,background:'#123456'}}).png().toBuffer();
 const response=await o.c.request('/api/rental-owner/media?propertyId='+p.id,{method:'POST',headers:{'Content-Type':'image/png'},body:bytes});assert.equal(response.status,201);const image=(await response.json()).image;image.alt={fa:'عکس آزمایشی',en:'Synthetic photo',ru:'Тестовое фото',hy:'Փորձնական լուսանկար'};
 const saved=await o.c.action('saveOwnerRental',[{property:{...p,media:[image],photos:[image.url]},mode:'pending_review',expectedUpdatedAt:p.updatedAt}]);assert.equal(saved.data.success,true,saved.data.error);p=saved.data.rental;
 return {p,image,bytes};
}
async function publishRental(f:Fixture,id:string){const m=await f.db.sqlTransaction(tx=>moderationDetail(tx,f.adminUser,'rental',id),'read');await f.db.sqlTransaction(tx=>moderateContent(tx,f.adminUser,{targets:[{module:'rental',id,version:m.version,contentVersion:m.contentVersion}],status:'published',note:'SYNTHETIC review',confirmed:true}));}
async function inquiry(f:Fixture,id:string,shareWithOwner:boolean){const c=f.client();const r=await c.action('createRentalInquiry',[{propertyId:id,guestName:'SYNTHETIC tenant',contact:'tenant@example.test',requestType:'rent',desiredStartDate:new Date(Date.now()+86400000*3).toISOString().slice(0,10),desiredDurationText:'1 month',residentsCount:1,notes:'SYNTHETIC tenant note',shareWithOwner}]);assert.equal(r.data.success,true,r.data.error);return r.data.inquiry;}
test('admin-created and explicitly authorized accounts preserve identity/credentials, coexist with other capabilities and revoke sessions',async t=>{
 const f=await fixture(t),traveler=await f.traveler(),old=(await f.db.client.execute({sql:'SELECT hash FROM user_credentials WHERE user_id=?',args:[traveler.user.id]})).rows[0];
 assert.equal((await traveler.c.action('grantRentalOwner',[{userId:traveler.user.id,status:'active',reason:'forged'}])).status,403);
 assert.equal((await f.admin.action('grantRentalOwner',[{userId:traveler.user.id,status:'active',reason:'Verified owner authorization'}])).data.success,true);
 assert.equal((await traveler.c.get('/api/rental-owner')).status,403);
 await traveler.c.action('login',[traveler.user.email,f.password]);
 const user=(await traveler.c.get('/api/app')).data.state.currentUser as User;
 assert.equal(user.id,traveler.user.id);assert.equal(user.role,'traveler');assert.equal(user.rentalOwnerAuthorized,true);assert(can(user,'account.self'));assert(can(user,'rentals.manage'));assert(!can(user,'platform.admin'));
 assert.equal((await f.db.client.execute({sql:'SELECT hash FROM user_credentials WHERE user_id=?',args:[user.id]})).rows[0].hash===old.hash,true);
 const a=(await f.admin.get('/api/admin/rental-owners')).data.accounts.find(x=>x.userId===user.id),newPassword=randomUUID();
 assert.equal((await f.admin.action('saveRentalOwnerAccount',[{id:user.id,version:a.version,name:a.name,email:a.email,phone:a.phone,organization:a.organization,bio:a.bio,city:a.city,status:'active',password:newPassword}])).data.success,true);
 assert.equal((await traveler.c.get('/api/rental-owner')).status,403);
 assert.equal((await f.client().action('login',[user.email,f.password])).data.success,false);
 const fresh=f.client();assert.equal((await fresh.action('login',[user.email,newPassword])).data.success,true);
 assert.equal((await fresh.get('/api/admin/rental-owners')).status,403);
});
test('owner draft/upload/submission/admin publication uses shared rentals; consented inquiries are private and status changes persist',async t=>{
 const f=await fixture(t),o=await owner(f),{p,image}=await submit(f,o);
 assert.equal(p.moderationStatus,'pending_review');assert(!(await f.db.publicState()).rentals.some(r=>r.id===p.id));
 assert.equal((await o.c.action('saveRental',[p])).status,403);
 assert.equal((await o.c.action('moderateContent',[{targets:[{module:'rental',id:p.id,version:0,contentVersion:'0'.repeat(64)}],status:'published',note:'forged',confirmed:true}])).status,403);
 await publishRental(f,p.id);
 const publicRental=(await f.db.publicState()).rentals.find(r=>r.id===p.id)!;
 assert.equal(publicRental.propertyType,'room');assert.equal(publicRental.addressExactInternal,'');assert.equal(publicRental.landlordInternalNotes,'');assert.equal(publicRental.verifiedBadge,false);assert.equal(publicRental.ownerRequestsEnabled,true);
 const shared=await inquiry(f,p.id,true),privateRequest=await inquiry(f,p.id,false);
 await f.admin.action('updateRentalInquiryStatus',[shared.id,'pending_review','PRIVATE-ADMIN-NOTE']);
 let data=(await o.c.get('/api/rental-owner')).data;
 assert.equal(data.totalInquiries,1);assert.equal(data.inquiries[0].id,shared.id);assert(!JSON.stringify(data).includes('PRIVATE-ADMIN-NOTE'));assert(!JSON.stringify(data).includes(shared.privateToken));assert(!JSON.stringify(data).includes(shared.trackingCode));assert(!data.inquiries.some(i=>i.id===privateRequest.id));
 assert.equal((await o.c.action('updateOwnerInquiry',[privateRequest.id,privateRequest.updatedAt,'pending_review','coordinating'])).status,403);
 const i=data.inquiries[0];assert.equal((await o.c.action('updateOwnerInquiry',[i.id,i.updatedAt,i.status,'coordinating'])).data.success,true);
 assert.equal((await o.c.action('updateOwnerInquiry',[i.id,i.updatedAt,i.status,'coordinating'])).data.success,false);
 assert.equal((await f.admin.get('/api/app')).data.state.rentalInquiries.find(x=>x.id===i.id).adminNotes,'PRIVATE-ADMIN-NOTE');
 const db2=new Database({url:process.env.DATABASE_URL});await db2.waitUntilReady();try{const reopened=await db2.sqlTransaction(tx=>rentalOwnerState(tx,o.user,ownerQuery.parse({})),'read');assert.equal(reopened.inquiries[0].status,'coordinating');assert.equal(reopened.properties[0].addressExactInternal,p.addressExactInternal);}finally{await db2.close();}
 const backup=await createVerifiedBackup(f.db.client,f.root+'/recovery',process.env.BACKUP_ENCRYPTION_KEY!),target=createClient({url:'file:'+f.root+'/recover.db'});
 try{await restoreSnapshot(target,(await verifyBackup(backup.file,process.env.BACKUP_ENCRYPTION_KEY!)).snapshot,f.root+'/restored-images');assert.equal(await rentalOwnersReady(target),true);assert.equal((await target.execute('SELECT COUNT(*) AS n FROM rental_owner_inquiry_access')).rows[0].n,1);assert.equal((await target.execute('PRAGMA foreign_key_check')).rows.length,0);assert.deepEqual(await readFile(f.root+'/restored-images/'+image.id+'.webp'),await readFile(f.root+'/uploads/'+image.id+'.webp'));}finally{target.close();}
});
test('owners cannot read/edit another property, forge verification/internal notes/commission or attach/delete unrelated images',async t=>{
 const f=await fixture(t),a=await owner(f),b=await owner(f),{p,image}=await submit(f,a),other=await draft(f,b);
 assert.equal((await b.c.action('saveOwnerRental',[{property:p,mode:'draft',expectedUpdatedAt:p.updatedAt}])).status,403);
 for(const patch of [{verifiedBadge:true},{landlordInternalNotes:'FORGED'},{commissionType:'standard_commission',commissionAmountText:'FORGED'}])assert.equal((await a.c.action('saveOwnerRental',[{property:{...p,...patch},mode:'draft',expectedUpdatedAt:p.updatedAt}])).status,403);
 assert.equal((await b.c.action('saveOwnerRental',[{property:{...other,media:[image],photos:[image.url]},mode:'draft',expectedUpdatedAt:other.updatedAt}])).status,403);
 assert.equal((await b.c.request('/api/rental-owner/media?propertyId='+p.id+'&deleteMedia='+image.id,{method:'POST'})).status,403);
 assert.equal((await a.c.request('/api/app?deleteMedia='+image.id,{method:'POST'})).status,403);
 assert.equal((await a.c.request('/api/rental-owner/media?propertyId='+p.id,{method:'POST',headers:{'Content-Type':'image/png'},body:Buffer.from('not an image')})).status,400);
 assert.equal((await f.client().get('/api/rental-owner')).status,403);
 assert(!(await b.c.get('/api/rental-owner')).data.properties.some(r=>r.id===p.id));
});
test('availability, suspension and reassignment enforce live access without sharing historical tenant contacts',async t=>{
 const f=await fixture(t),a=await owner(f),b=await owner(f),{p}=await submit(f,a);await publishRental(f,p.id);const previous=await inquiry(f,p.id,true);
 let row=(await a.c.get('/api/rental-owner')).data.properties[0];
 assert.equal((await a.c.action('setOwnerRentalAvailability',[p.id,row.ownerVersion,false])).data.success,true);
 assert.equal((await a.c.action('setOwnerRentalAvailability',[p.id,row.ownerVersion,true])).data.success,false);
 assert.equal((await f.db.publicState()).rentals.find(r=>r.id===p.id)!.acceptingInquiries,false);
 const rejected=await f.client().action('createRentalInquiry',[{propertyId:p.id,guestName:'Synthetic',contact:'tenant@example.test',requestType:'rent',desiredStartDate:new Date(Date.now()+86400000).toISOString().slice(0,10),desiredDurationText:'1 month',residentsCount:1,shareWithOwner:true}]);assert.equal(rejected.data.success,false);
 row=(await a.c.get('/api/rental-owner')).data.properties[0];assert.equal((await f.admin.action('assignRentalOwner',[{propertyId:p.id,ownerId:b.user.id,version:row.ownerVersion,reason:'Reviewed reassignment'}])).data.success,true);
 assert.equal((await a.c.get('/api/rental-owner')).status,403);await a.c.action('login',[a.input.email,f.password]);assert(!(await a.c.get('/api/rental-owner')).data.properties.some(r=>r.id===p.id));
 await b.c.action('login',[b.input.email,f.password]);assert.equal((await b.c.get('/api/rental-owner')).data.totalInquiries,0);
 await publishRental(f,p.id);const next=await inquiry(f,p.id,true);assert.notEqual(next.id,previous.id);assert.equal((await b.c.get('/api/rental-owner')).data.inquiries[0].id,next.id);
 const account=(await f.admin.get('/api/admin/rental-owners')).data.accounts.find(x=>x.userId===b.user.id);
 assert.equal((await f.admin.action('saveRentalOwnerAccount',[{id:b.user.id,version:account.version,name:account.name,email:account.email,phone:account.phone,organization:account.organization,bio:account.bio,city:account.city,status:'suspended',password:''}])).data.success,true);
 assert(!(await f.db.publicState()).rentals.some(r=>r.id===p.id));assert.equal((await b.c.get('/api/rental-owner')).status,403);
 await assert.rejects(()=>f.db.sqlTransaction(tx=>rentalOwnerAction(tx,{...b.user,rentalOwnerAuthorized:true},'setOwnerRentalAvailability',[p.id,2,true])));
});
test('concurrent edits, stale assignments and audit failure roll back every owner mutation',async t=>{
 const f=await fixture(t),a=await owner(f),b=await owner(f),p=await draft(f,a);
 const request={property:{...p,title:{fa:'جدید',en:'Changed',ru:'Изменено',hy:'Փոխված'}},mode:'draft',expectedUpdatedAt:p.updatedAt};
 const db2=new Database({url:process.env.DATABASE_URL});await db2.waitUntilReady();try{const results=await Promise.allSettled([f.db.sqlTransaction(tx=>rentalOwnerAction(tx,a.user,'saveOwnerRental',[request])),db2.sqlTransaction(tx=>rentalOwnerAction(tx,a.user,'saveOwnerRental',[request]))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);}finally{await db2.close();}
 assert.equal((await f.admin.action('assignRentalOwner',[{propertyId:p.id,ownerId:b.user.id,version:0,reason:'stale'}])).data.success,false);
 const current=(await a.c.get('/api/rental-owner')).data.properties[0],before=JSON.stringify(current);
 await f.db.client.execute("CREATE TRIGGER fail_owner_audit BEFORE INSERT ON rental_owner_events BEGIN SELECT RAISE(ABORT,'injected audit failure'); END");
 assert.equal((await a.c.action('saveOwnerRental',[{property:{...current,city:'Changed city'},mode:'draft',expectedUpdatedAt:current.updatedAt}])).data.success,false);
 assert.equal(JSON.stringify((await a.c.get('/api/rental-owner')).data.properties[0]),before);
 const users=(await f.db.client.execute('SELECT COUNT(*) AS n FROM users')).rows[0].n;
 assert.equal((await f.admin.action('saveRentalOwnerAccount',[{...a.input,email:randomUUID()+'@example.test'}])).data.success,false);
 assert.equal((await f.db.client.execute('SELECT COUNT(*) AS n FROM users')).rows[0].n,users);
});
test('additive migration preserves all old records, leaves old rentals unassigned and supports guarded separate-target recovery',async t=>{
 const f=await fixture(t);await f.db.client.batch(['DROP TABLE rental_owner_media','DROP TABLE rental_owner_inquiry_access','DROP TABLE rental_owner_properties','DROP TABLE rental_owner_events','DROP TABLE rental_owner_accounts',"DELETE FROM module_migrations WHERE name='rental-owner-v1'"],'write');
 const before=await exportSnapshot(f.db.client);const fingerprint=(snapshot:typeof before)=>snapshot.tables.filter(t=>t.name!=='module_migrations'&&!t.name.startsWith('rental_owner_')).map(t=>[t.name,JSON.stringify(t.rows)]);
 assert.equal(await rentalOwnersReady(f.db.client),false);assert.equal(await pendingMigrations(f.db.client),true);await assert.rejects(()=>guardMigrations(f.db.client,undefined,{...process.env,REQUIRE_MIGRATION_BACKUP:'true'}));
 const backup=await createVerifiedBackup(f.db.client,f.root+'/recovery',process.env.BACKUP_ENCRYPTION_KEY!);await guardMigrations(f.db.client,backup.file,{...process.env,REQUIRE_MIGRATION_BACKUP:'true'});
 await f.db.client.execute("CREATE TRIGGER fail_owner_migration BEFORE INSERT ON module_migrations WHEN NEW.name='rental-owner-v1' BEGIN SELECT RAISE(ABORT,'injected migration failure'); END");await assert.rejects(()=>migrateRentalOwners(f.db.client));assert.equal((await f.db.client.execute("SELECT name FROM sqlite_master WHERE name='rental_owner_accounts'")).rows.length,0);
 await f.db.client.execute('DROP TRIGGER fail_owner_migration');await migrateRentalOwners(f.db.client);await migrateRentalOwners(f.db.client);assert.equal(await rentalOwnersReady(f.db.client),true);assert.equal(JSON.stringify(fingerprint(await exportSnapshot(f.db.client)))===JSON.stringify(fingerprint(before)),true);
 assert.equal((await f.db.client.execute('SELECT COUNT(*) AS n FROM rental_owner_properties')).rows[0].n,0);assert.equal((await f.db.client.execute('SELECT COUNT(*) AS n FROM rental_owner_inquiry_access')).rows[0].n,0);
 const restored=createClient({url:'file:'+f.root+'/restored.db'});try{await restoreSnapshot(restored,(await verifyBackup(backup.file,process.env.BACKUP_ENCRYPTION_KEY!)).snapshot,f.root+'/restored-media');await migrateRentalOwners(restored);assert.equal((await restored.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');assert.equal((await restored.execute('PRAGMA foreign_key_check')).rows.length,0);}finally{restored.close();}
});
test('owner profile versioning, private routes and all locale strings remain consistent',async t=>{
 const f=await fixture(t),a=await owner(f),b=await owner(f),p=(await a.c.get('/api/rental-owner')).data.profile;
 assert.equal((await a.c.action('saveOwnerProfile',[{version:p.version,organization:'SYNTHETIC changed',bio:'Private owner profile',city:'Yerevan'}])).data.success,true);
 assert.equal((await a.c.action('saveOwnerProfile',[{version:p.version,organization:'stale',bio:'',city:''}])).data.success,false);
 assert(!JSON.stringify((await b.c.get('/api/rental-owner')).data).includes('Private owner profile'));assert(!JSON.stringify((await f.client().get('/api/app')).data).includes('Private owner profile'));
 assert.equal(parseRoute(routeHash('rental-owner')).view,'rental-owner');
 for(const lang of ['fa','en','ru','hy'] as const){assert.deepEqual(Object.keys(rentalOwnerText[lang]),Object.keys(rentalOwnerText.en));assert(Object.values(rentalOwnerText[lang]).every(s=>s.length));}
});
