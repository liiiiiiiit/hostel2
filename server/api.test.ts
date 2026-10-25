import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { Database } from './database';
import { createApi } from './api';
import { addCalendarDays, yerevanToday } from '../src/utils/dates';
import { deliverNotifications } from './notifications';
import type { ClientState } from '../src/types/index';

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
  assert.ok(JSON.stringify((await client().get(token)).state.hostels).includes('PRIVATE-CODE-87'));
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
  const { readOnlyPreview }=await import('./preview');
  const state=readOnlyPreview();
  assert.equal(state.previewMode,true);assert.equal(state.demoMode,false);
  assert.equal(state.bookings.length,0);assert.equal(state.users.length,0);assert.equal(state.reviews.length,0);
  assert.ok(state.hostels.length>0);assert.ok(state.hostels.every(h=>h.verification?.status==='unverified' && !h.floorAndDoorCode));
});

test('Vercel API adapter serves read-only browsing and rejects writes without a database', async t => {
  const previous=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
  const {default:endpoint}=await import('../api/app');
  const {default:express}=await import('express');
  const app=express();app.all('/api/app',endpoint);
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/app`;
  try {
    const response=await fetch(base);const result=await response.json();
    assert.equal(response.status,200);assert.equal(result.state.previewMode,true);
    assert.equal((await fetch(base,{method:'POST'})).status,503);
  } finally {
    server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
    if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;
  }
});
