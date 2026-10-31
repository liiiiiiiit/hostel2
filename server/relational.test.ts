import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient, type Transaction, type TransactionMode, type InStatement } from '@libsql/client';
import { Database } from './database.js';
import { Store } from './domain.js';
import { rollbackRelational } from './relational-migration.js';
import { stableJSON } from './relational-store.js';
import { tables } from './relational-schema.js';
import { publicState } from './public-state.js';
import { mutationScope } from './repository.js';
import { addCalendarDays, yerevanToday } from '../src/utils/dates.js';
import { INITIAL_BOOKINGS } from './seed.js';
async function fixture(t: TestContext) {
    const directory = await mkdtemp(path.join(tmpdir(), 'yh-relational-'));
    const url = `file:${directory}/db.sqlite`;
    const db = new Database({ url, demo: true });
    await db.publicState();
    t.after(async () => { await db.close().catch(() => { }); await rm(directory, { recursive: true, force: true }); });
    return { db, url };
}
function instrument(db: Database) {
    const statements: {
        sql: string;
        rows: number;
        changed: number;
        mode: string;
    }[] = [];
    const original = db.client.transaction.bind(db.client);
    db.client.transaction = async (mode?: TransactionMode) => {
        const tx = await original(mode);
        const run = tx.execute.bind(tx);
        const batch = tx.batch.bind(tx);
        const sql = (query: InStatement) => typeof query === 'string' ? query : query.sql;
        tx.execute = async (query) => { const result = await run(query); statements.push({ sql: sql(query), rows: result.rows.length, changed: result.rowsAffected, mode: mode ?? 'write' }); return result; };
        tx.batch = async (queries) => { const result = await batch(queries); queries.forEach((query, i) => statements.push({ sql: sql(query), rows: result[i].rows.length, changed: result[i].rowsAffected, mode: mode ?? 'write' })); return result; };
        return tx;
    };
    return statements;
}
test('v3 migration preserves every legacy entity, optional fields, translations and unresolved historical review references', async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yh-legacy-v3-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const url = `file:${directory}/old.sqlite`, client = createClient({ url });
    const before = new Store(undefined, true).getState();
    before.hostels[0].description = { fa: 'متن فارسی', en: 'English', ru: 'Русский', hy: 'Հայերեն' };
    before.hostels[0].media = [{ id: crypto.randomUUID(), url: '/api/app?media=example', alt: { fa: 'عکس', en: 'Photo', ru: 'Фото', hy: 'Լուսանկար' } }];
    await client.execute('CREATE TABLE app_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
    await client.execute({ sql: 'INSERT INTO app_state VALUES(1,?)', args: [JSON.stringify(before)] });
    client.close();
    const db = new Database({ url, demo: false });
    await db.transaction(async (state, tx) => {
        assert.equal(stableJSON(state), stableJSON(before));
        assert.equal((await tx.execute('SELECT COUNT(*) AS n FROM schema_migrations')).rows[0].n, 3);
        assert.equal((await tx.execute('PRAGMA foreign_key_check')).rows.length, 0);
        assert.ok((await tx.execute('SELECT legacy_booking_id FROM reviews WHERE legacy_booking_id IS NOT NULL')).rows.length > 0);
        state.hostels[0].phone = 'LATEST-PHONE';
        state.articles[0].content = 'Latest article';
    });
    await db.close();
    const raw = createClient({ url });
    await raw.execute('PRAGMA foreign_keys=ON');
    await rollbackRelational(raw);
    const reverted = JSON.parse(String((await raw.execute('SELECT data FROM app_state')).rows[0].data));
    assert.equal(reverted.articles[0].content, 'Latest article');
    raw.close();
    const migratedAgain = new Database({ url, demo: false });
    await migratedAgain.transaction(async (state) => { assert.equal(state.hostels[0].phone, 'LATEST-PHONE'); assert.equal(state.articles[0].content, 'Latest article'); });
    await migratedAgain.close();
});
test('invalid legacy data aborts atomically without renaming or dropping the live v2 tables', async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yh-invalid-v3-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const url = `file:${directory}/old.sqlite`, client = createClient({ url });
    const state = new Store(undefined, true).getState();
    state.users[1].email = state.users[0].email.toUpperCase();
    await client.execute('CREATE TABLE app_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
    await client.execute({ sql: 'INSERT INTO app_state VALUES(1,?)', args: [JSON.stringify(state)] });
    client.close();
    const db = new Database({ url, demo: false });
    await assert.rejects(() => db.publicState());
    await db.close().catch(() => { });
    const check = createClient({ url });
    assert.equal((await check.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length, 0);
    assert.ok((await check.execute('SELECT data FROM app_state WHERE id=1')).rows.length);
    assert.ok((await check.execute('SELECT * FROM properties')).rows.length);
    assert.equal((await check.execute("SELECT name FROM sqlite_master WHERE name='legacy_properties_v2'")).rows.length, 0);
    check.close();
});
test('a property edit writes one row; no-op and public reads never rewrite the application or catalogue', async (t) => {
    const { db } = await fixture(t);
    const sql = instrument(db);
    await db.transaction(async (state) => { state.hostels[0].phone = 'JUST-ONE-EDIT'; });
    const changes = sql.filter(s => s.changed > 0);
    assert.equal(changes.length, 1);
    assert.match(changes[0].sql, /INSERT INTO "properties"/);
    sql.length = 0;
    await db.transaction(async () => { });
    assert.equal(sql.filter(s => s.changed > 0).length, 0);
    sql.length = 0;
    await db.publicState();
    assert.ok(sql.every(s => s.mode === 'read'));
    assert.ok(sql.every(s => s.changed === 0));
    assert.ok(!sql.some(s => /legacy_|app_state/.test(s.sql)));
    assert.ok(!sql.some(s => /user_credentials/.test(s.sql)));
});
test('public availability uses indexed SQL aggregates and reads no private historical booking rows', async (t) => {
    const { db } = await fixture(t);
    const today = yerevanToday();
    let expected: unknown;
    await db.transaction(async (state) => {
        const hostel = state.hostels[0], room = hostel.roomTypes[0];
        for (let i = 0; i < 300; i++)
            state.bookings.push({ ...structuredClone(INITIAL_BOOKINGS[0]), id: 'history-' + i, trackingCode: 'H-' + i, privateToken: 'private-history-' + i, hostelId: hostel.id, roomTypeId: room.id, checkIn: '2020-01-01', checkOut: '2020-01-02', status: 'completed' });
        state.bookings.push({ ...structuredClone(INITIAL_BOOKINGS[0]), id: 'current', trackingCode: 'CURRENT', privateToken: 'private-current', hostelId: hostel.id, roomTypeId: room.id, checkIn: today, checkOut: addCalendarDays(today, 2), quantity: 2, status: 'confirmed' });
        state.capacities.push({ hostelId: hostel.id, roomTypeId: room.id, date: today, capacity: 3 });
        expected = publicState(state, null, false).availability;
    });
    const queries = instrument(db);
    const visible = await db.publicState();
    assert.deepEqual(visible.availability, expected);
    assert.deepEqual(visible.bookings, []);
    assert.ok(queries.filter(q => /SELECT \* FROM "bookings"/.test(q.sql)).every(q => q.rows === 0));
    const plan = await db.sqlTransaction(tx => tx.execute({ sql: "EXPLAIN QUERY PLAN SELECT SUM(quantity) FROM bookings WHERE hostel_id=? AND room_type_id=? AND status='confirmed' AND check_in<=? AND check_out>?", args: ['hostel-1', 'rt-1-mixed-8', today, today] }), 'read');
    assert.match(JSON.stringify(plan.rows), /bookings_inventory/);
    assert.match(JSON.stringify(plan.rows), /check_out>\?/);
});
test('mutation scopes never load unrelated properties, users, archives or credentials', async (t) => {
    const { db } = await fixture(t);
    let target = '';
    await db.transaction(async (state) => { target = state.hostels[0].id; state.bookings.push({ ...structuredClone(INITIAL_BOOKINGS[0]), id: 'archive', trackingCode: 'ARCHIVE', privateToken: 'archive-token', status: 'completed' }); });
    await db.transaction(async (state) => {
        assert.equal(state.hostels.length, 1);
        assert.equal(state.hostels[0].id, target);
        assert.equal(state.bookings.length, 0);
        assert.deepEqual(state.credentials, {});
        assert.equal(state.users.filter(u => u.role === 'traveler').length, 0);
    }, { action: 'createBooking', args: [{ hostelId: target, idempotencyKey: crypto.randomUUID() }] });
    await db.sqlTransaction(async tx => {
        const scope = await mutationScope(tx, { action: 'createBooking', args: [{ hostelId: target }] });
        const plan = await tx.execute({ sql: `EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE ${scope.bookings!.sql} ORDER BY sort_order`, args: scope.bookings!.args ?? [] });
        assert.match(JSON.stringify(plan.rows), /bookings_hostel_active/);
        assert.match(JSON.stringify(plan.rows), /bookings_checked_in/);
        assert.doesNotMatch(JSON.stringify(plan.rows), /SCAN bookings/);
    }, 'read');
    await db.transaction(async (state) => { assert.equal(state.hostels.length, 0); assert.equal(state.bookings.length, 0); assert.equal(state.articles.length, 0); }, { action: 'translateText', args: ['hello', 'en', 'fa'] });
});
test('SQL constraints enforce foreign keys, unique accounts, room references and idempotency', async (t) => {
    const { db } = await fixture(t);
    await assert.rejects(() => db.sqlTransaction(async (tx) => { await tx.execute("INSERT INTO manager_properties(user_id,hostel_id,property_kind) VALUES('missing-user','hostel-1','hostel')"); }));
    await assert.rejects(() => db.sqlTransaction(async (tx) => { await tx.execute("INSERT INTO users(id,email,name,role,is_active,created_at) VALUES('duplicate','ADMIN@YEREVANHUB.COM','Duplicate','admin',1,'2026-01-01T00:00:00Z')"); }));
    const first = { ...structuredClone(INITIAL_BOOKINGS[0]), id: 'unique-one', trackingCode: 'UNIQUE-ONE', privateToken: 'unique-one', idempotencyKey: crypto.randomUUID() };
    await db.transaction(async (state) => { state.bookings.push(first); });
    await assert.rejects(() => db.transaction(async (state) => { state.bookings.push({ ...first, id: 'unique-two', trackingCode: 'UNIQUE-TWO', privateToken: 'unique-two' }); }));
    await assert.rejects(() => db.transaction(async (state) => { state.bookings.push({ ...first, id: 'orphan', trackingCode: 'ORPHAN', privateToken: 'orphan', idempotencyKey: undefined, roomTypeId: 'missing-room' }); }));
    await db.transaction(async (state) => { assert.equal(state.bookings.length, 1); });
});
test('all declared read/write tables have stable keys and existing indexes survive backup/restore', async (t) => {
    const { db } = await fixture(t);
    await db.sqlTransaction(async (tx) => {
        for (const table of tables)
            assert.ok(table.keys.length > 0);
        const foreign = (await tx.execute('PRAGMA foreign_keys')).rows[0];
        assert.equal(foreign.foreign_keys, 1);
        const indexes = (await tx.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")).rows;
        assert.ok(indexes.length >= 20);
    }, 'read');
});
test('photo/media reordering survives reload and scoped inserts preserve existing unrelated rows', async (t) => {
    const { db } = await fixture(t);
    const alt = { fa: 'عکس', en: 'Photo', ru: 'Фото', hy: 'Լուսանկար' };
    let id = '';
    await db.transaction(async (state) => { const h = state.hostels[0]; id = h.id; h.media = [{ id: 'image-a', url: '/photo-a', alt }, { id: 'image-b', url: '/photo-b', alt }]; h.photos = h.media.map(image => image.url); });
    await db.transaction(async (state) => { const h = state.hostels[0]; h.media!.reverse(); h.photos = h.media!.map(image => image.url); }, { action: 'saveHostel', args: [{ id, slug: '' }] });
    await db.transaction(async (state) => { const h = state.hostels.find(h => h.id === id)!; assert.deepEqual(h.media!.map(image => image.id), ['image-b', 'image-a']); assert.deepEqual(h.photos, ['/photo-b', '/photo-a']); assert.equal(state.hostels.length, 4); });
});
