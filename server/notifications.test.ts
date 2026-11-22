import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Database } from './database.js';
import { deliverNotifications } from './notifications.js';

test('an interrupted final notification attempt expires to failed without resending or stealing a live lease', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yh-notification-lease-'));
  const database = new Database({ url: `file:${directory}/test.db`, demo: false });
  t.after(async () => { await database.close(); await rm(directory, { recursive: true, force: true }); });
  await database.sqlTransaction(async tx => {
    for (const [id, next] of [['expired-final-attempt', Date.now() - 1000], ['active-final-attempt', Date.now() + 60_000]] as const) {
      await tx.execute({ sql: "INSERT INTO outbox(id,channel,recipient,subject,text,status,attempts,next_attempt,created_at) VALUES(?,'email','test@example.test','Test','Test','sending',5,?,?)", args: [id, next, Date.now()] });
    }
  });
  let calls = 0;
  const result = await deliverNotifications(database, async () => { calls++; return Response.json({}); });
  assert.deepEqual(result, { attempted: 0, sent: 0 });
  assert.equal(calls, 0);
  const rows = await database.sqlTransaction(async tx => (await tx.execute('SELECT id,status FROM outbox')).rows, 'read');
  assert.equal(rows.find(row => row.id === 'expired-final-attempt')?.status, 'failed');
  assert.equal(rows.find(row => row.id === 'active-final-attempt')?.status, 'sending');
});

test('concurrent workers on independent database clients claim a queued notification only once', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'yh-worker-race-')),url=`file:${directory}/test.db`;
  const database=new Database({url,demo:false}),other=new Database({url,demo:false});
  const previous={RESEND_API_KEY:process.env.RESEND_API_KEY,NOTIFICATION_FROM:process.env.NOTIFICATION_FROM};
  t.after(async()=>{for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;await database.close();await other.close();await rm(directory,{recursive:true,force:true});});
  await database.waitUntilReady();await other.waitUntilReady();
  await database.sqlTransaction(async tx=>{await tx.execute({sql:"INSERT INTO outbox(id,channel,recipient,subject,text,created_at) VALUES(?,'email','test@example.test','Test','Test',?)",args:[crypto.randomUUID(),Date.now()]});});
  process.env.RESEND_API_KEY='test-only';process.env.NOTIFICATION_FROM='test@example.test';
  let calls=0;const send:typeof fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,20));return Response.json({id:'mock'});};
  const results=await Promise.all([deliverNotifications(database,send),deliverNotifications(other,send)]);
  assert.equal(calls,1);assert.equal(results.reduce((n,r)=>n+r.sent,0),1);
  assert.equal((await database.client.execute('SELECT status FROM outbox')).rows[0].status,'sent');
});
