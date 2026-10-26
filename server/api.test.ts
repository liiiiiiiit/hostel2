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
  return { database, base, client, visitor, hostel, booking };
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
  await database.transaction(async state=>{const entry=state.bookings.find(item=>item.privateToken===token)!;entry.checkOut=yerevanToday();});
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
