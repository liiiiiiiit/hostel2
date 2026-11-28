import {serviceProviderAction,serviceProviderState,providerQuery} from './service-providers.js';
import {serviceProvidersReady,migrateServiceProviders} from './service-provider-storage.js';
import {serviceInput,serviceAction} from './services.js';
import {serviceProviderText} from '../src/i18n/serviceProvider.js';
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

type F=Awaited<ReturnType<typeof fixture>>;
async function provider(f:F){
 const input={version:0,name:'SYNTHETIC provider',email:randomUUID()+'@example.test',phone:'',password:f.password,status:'active',businessName:'SYNTHETIC business',bio:'Fictional profile',city:'Yerevan'};
 const made=await f.admin.action('saveServiceProviderAccount',[input]);assert.equal(made.data.success,true,made.data.error);
 const c=f.client();assert.equal((await c.action('login',[input.email,f.password])).data.success,true);
 return {input,c,user:(await c.get('/api/app')).data.state.currentUser as User};
}
async function listingDraft(f:F,p:Awaited<ReturnType<typeof provider>>){
 const categories=(await p.c.get('/api/service-categories')).data.categories;
 const tr=(s:string)=>({fa:s,en:s,ru:s,hy:s});
 const service=serviceInput.parse({id:randomUUID(),version:0,slug:'synthetic-'+randomUUID(),categoryId:categories[0].id,isActive:false,isFeatured:false,isVerified:false,allowBookingRequest:true,title:tr('SYNTHETIC service'),shortDescription:tr('SYNTHETIC short'),description:tr('SYNTHETIC description'),address:tr('Approximate public address'),workingHours:tr('Mon-Fri 09-17'),priceRange:tr('AMD 1000–2000'),coverImage:'',gallery:[],phone:'',whatsapp:'',telegram:'',instagram:'',website:'',city:'Yerevan',district:'Kentron',mapUrl:'https://yandex.com/maps/',latitude:40.18,longitude:44.51,languagesSpoken:['fa','en','ru','hy'],highlights:[]});
 const r=await p.c.action('saveProviderService',[{service,submit:false}]);assert.equal(r.data.success,true,r.data.error);
 return (await p.c.get('/api/service-provider')).data.listings.find(s=>s.id===service.id);
}
async function publishService(f:F,p:Awaited<ReturnType<typeof provider>>,service:ReturnType<typeof serviceInput.parse>){
 const r=await p.c.action('saveProviderService',[{service,submit:true}]);assert.equal(r.data.success,true,r.data.error);
 const m=await f.db.sqlTransaction(tx=>moderationDetail(tx,f.adminUser,'service',service.id),'read');
 await f.db.sqlTransaction(tx=>moderateContent(tx,f.adminUser,{targets:[{module:'service',id:service.id,version:m.version,contentVersion:m.contentVersion}],status:'published',note:'SYNTHETIC administrator review',confirmed:true}));
 return (await p.c.get('/api/service-provider')).data.listings.find(s=>s.id===service.id);
}
async function request(f:F,service:{id:string;version:number},consent:boolean){
 const r=await f.client().action('requestService',[{requestId:randomUUID(),serviceId:service.id,version:service.version,name:'SYNTHETIC customer',contact:'private-customer@example.test',note:'SYNTHETIC private request',shareWithProvider:consent}]);assert.equal(r.data.success,true,r.data.error);return r.data.serviceReference as string;
}
test('service providers preserve existing identities, require administrator authorization and revoke sessions',async t=>{
 const f=await fixture(t),v=await f.traveler();
 assert.equal((await v.c.action('grantServiceProvider',[{userId:v.user.id,businessName:'forged',reason:'forged'}])).status,403);
 assert.equal((await f.admin.action('grantServiceProvider',[{userId:v.user.id,businessName:'SYNTHETIC business',reason:'SYNTHETIC reviewed account'}])).data.success,true);
 assert.equal((await v.c.get('/api/service-provider')).status,403);
 await v.c.action('login',[v.user.email,f.password]);
 const u=(await v.c.get('/api/app')).data.state.currentUser;assert.equal(u.id,v.user.id);assert.equal(u.role,'traveler');assert.equal(u.serviceProviderAuthorized,true);
 assert.equal((await v.c.get('/api/admin/services')).status,403);
 assert.equal((await v.c.get('/api/admin/service-providers')).status,403);
 assert.equal((await v.c.action('saveServiceCategory',[{}])).status>=400,true);
 assert.equal((await f.client().get('/api/service-provider')).status,403);
});
test('shared listing drafts, review, public visibility and provider material edits enforce moderation',async t=>{
 const f=await fixture(t),p=await provider(f),s=await listingDraft(f,p);
 assert.equal((await f.client().get('/api/services/'+s.id)).status,404);
 assert.equal((await p.c.action('saveService',[s])).status,403);
 await listingDraft(f,p);assert.equal((await p.c.get('/api/service-provider')).data.stats.listings,2);
 const publicListing=await publishService(f,p,s);
 assert.equal((await f.client().get('/api/services/'+s.id)).status,200);
 assert.equal((await f.db.client.execute({sql:'SELECT COUNT(*) AS n FROM service_listings WHERE id=?',args:[s.id]})).rows[0].n,1);
 assert.equal((await p.c.action('saveProviderService',[{service:{...publicListing,city:'Changed'},submit:true}])).data.success,true);
 assert.equal((await f.client().get('/api/services/'+s.id)).status,404);
});
test('consented requests, private receipt tracking, supported transitions and restart persistence',async t=>{
 const f=await fixture(t),p=await provider(f),s=await publishService(f,p,await listingDraft(f,p));
 const shared=await request(f,s,true),unshared=await request(f,s,false);
 let state=(await p.c.get('/api/service-provider')).data;
 assert.equal(state.requests.length,1);assert(!JSON.stringify(state).includes(shared));assert(!JSON.stringify(state).includes(unshared));
 const progress=(await f.client().get('/api/service-requests/'+shared)).data;assert.equal(progress.status,'new');assert(!JSON.stringify(progress).includes('private-customer'));assert(!JSON.stringify(progress).includes('SYNTHETIC private request'));
 const r=state.requests[0];assert.equal((await p.c.action('updateProviderServiceRequest',[r.id,'new','contacted'])).data.success,true);
 assert.equal((await p.c.action('updateProviderServiceRequest',[r.id,'new','closed'])).data.success,false);
 assert.equal((await p.c.action('updateProviderServiceRequest',[r.id,'contacted','closed'])).data.success,true);
 assert.equal((await p.c.action('updateProviderServiceRequest',[r.id,'closed','new'])).data.success,false);
 const db2=new Database({url:process.env.DATABASE_URL});await db2.waitUntilReady();try{state=await db2.sqlTransaction(tx=>serviceProviderState(tx,p.user,providerQuery.parse({})),'read');assert.equal(state.requests[0].status,'closed');}finally{await db2.close();}
});
test('ownership, media scope, badges and administrator request boundaries cannot be forged',async t=>{
 const f=await fixture(t),a=await provider(f),b=await provider(f),s=await listingDraft(f,a);
 assert.equal((await b.c.action('saveProviderService',[{service:s,submit:false}])).status,403);
 for(const patch of [{isVerified:true},{isFeatured:true},{gallery:['https://unowned.example.test/x.png']}]){
  assert.equal((await a.c.action('saveProviderService',[{service:{...s,...patch},submit:false}])).status,403);
 }
 assert.equal((await a.c.action('reviewServiceVerification',[{serviceId:s.id,version:s.version,verified:true,evidence:'forged'}])).status,403);
 const bytes=await sharp({create:{width:12,height:12,channels:3,background:'#123456'}}).png().toBuffer();
 const upload=await a.c.request('/api/service-provider/media?serviceId='+s.id,{method:'POST',headers:{'Content-Type':'image/png'},body:bytes});assert.equal(upload.status,201);const image=(await upload.json()).image;
 assert.equal((await b.c.request('/api/service-provider/media?serviceId='+s.id,{method:'POST',headers:{'Content-Type':'image/png'},body:bytes})).status,403);
 assert.equal((await a.c.action('saveProviderService',[{service:{...s,coverImage:image.url,gallery:[image.url]},submit:false}])).data.success,true);
 assert.equal((await a.c.request('/api/service-provider/media?serviceId='+s.id+'&deleteMedia='+image.id,{method:'POST'})).status,409);
 assert.equal((await a.c.action('saveService',[s])).status,403);
 const current=(await a.c.get('/api/service-provider')).data.listings.find(r=>r.id===s.id);assert.equal((await f.admin.action('deleteService',[s.id,current.version])).status,409);
});
test('verification requires evidence; evidence stays private; assignment and suspension never share historical contacts',async t=>{
 const f=await fixture(t),a=await provider(f),b=await provider(f);let s=await publishService(f,a,await listingDraft(f,a));await request(f,s,true);
 assert.equal((await f.admin.action('reviewServiceVerification',[{serviceId:s.id,version:s.version,verified:true,evidence:''}])).data.success,false);
 assert.equal((await f.admin.action('saveService',[{...s,isVerified:true}])).data.success,false);
 assert.equal((await f.admin.action('reviewServiceVerification',[{serviceId:s.id,version:s.version,verified:true,evidence:'SYNTHETIC PRIVATE EVIDENCE'}])).data.success,true);
 const pub=(await f.client().get('/api/services/'+s.id)).data;assert.equal(pub.service.isVerified,true);assert(!JSON.stringify(pub).includes('PRIVATE EVIDENCE'));
 s=(await a.c.get('/api/service-provider')).data.listings[0];
 assert.equal((await f.admin.action('assignServiceProvider',[{serviceId:s.id,ownerId:b.user.id,version:s.ownershipVersion,reason:'SYNTHETIC reassignment'}])).data.success,true);
 assert.equal((await a.c.get('/api/service-provider')).status,403);
 await a.c.action('login',[a.input.email,f.password]);await b.c.action('login',[b.input.email,f.password]);
 assert.equal((await b.c.get('/api/service-provider')).data.requests.length,0);assert.equal((await a.c.get('/api/service-provider')).data.listings.length,0);
 s=(await b.c.get('/api/service-provider')).data.listings[0];assert.equal(s.isVerified,false);assert.equal((await f.client().get('/api/services/'+s.id)).status,404);
 s=await publishService(f,b,s);
 const profile=(await b.c.get('/api/service-provider')).data.profile;
 assert.equal((await f.admin.action('saveServiceProviderAccount',[{...b.input,userId:b.user.id,version:profile.version,password:'',status:'suspended'}])).data.success,true);
 assert.equal((await f.client().get('/api/services/'+s.id)).status,404);assert.equal((await b.c.get('/api/service-provider')).status,403);
 await assert.rejects(()=>f.db.sqlTransaction(tx=>serviceProviderAction(tx,{...b.user,serviceProviderAuthorized:true},'saveServiceBusiness',[{version:1,businessName:'forged',bio:'',city:''}])));
});
test('provider stale writes and failed audit are atomic; additive migration and encrypted backup preserve legacy data',async t=>{
 const f=await fixture(t),p=await provider(f),s=await listingDraft(f,p);
 const update={service:{...s,city:'SYNTHETIC changed'},submit:false};const results=await Promise.all([p.c.action('saveProviderService',[update]),p.c.action('saveProviderService',[update])]);assert.equal(results.filter(r=>r.data.success).length,1);
 const before=JSON.stringify((await p.c.get('/api/service-provider')).data.listings);
 await f.db.client.execute("CREATE TRIGGER fail_service_provider_event BEFORE INSERT ON service_provider_events BEGIN SELECT RAISE(ABORT,'injected failure'); END");
 const current=(await p.c.get('/api/service-provider')).data.listings[0];
 assert.equal((await p.c.action('saveProviderService',[{service:{...current,city:'not saved'},submit:false}])).data.success,false);
 assert.equal(JSON.stringify((await p.c.get('/api/service-provider')).data.listings),before);
 await f.db.client.execute('DROP TRIGGER fail_service_provider_event');
 const snapshot=await exportSnapshot(f.db.client);await migrateServiceProviders(f.db.client);await migrateServiceProviders(f.db.client);
 assert.equal(await serviceProvidersReady(f.db.client),true);assert.equal((await f.db.client.execute('PRAGMA foreign_key_check')).rows.length,0);
 const backup=await createVerifiedBackup(f.db.client,f.root+'/service-backup',process.env.BACKUP_ENCRYPTION_KEY!),target=createClient({url:'file:'+f.root+'/service-restored.db'});
 try{await restoreSnapshot(target,(await verifyBackup(backup.file,process.env.BACKUP_ENCRYPTION_KEY!)).snapshot,f.root+'/service-restored-media');assert.equal(await serviceProvidersReady(target),true);assert.equal((await target.execute('SELECT COUNT(*) AS n FROM service_provider_accounts')).rows[0].n,1);assert.equal((await target.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');}finally{target.close();}
 assert(snapshot.tables.some(t=>t.name==='service_provider_listings'));
});
test('all four business locales and navigation are wired',()=>{
 for(const lang of ['fa','en','ru','hy'] as const){assert.deepEqual(Object.keys(serviceProviderText[lang]),Object.keys(serviceProviderText.en));assert(Object.values(serviceProviderText[lang]).every(v=>!!v));}
 assert.equal(parseRoute(routeHash('service-provider')).view,'service-provider');
});

test('service provider migration preserves all legacy rows, creates no implicit assignments and rolls back failed DDL',async t=>{
 const f=await fixture(t),before=await exportSnapshot(f.db.client);
 const fingerprint=(snap:typeof before)=>snap.tables.filter(t=>!t.name.startsWith('service_provider_')&&t.name!=='service_verification_reviews'&&t.name!=='module_migrations').map(t=>[t.name,JSON.stringify(t.rows)]);
 await f.db.client.batch(['DROP TABLE service_provider_media','DROP TABLE service_provider_request_access','DROP TABLE service_provider_listings','DROP TABLE service_verification_reviews','DROP TABLE service_provider_events','DROP TABLE service_provider_accounts',"DELETE FROM module_migrations WHERE name='service-provider-v1'"],'write');
 assert.equal(await serviceProvidersReady(f.db.client),false);assert.equal(await pendingMigrations(f.db.client),true);
 await assert.rejects(()=>guardMigrations(f.db.client,undefined,{...process.env,REQUIRE_MIGRATION_BACKUP:'true'}));
 await f.db.client.execute("CREATE TRIGGER fail_service_provider_migration BEFORE INSERT ON module_migrations WHEN NEW.name='service-provider-v1' BEGIN SELECT RAISE(ABORT,'injected migration failure'); END");
 await assert.rejects(()=>migrateServiceProviders(f.db.client));assert.equal((await f.db.client.execute("SELECT name FROM sqlite_master WHERE name='service_provider_accounts'")).rows.length,0);
 await f.db.client.execute('DROP TRIGGER fail_service_provider_migration');await migrateServiceProviders(f.db.client);await migrateServiceProviders(f.db.client);
 assert.deepEqual(fingerprint(await exportSnapshot(f.db.client)),fingerprint(before));
 assert.equal((await f.db.client.execute('SELECT COUNT(*) AS n FROM service_provider_listings')).rows[0].n,0);
 assert.equal((await f.db.client.execute('SELECT COUNT(*) AS n FROM service_provider_request_access')).rows[0].n,0);
 assert.equal((await f.db.client.execute('PRAGMA foreign_key_check')).rows.length,0);
});
