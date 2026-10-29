import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { Database } from './database.js';
import { createApi } from './api.js';
import { addCalendarDays, yerevanToday } from '../src/utils/dates.js';
import { deliverNotifications } from './notifications.js';
import type { ClientState } from '../src/types/index.js';

async function fixture(t: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), 'yh-api-'));
  const database = new Database({ url: `file:${directory}/test.db`, demo: true });
  const server = createApi(database).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api/app`;
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await database.close(); await rm(directory, { recursive: true, force: true }); });
  function client() {
    let cookie = '';
    return {
      async get(token = '', inquiryToken = '') { const response = await fetch(base, { headers: { cookie, 'X-Booking-Token': token, 'X-Inquiry-Token': inquiryToken } }); const data = await response.json() as { state: ClientState }; return { response, ...data }; },
      async action(action: string, args: unknown[], extra: Record<string,string> = {}) {
        if(action==='createBooking'){const payload=args[0] as {hostelId:string};const {state}=await this.get();args=[{acceptedTerms:true,idempotencyKey:crypto.randomUUID(),expectedHostelUpdatedAt:state.hostels.find(item=>item.id===payload.hostelId)?.updatedAt??'missing',...payload}];}
        const response = await fetch(base, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', 'X-Requested-With': 'YerevanHub', ...extra }, body: JSON.stringify({ action, args }) });
        const next = response.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
        const data = await response.json(); return { response, data };
      },
      get cookie() { return cookie; },
    };
  }
  const visitor = client(); const initial = await visitor.get(); const hostel = initial.state.hostels[0];
  const checkIn = addCalendarDays(yerevanToday(), 2); const checkOut = addCalendarDays(checkIn, 2);
  const booking = { hostelId: hostel.id, roomTypeId: hostel.roomTypes[0].id, guestName: 'API Guest', contactType: 'email', guestContact: 'guest@example.test', checkIn, checkOut, quantity: 1, guestsCount: 1 };
  return { database, databaseUrl:`file:${directory}/test.db`, base, client, visitor, hostel, booking };
}

test('public API never returns identities, guest records, internal addresses, credentials or door codes', async t => {
  const { visitor, database } = await fixture(t);
  await database.transaction(async state => { state.hostels[0].floorAndDoorCode = 'PRIVATE-DOOR-998'; state.rentals[0].landlordInternalNotes = 'PRIVATE-LANDLORD'; });
  const { state } = await visitor.get();
  assert.deepEqual(state.users, []); assert.deepEqual(state.bookings, []); assert.deepEqual(state.auditLogs, []);
  assert.ok(!JSON.stringify(state).includes('PRIVATE-DOOR-998'));
  assert.ok(!JSON.stringify(state).includes('PRIVATE-LANDLORD'));
  assert.ok(!('credentials' in state));
});

test('sessions are server-verified, HttpOnly, revoked on logout, and public demo passwords fail on a production-like database', async t => {
  const { visitor, client, database } = await fixture(t);
  assert.equal((await visitor.action('login',['admin@yerevanhub.com','wrong-password'])).data.success, false);
  const login = await visitor.action('login',['admin@yerevanhub.com','Admin@2026']);
  assert.equal(login.data.success, true); assert.match(login.response.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(login.response.headers.get('set-cookie')!, /SameSite=Lax/);
  assert.equal((await visitor.get()).state.currentUser?.role, 'admin');
  assert.equal((await client().get()).state.currentUser, null);
  await visitor.action('logout',[]); assert.equal((await visitor.get()).state.currentUser, null);
  await database.transaction(async state => { state.users=[]; state.credentials={}; });
  assert.equal((await visitor.action('login',['admin@yerevanhub.com','Admin@2026'])).data.success, false);
});

test('registration stores a verifier, not plaintext, and logins survive a new browser session', async t => {
  const { visitor, client, database } = await fixture(t);
  const registered = await visitor.action('registerTraveler',['Guest','traveler@sample.test',null,'Long-password-42']);
  assert.equal(registered.data.success,true);
  assert.equal(registered.data.state.currentUser.role,'traveler');
  await database.transaction(async state => { assert.ok(!JSON.stringify(state).includes('Long-password-42')); assert.equal(state.credentials[registered.data.user.id].hash.length,64); });
  assert.equal((await client().action('login',['traveler@sample.test','Long-password-42'])).data.success,true);
});

test('guest booking persists and exact private tracking works in an unrelated browser', async t => {
  const { visitor, client, booking, database } = await fixture(t);
  const created = await visitor.action('createBooking',[booking]);
  assert.equal(created.data.success,true);
  const token = created.data.booking.privateToken;
  assert.equal((await client().get()).state.bookings.length,0);
  assert.equal((await client().get('unknown-token')).state.bookings.length,0);
  assert.equal((await client().get(token)).state.bookings[0].guestName,'API Guest');
  const admin = client(); await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  await admin.action('updateArrivalGuide',[booking.hostelId,{addressArmenianForTaxi:'Երևան',directionsFa:'ورودی',directionsHy:'Մուտք',entrancePhoto:'',floorAndDoorCode:'PRIVATE-CODE-87',phone:'+37491123456'}]);
  assert.ok(!JSON.stringify((await client().get(token)).state.hostels).includes('PRIVATE-CODE-87'));
  assert.equal((await admin.action('updateBookingStatus',[created.data.booking.id,'confirmed'])).data.success,true);
  assert.ok(!JSON.stringify((await client().get(token)).state.hostels).includes('PRIVATE-CODE-87'));
  await database.transaction(async state=>{const entry=state.bookings.find(item=>item.privateToken===token)!;entry.checkIn=yerevanToday();entry.checkOut=addCalendarDays(yerevanToday(),1);});
  assert.ok(JSON.stringify((await client().get(token)).state.hostels).includes('PRIVATE-CODE-87'));
  await database.transaction(async state=>{const entry=state.bookings.find(item=>item.privateToken===token)!;entry.checkOut=yerevanToday();if(entry.agreement)entry.agreement.checkOutTime='00:00';});
  assert.ok(!JSON.stringify((await client().get(token)).state.hostels).includes('PRIVATE-CODE-87'));
  assert.ok(!JSON.stringify((await client().get()).state.hostels).includes('PRIVATE-CODE-87'));
  await database.transaction(async (_state,tx) => { assert.ok((await tx.execute('SELECT id FROM outbox')).rows.length>0); });
});

test('concurrent confirmations obey daily capacity and managers cannot edit another hostel', async t => {
  const { visitor, client, booking } = await fixture(t);
  const admin = client(); await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  for(let offset=0;offset<2;offset++) assert.equal((await admin.action('setCapacity',[booking.hostelId,booking.roomTypeId,addCalendarDays(booking.checkIn,offset),1])).data.success,true);
  const first = (await visitor.action('createBooking',[booking])).data.booking;
  const second = (await visitor.action('createBooking',[booking])).data.booking;
  const results = await Promise.all([admin.action('updateBookingStatus',[first.id,'confirmed']),admin.action('updateBookingStatus',[second.id,'confirmed'])]);
  assert.equal(results.filter(r=>r.data.success).length,1);
  const day = (await visitor.get()).state.availability.find(day=>day.roomTypeId===booking.roomTypeId && day.date===booking.checkIn)!;
  assert.equal(day.available,0);
  assert.equal((await visitor.action('setCapacity',[booking.hostelId,booking.roomTypeId,booking.checkIn,2])).response.status,403);
  const manager = client(); await manager.action('login',['manager.cascade@yerevanhub.com','Hostel@2026']);
  assert.equal((await manager.action('setCapacity',[booking.hostelId,booking.roomTypeId,booking.checkIn,2])).response.status,403);
  const lowered = await admin.action('setCapacity',[booking.hostelId,booking.roomTypeId,booking.checkIn,0]); assert.equal(lowered.data.success,false);
});

test('rejects malformed data, arbitrary mutations, forged origins and excessive login attempts', async t => {
  const { visitor, booking } = await fixture(t);
  assert.equal((await visitor.action('createBooking',[{...booking,quantity:-1}])).response.status,400);
  assert.equal((await visitor.action('createBooking',[{...booking,checkIn:'2027-02-30'}])).response.status,400);
  assert.equal((await visitor.action('getState',[])).response.status,400);
  assert.equal((await visitor.action('login',['admin@yerevanhub.com','Admin@2026'],{Origin:'https://evil.example'})).response.status,403);
  for(let count=0;count<10;count++) await visitor.action('login',['missing@example.test','wrong-password']);
  assert.equal((await visitor.action('login',['missing@example.test','wrong-password'])).response.status,429);
});

test('only completed past stays can submit category reviews; moderation controls public visibility', async t => {
  const { visitor, client, booking, database } = await fixture(t);
  const created = (await visitor.action('createBooking',[booking])).data.booking;
  const reviewArgs = [created.privateToken,5,'Great stay',{cleanliness:5,safety:4,staff:3,location:4}];
  assert.equal((await visitor.action('submitReview',reviewArgs)).data.success,false);
  await database.transaction(async state=>{const b=state.bookings.find(b=>b.id===created.id)!;b.status='completed';b.checkIn=addCalendarDays(yerevanToday(),-3);b.checkOut=addCalendarDays(yerevanToday(),-1);});
  assert.equal((await visitor.action('submitReview',reviewArgs)).data.success,true);
  assert.equal((await client().get()).state.reviews.length,0);
  const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const review=(await admin.get()).state.reviews[0]; assert.equal(review.rating,4);
  await admin.action('moderateReview',[review.id,'approved']);
  assert.equal((await client().get()).state.reviews[0].scores?.cleanliness,5);
  assert.equal((await visitor.action('submitReview',reviewArgs)).data.success,false);
});

test('durable outbox retains unconfigured notifications and retries failed delivery using a mock provider', async t => {
  const { visitor, booking, database } = await fixture(t);
  await visitor.action('createBooking',[booking]);
  const saved={key:process.env.RESEND_API_KEY,from:process.env.NOTIFICATION_FROM};
  delete process.env.RESEND_API_KEY;delete process.env.NOTIFICATION_FROM;
  try {
    let calls=0;
    const fakeFetch: typeof fetch = async () => { calls++; return new Response('',{status:200}); };
    assert.equal((await deliverNotifications(database,fakeFetch)).attempted,0);assert.equal(calls,0);
    process.env.RESEND_API_KEY='test-only';process.env.NOTIFICATION_FROM='test@example.test';
    const failed: typeof fetch=async()=>new Response('',{status:503});
    assert.equal((await deliverNotifications(database,failed)).sent,0);
    await database.transaction(async (_state,tx)=>{await tx.execute("UPDATE outbox SET next_attempt=0 WHERE status='retry'");});
    const result=await deliverNotifications(database,fakeFetch);assert.ok(result.sent>0);assert.ok(calls>0);
  } finally { if(saved.key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=saved.key;if(saved.from===undefined)delete process.env.NOTIFICATION_FROM;else process.env.NOTIFICATION_FROM=saved.from; }
});

test('persistent database can be reopened and bootstrap does not reset an existing administrator', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'yh-reopen-'));
  const url=`file:${directory}/persistent.db`;
  const first=new Database({url,demo:false});
  await first.transaction(async state=>{assert.equal(state.users.length,0);state.hostels[0].name.en='Persistent hostel';});
  await first.close();
  const next=new Database({url,demo:false,adminEmail:'owner@example.test',adminPassword:'owner-password-123'});
  await next.transaction(async state=>{assert.equal(state.hostels[0].name.en,'Persistent hostel');assert.equal(state.users.filter(u=>u.role==='admin').length,1);});
  await next.close();
  const reopened=new Database({url,demo:false,adminEmail:'other@example.test',adminPassword:'different-password-123'});
  await reopened.transaction(async state=>{assert.equal(state.users.filter(u=>u.role==='admin').length,1);assert.equal(state.users[0].email,'owner@example.test');});
  await reopened.close();await rm(directory,{recursive:true,force:true});
});

test('unconfigured hosted preview is explicitly read-only and contains no private seeded data', async () => {
  const { readOnlyPreview }=await import('./preview.js');
  const state=readOnlyPreview();
  assert.equal(state.previewMode,true);assert.equal(state.demoMode,false);
  assert.equal(state.bookings.length,0);assert.equal(state.users.length,0);assert.equal(state.reviews.length,0);
  assert.ok(state.hostels.length>0);assert.ok(state.hostels.every(h=>h.verification?.status==='unverified' && !h.floorAndDoorCode));
});

test('Vercel API adapter serves read-only browsing and rejects writes without a database', async t => {
  const previous=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
  const {default:endpoint}=await import('../api/app.js');
  const {createServer}=await import('node:http');
  // Vercel invokes the entrypoint before Express has augmented the response.
  const server=createServer(endpoint).listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/app`;
  try {
    const response=await fetch(base);const result=await response.json();
    assert.equal(response.status,200);assert.equal(result.state.previewMode,true);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(base,{method:'POST'})).status,503);
  } finally {
    server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
    if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;
  }
});

test('hostel location updates are scoped, validated and require explicit admin verification', async t => {
  const { visitor, client, hostel } = await fixture(t);
  const point = { lat: 40.7891, lng: 43.8473, verified: false };
  assert.equal((await visitor.action('updateHostelLocation', [hostel.id, point])).response.status, 403);
  const manager = client();
  await manager.action('login', ['manager.kentron@yerevanhub.com', 'Hostel@2026']);
  assert.equal((await manager.action('updateHostelLocation', [hostel.id, { ...point, verified: true, note: 'Checked' }])).response.status, 403);
  assert.equal((await manager.action('updateHostelLocation', [hostel.id, point])).data.success, true);
  let publicHostel = (await visitor.get()).state.hostels.find(h => h.id === hostel.id)!;
  assert.deepEqual(publicHostel.coordinates, { lat: point.lat, lng: point.lng });
  assert.equal(publicHostel.locationVerification?.status, 'unverified');
  const otherManager = client();
  await otherManager.action('login', ['manager.cascade@yerevanhub.com', 'Hostel@2026']);
  assert.equal((await otherManager.action('updateHostelLocation', [hostel.id, point])).response.status, 403);
  const admin = client();
  await admin.action('login', ['admin@yerevanhub.com', 'Admin@2026']);
  assert.equal((await admin.action('updateHostelLocation', [hostel.id, { ...point, lat: 91 }])).response.status, 400);
  assert.equal((await admin.action('updateHostelLocation', [hostel.id, { ...point, verified: true, note: '' }])).response.status, 400);
  assert.equal((await admin.action('updateHostelLocation', [hostel.id, { ...point, verified: true, note: 'Address and entrance confirmed by owner' }])).data.success, true);
  publicHostel = (await visitor.get()).state.hostels.find(h => h.id === hostel.id)!;
  assert.equal(publicHostel.locationVerification?.status, 'verified');
  assert.ok(publicHostel.locationVerification?.checkedAt);
  assert.equal(publicHostel.locationVerification?.checkedBy, undefined);
  assert.equal((await manager.action('updateHostelLocation', [hostel.id, point])).data.success, true);
  assert.equal((await visitor.get()).state.hostels.find(h => h.id === hostel.id)!.locationVerification?.status, 'unverified');
});

test('administrator creates, edits, previews and publishes female beds, private rooms and an apartment without code changes', async t => {
  const { completeHostel, completeRental } = await import('./property-fixtures.js');
  const { client, visitor, database } = await fixture(t);
  const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const hostel=completeHostel();
  assert.equal((await visitor.action('saveHostel',[hostel])).response.status,403);
  const manager=client();await manager.action('login',['manager.kentron@yerevanhub.com','Hostel@2026']);
  assert.equal((await manager.action('saveHostel',[hostel])).response.status,403);
  assert.equal((await admin.action('saveHostel',[hostel])).data.success,true);
  assert.ok(!(await visitor.get()).state.hostels.some(item=>item.id===hostel.id));
  assert.ok((await admin.get()).state.hostels.some(item=>item.id===hostel.id));
  hostel.name.en='Updated hostel';hostel.isPublished=true;hostel.listingStatus='published';
  assert.equal((await admin.action('saveHostel',[hostel])).data.success,true);
  const published=(await visitor.get()).state.hostels.find(item=>item.id===hostel.id)!;
  assert.equal(published.name.en,'Updated hostel');assert.equal(published.roomTypes.length,2);
  assert.equal(published.roomTypes[1].maxGuestsPerUnit,2);assert.equal(published.roomTypes[1].physicalUnits,undefined);
  const rental=completeRental();rental.status='published';
  assert.equal((await manager.action('saveRental',[rental])).response.status,403);
  assert.equal((await admin.action('saveRental',[rental])).data.success,true);
  const publicRental=(await visitor.get()).state.rentals.find(item=>item.id===rental.id)!;
  assert.equal(publicRental.addressExactInternal,'');assert.equal(publicRental.landlordInternalNotes,'');
  const inquiry=await visitor.action('createRentalInquiry',[{propertyId:rental.id,guestName:'Rental guest',contact:'guest@example.test',requestType:'visit',residentsCount:2}]);
  assert.equal(inquiry.data.success,true);
  await admin.action('updateRentalInquiryStatus',[inquiry.data.inquiry.id,'agreed','PRIVATE-ADMIN-NOTE']);
  const tracked=await visitor.get('',inquiry.data.inquiry.privateToken);
  assert.ok(!JSON.stringify(tracked.state).includes('PRIVATE-ADMIN-NOTE'));
  await database.transaction(async state=>{assert.equal(state.bookings.filter(item=>item.hostelId===rental.id).length,0);});
  assert.equal((await admin.action('setRentalStatus',[rental.id,'archived'])).data.success,true);
  assert.ok(!(await visitor.get()).state.rentals.some(item=>item.id===rental.id));
});

test('publication rejects incomplete drafts, forged verification, duplicate slugs, invalid room units and inventory reductions', async t => {
  const { completeHostel }=await import('./property-fixtures.js');
  const { newHostel }=await import('../src/utils/properties.js');
  const {client,visitor,booking}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const draft=newHostel();assert.equal((await admin.action('saveHostel',[draft])).data.success,true);
  assert.equal((await admin.action('setHostelStatus',[draft.id,'published'])).response.status,400);
  const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';
  assert.equal((await admin.action('saveHostel',[{...hostel,locationVerification:{status:'verified'},verification:{status:'verified'}}])).data.success,true);
  const state=(await admin.get()).state;assert.equal(state.hostels.find(item=>item.id===hostel.id)?.verification?.status,'unverified');
  assert.equal((await admin.action('saveHostel',[{...hostel,id:crypto.randomUUID()}])).response.status,400);
  const invalid=structuredClone(hostel);invalid.roomTypes[0].bookingUnit='room';assert.equal((await admin.action('saveHostel',[invalid])).response.status,400);
  const created=await visitor.action('createBooking',[{...booking,hostelId:hostel.id,roomTypeId:hostel.roomTypes[0].id}]);
  assert.equal(created.data.success,true);assert.equal((await admin.action('updateBookingStatus',[created.data.booking.id,'confirmed'])).data.success,true);
  hostel.roomTypes[0].totalBedsOrRooms=0;
  assert.equal((await admin.action('saveHostel',[hostel])).response.status,400);
});

test('image uploads require admin, validate actual bytes, optimize and delete only detached images', async t => {
  const sharp=(await import('sharp')).default;
  const { client,base,visitor }=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const headers={'X-Requested-With':'YerevanHub','Content-Type':'image/png',cookie:admin.cookie};
  const bytes=await sharp({create:{width:2200,height:1200,channels:3,background:'#123456'}}).png().toBuffer();
  assert.equal((await fetch(base+'?upload=1',{method:'POST',headers:{...headers,cookie:''},body:bytes})).status,403);
  assert.equal((await fetch(base+'?upload=1',{method:'POST',headers,body:Buffer.from('not an image')})).status,400);
  const uploaded=await fetch(base+'?upload=1',{method:'POST',headers,body:bytes});assert.equal(uploaded.status,200);
  const {image}=await uploaded.json();t.after(async()=>{await fetch(base+`?deleteMedia=${image.id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'}}).catch(()=>{});});
  const file=await fetch(new URL(image.url,base));assert.equal(file.status,200);assert.match(file.headers.get('content-type')!,/webp/);
  const metadata=await sharp(Buffer.from(await file.arrayBuffer())).metadata();assert.equal(metadata.width,1920);assert.equal(metadata.exif,undefined);
  const {newHostel}=await import('../src/utils/properties.js');const hostel=newHostel();hostel.media=[image];hostel.photos=[image.url];
  assert.equal((await admin.action('saveHostel',[hostel])).data.success,true);
  assert.equal((await fetch(base+`?deleteMedia=${image.id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'}})).status,400);
  hostel.media=[];hostel.photos=[];await admin.action('saveHostel',[hostel]);
  assert.equal((await fetch(base+`?deleteMedia=${image.id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'}})).status,200);
  assert.equal((await fetch(new URL(image.url,base))).status,404);
});

test('double-room pricing, duplicate retries and immutable accepted conditions are server-enforced',async t=>{
  const {completeHostel}=await import('./property-fixtures.js');
  const {client,visitor,booking,database}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const hostel=completeHostel();hostel.listingStatus='published';hostel.isPublished=true;await admin.action('saveHostel',[hostel]);
  const request={...booking,hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,guestsCount:2,quantity:1,idempotencyKey:crypto.randomUUID(),language:'en'};
  const repeated=await Promise.all([visitor.action('createBooking',[request]),client().action('createBooking',[request])]);
  assert.ok(repeated.every(result=>result.data.success));assert.equal(repeated[0].data.booking.id,repeated[1].data.booking.id);
  const agreed=repeated[0].data.booking;assert.equal(agreed.quantity,1);assert.equal(agreed.finalAmountAMD,18000*2);assert.equal(agreed.language,'en');assert.equal(agreed.agreement.bookingUnit,'room');
  assert.equal(agreed.agreement.breakdown.totalAMD,agreed.finalAmountAMD);assert.deepEqual(agreed.agreement.paymentMethodsOnArrival,['AMD cash']);
  assert.equal((await visitor.action('createBooking',[{...request,guestName:'Changed name'}])).data.success,false);
  assert.equal((await visitor.action('createBooking',[{...request,idempotencyKey:crypto.randomUUID(),guestsCount:3}])).data.success,false);
  assert.equal((await visitor.action('createBooking',[{...request,idempotencyKey:crypto.randomUUID(),roomTypeId:hostel.roomTypes[0].id}])).data.success,false);
  hostel.roomTypes[1].pricePerNightAMD=25000;hostel.rules.cancellationPolicy='Changed cancellation terms';
  assert.equal((await admin.action('saveHostel',[hostel])).data.success,true);
  const tracked=(await client().get(agreed.privateToken)).state.bookings[0];assert.equal(tracked.finalAmountAMD,36000);assert.deepEqual(tracked.agreement,agreed.agreement);
  await database.transaction(async state=>assert.equal(state.bookings.filter(item=>item.idempotencyKey===request.idempotencyKey).length,1));
});

test('two independent API/database instances cannot confirm the last private room twice',async t=>{
  const {completeHostel}=await import('./property-fixtures.js');
  const {client,booking,database,databaseUrl,base}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';await admin.action('saveHostel',[hostel]);
  const request={...booking,hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,guestsCount:2,quantity:1};
  const first=(await client().action('createBooking',[request])).data.booking;const second=(await client().action('createBooking',[request])).data.booking;
  const otherDatabase=new Database({url:databaseUrl,demo:true});await otherDatabase.transaction(async()=>{});
  const otherServer=createApi(otherDatabase).listen(0,'127.0.0.1');await once(otherServer,'listening');
  t.after(async()=>{otherServer.closeAllConnections();await new Promise<void>(resolve=>otherServer.close(()=>resolve()));await otherDatabase.close();});
  const otherBase=`http://127.0.0.1:${(otherServer.address() as {port:number}).port}/api/app`;
  const confirm=(url:string,id:string)=>fetch(url,{method:'POST',headers:{cookie:admin.cookie,'Content-Type':'application/json','X-Requested-With':'YerevanHub'},body:JSON.stringify({action:'updateBookingStatus',args:[id,'confirmed']})}).then(response=>response.json());
  const result=await Promise.all([confirm(base,first.id),confirm(otherBase,second.id)]);
  assert.equal(result.filter(item=>item.success).length,1);
  await database.transaction(async state=>assert.equal(state.bookings.filter(item=>item.hostelId===hostel.id&&item.status==='confirmed').reduce((total,item)=>total+item.quantity,0),1));
});

test('free-text translation is server-only, validates length and rate limits even without a configured provider',async t=>{
  const saved=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;t.after(()=>{if(saved===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=saved;});
  const {visitor}=await fixture(t);
  const unavailable=await visitor.action('translateText',['An unknown phrase','en','hy'],{'X-App-Language':'en'});
  assert.equal(unavailable.response.status,503);assert.match(unavailable.data.error,/not configured/);assert.equal(unavailable.data.translation,undefined);
  assert.equal((await visitor.action('translateText',['x'.repeat(2001),'en','hy'])).response.status,400);
  for(let count=0;count<9;count++)await visitor.action('translateText',['Another phrase','en','hy']);
  assert.equal((await visitor.action('translateText',['Another phrase','en','hy'])).response.status,429);
});

test('calendar pricing and minimum stays are enforced and an unused inferior coupon is not consumed',async t=>{
  const {completeHostel}=await import('./property-fixtures.js');
  const {client,visitor,booking,database}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);
  const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';
  hostel.roomTypes[1].pricingRules={minimumNights:3,weekendDays:[],weeklyDiscountPercent:20,monthlyDiscountPercent:30,overrides:[{id:crypto.randomUUID(),from:booking.checkIn,to:booking.checkOut,priceAMD:20000}]};
  assert.equal((await admin.action('saveHostel',[hostel])).data.success,true);
  const payload={...booking,hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,guestsCount:2,quantity:1};
  assert.equal((await visitor.action('createBooking',[payload])).data.success,false);
  await database.transaction(async state=>state.coupons.push({code:'LOWER',percent:5,minAmountAMD:0,maxUses:10,usedCount:0,active:true,startsAt:new Date(Date.now()-60000).toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),description:'Test coupon'}));
  const result=await visitor.action('createBooking',[{...payload,checkOut:addCalendarDays(booking.checkIn,7),couponCode:'LOWER'}]);
  assert.equal(result.data.success,true);const saved=result.data.booking;assert.equal(saved.baseAmountAMD,2*20000+5*18000);assert.equal(saved.finalAmountAMD,104000);assert.equal(saved.couponCode,undefined);assert.equal(saved.agreement.discountSource,'weekly');assert.equal(saved.agreement.nightlyLines.length,7);
  await database.transaction(async state=>assert.equal(state.coupons.find(item=>item.code==='LOWER')!.usedCount,0));
  const old=hostel.updatedAt;const stale=await visitor.action('createBooking',[{...payload,checkOut:addCalendarDays(booking.checkIn,7),expectedHostelUpdatedAt:old}]);assert.equal(stale.data.success,false);assert.match(stale.data.error,/تغییر/);
});

test('reception records external bookings, blocks maintenance, assigns physical units and records real check-in/out with role checks',async t=>{
 const {completeHostel}=await import('./property-fixtures.js');const {client,visitor}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';await admin.action('saveHostel',[hostel]);const room=hostel.roomTypes[0],from=yerevanToday(),to=addCalendarDays(from,2);
 assert.equal((await visitor.action('blockUnits',[{hostelId:hostel.id,roomTypeId:room.id,unitIds:[room.physicalUnits![0].id],from,to,reason:'Repair'}])).response.status,403);
 assert.equal((await admin.action('blockUnits',[{hostelId:hostel.id,roomTypeId:room.id,unitIds:[room.physicalUnits![0].id],from,to,reason:'Repair'}])).data.success,true);
 const request={hostelId:hostel.id,roomTypeId:room.id,guestName:'Walk in guest',guestContact:'guest@example.test',contactType:'email',checkIn:from,checkOut:to,guestsCount:1,quantity:1,source:'walk_in',reason:'Guest accepted property terms',acceptedTerms:true,idempotencyKey:crypto.randomUUID()};
 const booked=await admin.action('recordExternalBooking',[request]);assert.equal(booked.data.success,true);const booking=booked.data.booking;assert.equal(booking.status,'confirmed');assert.equal(booking.source,'walk_in');
 assert.equal((await admin.action('recordExternalBooking',[request])).data.booking.id,booking.id);
 assert.equal((await admin.action('assignUnits',[booking.id,[room.physicalUnits![0].id]])).response.status,400);
 assert.equal((await admin.action('assignUnits',[booking.id,[room.physicalUnits![1].id]])).data.success,true);
 assert.equal((await visitor.action('recordStayEvent',[booking.id,'check_in','Here'])).response.status,403);
 assert.equal((await admin.action('recordStayEvent',[booking.id,'check_in','Passport checked at reception'])).data.success,true);
 assert.equal((await admin.action('recordStayEvent',[booking.id,'no_show','Missing'])).data.success,false);
 assert.equal((await admin.action('recordStayEvent',[booking.id,'check_out','Guest departed'])).data.success,true);
 const saved=(await admin.get()).state.bookings.find(b=>b.id===booking.id)!;assert.ok(saved.checkedInAt);assert.ok(saved.checkedOutAt);assert.equal(saved.status,'completed');assert.ok(saved.history?.some(event=>event.action==='check_out'));
});

test('stay changes require token ownership, guest approval and a final transactional capacity check',async t=>{
 const {completeHostel}=await import('./property-fixtures.js');const {client,visitor,booking:base,database}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';await admin.action('saveHostel',[hostel]);const created=(await visitor.action('createBooking',[{...base,hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,guestsCount:2}])).data.booking;await admin.action('updateBookingStatus',[created.id,'confirmed']);const change={checkIn:created.checkIn,checkOut:addCalendarDays(created.checkOut,1),guestsCount:2,reason:'Extend one night'};
 assert.equal((await client().action('requestBookingChange',[created.id,change])).response.status,403);
 const proposal=(await visitor.action('requestBookingChange',[created.privateToken,change])).data.proposal;assert.equal(proposal.differenceAMD,18000);
 assert.equal((await admin.action('applyBookingChange',[proposal.id,'Approved'])).data.success,false);
 assert.equal((await client().action('acceptBookingChange',[proposal.id,'invalid-token'])).response.status,403);
 assert.equal((await visitor.action('acceptBookingChange',[proposal.id,created.privateToken])).data.success,true);
 await database.transaction(async state=>state.capacities.push({hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,date:created.checkOut,capacity:0}));
 assert.equal((await admin.action('applyBookingChange',[proposal.id,'Approved'])).data.success,false);
 await database.transaction(async state=>{state.capacities=[];});
 assert.equal((await admin.action('applyBookingChange',[proposal.id,'Approved after availability check'])).data.success,true);
 const saved=(await visitor.get(created.privateToken)).state.bookings[0];assert.equal(saved.checkOut,change.checkOut);assert.equal(saved.finalAmountAMD,54000);assert.ok(saved.history?.some(event=>event.action==='change_applied'));
 assert.equal((await admin.action('applyBookingChange',[proposal.id,'Again'])).data.success,false);
});

test('support is booking-scoped and financial collections are separate from reservation value',async t=>{
 const {completeHostel}=await import('./property-fixtures.js');const {financeSummary}=await import('../src/utils/finance.js');const {client,visitor,booking:base}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';hostel.commissionRule={type:'percent',value:10,appliesOn:'confirmed'};await admin.action('saveHostel',[hostel]);const b=(await visitor.action('createBooking',[{...base,hostelId:hostel.id,roomTypeId:hostel.roomTypes[0].id}])).data.booking;await admin.action('updateBookingStatus',[b.id,'confirmed']);
 const thread=(await visitor.action('createSupportThread',[b.privateToken,'arrival','Reception cannot find my booking'])).data.thread;
 assert.equal((await client().get()).state.supportThreads?.length,0);assert.equal((await client().action('replySupportThread',[thread.id,b.id,'Unrelated guest'])).response.status,403);
 assert.equal((await admin.action('replySupportThread',[thread.id,b.id,'Reception is checking'])).data.success,true);
 assert.equal((await visitor.action('resolveSupportThread',[thread.id,b.privateToken,'resolved','Close'])).response.status,403);
 let state=(await admin.get()).state;assert.equal(financeSummary(state.bookings,state.financeEntries??[]).propertyPayment,0);assert.equal(financeSummary(state.bookings,state.financeEntries??[]).expected,1000);
 const requestId=crypto.randomUUID();assert.equal((await admin.action('recordFinanceEntry',[b.id,'property_payment',5000,'Cash paid',requestId])).data.success,true);assert.equal((await admin.action('recordFinanceEntry',[b.id,'property_payment',5000,'Cash paid',requestId])).data.success,true);
 await admin.action('recordFinanceEntry',[b.id,'settlement',200,'Commission transfer',crypto.randomUUID()]);await admin.action('recordFinanceEntry',[b.id,'adjustment',-100,'Agreed reduction',crypto.randomUUID()]);
 state=(await admin.get()).state;const report=financeSummary(state.bookings,state.financeEntries??[]);assert.equal(report.propertyPayment,5000);assert.equal(report.expected,900);assert.equal(report.received,200);assert.equal(report.balance,700);
 assert.equal((await visitor.get(b.privateToken)).state.financeEntries?.length,0);
});

test('password recovery links expire, are single-use and revoke sessions; email verification proves booking claims',async t=>{
 const previous=process.env.APP_URL;process.env.APP_URL='https://example.test';t.after(()=>{if(previous===undefined)delete process.env.APP_URL;else process.env.APP_URL=previous;});
 const {client,visitor,database,booking}=await fixture(t);const guestBooking=(await visitor.action('createBooking',[booking])).data.booking;const account=client();const address='account-owner@example.test',oldPassword=crypto.randomUUID(),newPassword=crypto.randomUUID();await account.action('registerTraveler',['Account Owner',address,null,oldPassword]);
 assert.equal((await account.action('claimGuestBooking',[guestBooking.privateToken])).response.status,403);
 assert.equal((await account.action('requestEmailVerification',[])).data.success,true);
 let emailToken='';await database.transaction(async(_state,tx)=>{const rows=(await tx.execute("SELECT text FROM outbox WHERE recipient='account-owner@example.test' ORDER BY created_at DESC")).rows;emailToken=String(rows[0].text).match(/\/email\/([a-f0-9]{64})/)![1];});
 assert.equal((await account.action('verifyEmail',[emailToken])).data.success,true);assert.equal((await account.action('verifyEmail',[emailToken])).response.status,400);
 assert.equal((await account.action('claimGuestBooking',['wrong-token'])).response.status,403);assert.equal((await account.action('claimGuestBooking',[guestBooking.privateToken])).data.success,true);
 await account.action('mergeSavedPlaces',[['hostel:hostel-1']]);assert.deepEqual((await account.get()).state.savedPlaces,['hostel:hostel-1']);
 const other=client();await other.action('login',[address,oldPassword]);assert.equal((await other.get()).state.bookings[0].id,guestBooking.id);
 const known=await client().action('requestPasswordRecovery',[address,'en']),unknown=await client().action('requestPasswordRecovery',['missing-user@example.test','en']);assert.deepEqual(known.data,unknown.data);
 let recovery='';await database.transaction(async(_state,tx)=>{const rows=(await tx.execute("SELECT text FROM outbox WHERE recipient='account-owner@example.test' ORDER BY created_at DESC")).rows;recovery=rows.map(row=>String(row.text).match(/\/password\/([a-f0-9]{64})/)?.[1]).find(Boolean)!;});
 assert.equal((await client().action('resetPassword',[recovery,newPassword])).data.success,true);assert.equal((await other.get()).state.currentUser,null);assert.equal((await account.get()).state.currentUser,null);
 assert.equal((await client().action('resetPassword',[recovery,newPassword])).response.status,400);assert.equal((await client().action('login',[address,oldPassword])).data.success,false);
 const next=client();assert.equal((await next.action('login',[address,newPassword])).data.success,true);await next.action('requestPasswordRecovery',[address,'en']);
 await database.transaction(async(_state,tx)=>{await tx.execute('UPDATE auth_tokens SET expires_at=0');});let expired='';await database.transaction(async(_state,tx)=>{expired=String((await tx.execute("SELECT text FROM outbox WHERE recipient='account-owner@example.test' ORDER BY created_at DESC LIMIT 1")).rows[0].text).match(/\/password\/([a-f0-9]{64})/)![1];});assert.equal((await client().action('resetPassword',[expired,newPassword])).response.status,400);
});

test('scheduled work reminds once, expires requests and escalates without page visits or fake delivery',async t=>{
 const {scheduledWork}=await import('./jobs.js');const {visitor,booking,database}=await fixture(t);const b=(await visitor.action('createBooking',[booking])).data.booking;
 await database.transaction(async state=>{const entry=state.bookings.find(e=>e.id===b.id)!;entry.createdAt=new Date(Date.now()-7200000).toISOString();entry.expiresAt=new Date(Date.now()+3600000).toISOString();});
 const reminder=await scheduledWork(database,{deliver:false});assert.equal(reminder.reminders,1);assert.equal(reminder.sent,0);assert.equal((await scheduledWork(database,{deliver:false})).reminders,0);
 await database.transaction(async state=>{state.bookings.find(e=>e.id===b.id)!.expiresAt=new Date(Date.now()-1000).toISOString();});const expired=await scheduledWork(database,{deliver:false});assert.equal(expired.expired,1);assert.equal(expired.sent,0);
 await database.transaction(async state=>{const entry=state.bookings.find(e=>e.id===b.id)!;assert.equal(entry.status,'expired');assert.ok(entry.escalatedAt);});assert.equal((await scheduledWork(database,{deliver:false})).expired,0);
});

test('selected services and before-dawn previous-night pricing match the agreed booking; cancellation uses its frozen rule',async t=>{
 const {completeHostel,translatedFixture}=await import('./property-fixtures.js');const {client,visitor,database}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);const hostel=completeHostel();hostel.isPublished=true;hostel.listingStatus='published';hostel.earlyCheckInAvailable=true;hostel.earlyCheckInFeeAMD=1000;hostel.lateArrivalAvailable=true;hostel.lateArrivalFeeAMD=500;hostel.cancellationRule={freeBeforeHours:24,penaltyPercent:50};const service={id:crypto.randomUUID(),name:translatedFixture(),unit:'guest_night' as const,priceAMD:200,active:true};hostel.optionalServices=[service];await admin.action('saveHostel',[hostel]);
 const arrival=yerevanToday(),request={hostelId:hostel.id,roomTypeId:hostel.roomTypes[1].id,guestName:'Overnight guest',guestContact:'arrival@example.test',contactType:'email',guestsCount:2,quantity:1,checkIn:addCalendarDays(arrival,-1),checkOut:addCalendarDays(arrival,1),actualArrivalDate:arrival,arrivalMode:'previous_night',estimatedArrivalTime:'03:00'};
 const b=(await visitor.action('createBooking',[{...request,selectedServiceIds:[service.id]}])).data.booking;assert.ok(b);assert.equal(b.nights,2);assert.equal(b.extraServicesFeeAMD,800);assert.equal(b.earlyCheckInFeeAMD,0);assert.equal(b.lateCheckInFeeAMD,500);assert.equal(b.finalAmountAMD,37300);
 assert.equal((await visitor.action('createBooking',[{...request,checkIn:arrival}])).data.success,false);
 await admin.action('updateBookingStatus',[b.id,'confirmed']);hostel.cancellationRule={freeBeforeHours:0,penaltyPercent:0};await admin.action('saveHostel',[hostel]);assert.equal((await visitor.action('cancelBookingByGuest',[b.privateToken,'Travel plans changed'])).data.success,true);
 await database.transaction(async state=>{assert.equal(state.bookings.find(item=>item.id===b.id)!.cancellationChargeAMD,18650);assert.equal(state.financeEntries?.length,0);});
 assert.equal((await visitor.action('cancelBookingByGuest',[b.privateToken,'Retry'])).data.success,true);
});

test('articles preserve their primary language and accept only the translations actually entered',async t=>{
 const {client,visitor}=await fixture(t);const admin=client();await admin.action('login',['admin@yerevanhub.com','Admin@2026']);const now=new Date().toISOString(),article={id:crypto.randomUUID(),slug:'language-guide',title:'Original guide',summary:'Summary',content:'Original English content',category:'travel',tags:[],sources:[],language:'en',status:'published',featuredImage:'',author:'Editor',lastVerifiedDate:'',createdAt:now,updatedAt:now,translations:{}};
 assert.equal((await admin.action('saveArticle',[article])).data.success,true);const state=(await visitor.get()).state;const {publicPage}=await import('../src/utils/public-seo.js');assert.equal(publicPage(state,'/ru/guides/language-guide','https://example.test').status,404);
 const translated={...article,translations:{ru:{title:'Путеводитель',summary:'Описание',content:'Текст на русском'}}};assert.equal((await admin.action('saveArticle',[translated])).data.success,true);assert.ok(publicPage((await visitor.get()).state,'/ru/guides/language-guide','https://example.test').content.includes('Текст на русском'));
});

test('explicit public previews allow incomplete inventory but reject bookings and rental inquiries', async t => {
  const { newHostel, newRental } = await import('../src/utils/properties.js');
  const { visitor, client, booking } = await fixture(t);
  const admin = client();
  await admin.action('login', ['admin@yerevanhub.com', 'Admin@2026']);
  const localized = { fa: 'نمونه آزمایشی', en: 'Public demo', ru: 'Демонстрация', hy: 'Փորձնական' };
  const hostel = { ...newHostel(), slug: 'public-preview-hostel', name: localized, description: localized, city: 'Yerevan', publicPreview: true, sampleContent: true, isPublished: true, listingStatus: 'published' as const };
  const rental = { ...newRental(), slug: 'public-preview-rental', title: localized, description: localized, city: 'Yerevan', publicPreview: true, sampleContent: true, status: 'published' as const, addressExactInternal: 'PRIVATE ADDRESS', landlordInternalNotes: 'PRIVATE NOTES' };
  assert.equal((await visitor.action('saveHostel', [hostel])).response.status, 403);
  assert.equal((await admin.action('saveHostel', [{...hostel, description: { ...localized, hy: '' }}])).data.success, false);
  assert.equal((await admin.action('saveHostel', [hostel])).data.success, true);
  assert.equal((await admin.action('saveRental', [rental])).data.success, true);
  const { state } = await visitor.get();
  assert.equal(state.hostels.find(h => h.id === hostel.id)?.publicPreview, true);
  assert.equal(state.rentals.find(r => r.id === rental.id)?.publicPreview, true);
  assert.ok(!state.availability.some(day => day.hostelId === hostel.id));
  assert.ok(!JSON.stringify(state).includes('PRIVATE ADDRESS'));
  assert.ok(!JSON.stringify(state).includes('PRIVATE NOTES'));
  const rejected = await visitor.action('createBooking', [{...booking, hostelId: hostel.id}]);
  assert.equal(rejected.data.success, false);
  assert.match(rejected.data.error, /آزمایشی/);
  const inquiry = await visitor.action('createRentalInquiry', [{propertyId: rental.id, guestName: 'Test', contact: 'test@example.test', requestType: 'rent', desiredStartDate: booking.checkIn, desiredDurationText: '3 nights', residentsCount: 1}]);
  assert.equal(inquiry.data.success, false);
  assert.match(inquiry.data.error, /آزمایشی/);
  // Neither the preview badge nor the real-publication requirements can be removed by a forged payload.
  assert.equal((await admin.action('saveHostel', [{...hostel, sampleContent: false}])).data.success, false);
  assert.equal((await admin.action('saveHostel', [{...hostel, factsConfirmed: true}])).data.success, false);
  assert.equal((await admin.action('saveHostel', [{...hostel, publicPreview: false}])).data.success, false);
  assert.equal((await admin.action('saveRental', [{...rental, publicPreview: false}])).data.success, false);
  await admin.action('setHostelStatus', [hostel.id, 'hidden']);
  await admin.action('setRentalStatus', [rental.id, 'draft']);
  const hidden = (await visitor.get()).state;
  assert.ok(!hidden.hostels.some(h => h.id === hostel.id));
  assert.ok(!hidden.rentals.some(r => r.id === rental.id));
});
