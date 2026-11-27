import { moderationDetail, moderateContent, moderationPage, moderationQuery, moderationHistory, moderationHistoryQuery } from './moderation.js';
import { moderationReady, migrateModeration } from './moderation-storage.js';
import { contentModules, moderationStates, moderationTransitions, type ContentModule, type ModerationStatus } from '../src/types/moderation.js';
import { moderationText } from '../src/i18n/moderation.js';
import { completeHostel, completeRental } from './property-fixtures.js';
import { Store } from './domain.js';
import { sitemap, renderPublicHtml } from './public-pages.js';
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
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
    await db.publicState();
    const admin = client();
    assert.equal((await admin.action('login', ['admin@example.test', password])).data.success, true);
    const adminUser = (await admin.get('/api/app')).data.state.currentUser as User;
    async function traveler() { const c = client(), email = randomUUID() + '@example.test'; const result = await c.action('registerTraveler', ['Synthetic seeker', email, '', password]); assert.equal(result.data.success, true, result.data.error); return { c, user: result.data.state.currentUser as User }; }
    async function job(owner = adminUser) { const value = jobInput.parse({ id: randomUUID(), version: 0, title: 'Synthetic role', company: 'Fictional company', location: 'Yerevan', schedule: 'Full time', description: 'Synthetic job only', contact: 'jobs@example.test', salary: 200000, period: 'month', status: 'open' }); await db.sqlTransaction(tx => saveJob(tx, owner, value)); return { ...value, version: 1 }; }
    const input = (jobId: string, extra = {}) => applicationInput.parse({ requestId: randomUUID(), jobId, version: 1, name: 'Synthetic seeker', contact: 'seeker@example.test', message: 'Fictional application', ...extra });
    return { root, db, admin, adminUser, client, traveler, job, input, password };
}
async function employer(f: Awaited<ReturnType<typeof fixture>>) { const c = f.client(), email = randomUUID() + '@example.test'; const r = await f.admin.action('saveProvider', [{ name: 'SYNTHETIC employer', email, password: f.password, phone: '', organization: 'Fictional agency', role: 'job_provider', isActive: true }]); assert.equal(r.data.success, true, r.data.error); assert.equal((await c.action('login', [email, f.password])).data.success, true); return { c, user: (await c.get('/api/app')).data.state.currentUser as User }; }
const until = () => new Date(Date.now() + 30 * 86400000).toISOString();
const listing = () => ({ id: randomUUID(), version: 0, title: 'SYNTHETIC role', company: 'Fictional agency', location: 'Yerevan', schedule: 'Full time', description: 'Fictional requirements', contact: 'jobs@example.test', salary: 200000, period: 'month' as const, status: 'open' as const });
async function publish(f: Awaited<ReturnType<typeof fixture>>, owner: Awaited<ReturnType<typeof employer>>) { const job = listing(); assert.equal((await owner.c.action('saveRecruitmentJob', [{ job, publication: 'pending', expiresAt: until(), moderationNote: '' }])).data.success, true); assert.equal((await f.admin.action('saveRecruitmentJob', [{ job: { ...job, version: 1 }, publication: 'approved', expiresAt: until(), moderationNote: '' }])).data.success, true); return { ...job, version: 2 }; }
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function detail(f: Fixture, module: ContentModule, id: string) { return f.db.sqlTransaction(tx => moderationDetail(tx, f.adminUser, module, id), 'read'); }
async function decide(f: Fixture, module: ContentModule, id: string, status: ModerationStatus) { const target = await detail(f, module, id); return f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, { targets: [{ module, id, version: target.version, contentVersion: target.contentVersion }], status, note: 'SYNTHETIC reviewed decision', confirmed: true })); }
async function seedAll(f: Fixture) {
    const hostel = { ...completeHostel(), isPublished: true, listingStatus: 'published' as const };
    const rental = { ...completeRental(), status: 'published' as const };
    assert.equal((await f.admin.action('saveHostel', [hostel])).data.success, true);
    assert.equal((await f.admin.action('saveRental', [rental])).data.success, true);
    const job = await f.job();
    const tour = { id: randomUUID(), version: 0, title: 'SYNTHETIC Tour', organizer: 'Synthetic guide', destination: 'Garni', departure: 'Yerevan', schedule: 'Daily', duration: '1 day', description: 'Fictional tour', contact: 'guide@example.test', price: 100, published: true, hidden: false, approved: true, capacity: 10 };
    assert.equal((await f.admin.action('saveTour', [tour])).data.success, true);
    const tr = (v: string) => ({ fa: v, en: v, ru: v, hy: v }), categoryId = String((await f.db.client.execute('SELECT id FROM service_categories LIMIT 1')).rows[0].id);
    const service = { id: randomUUID(), version: 0, slug: 'synthetic-clinic', categoryId, isActive: true, isFeatured: true, isVerified: false, allowBookingRequest: true, title: tr('SYNTHETIC clinic'), shortDescription: tr('Short'), description: tr('Full'), address: tr('Yerevan'), workingHours: tr('09–18'), priceRange: tr('AMD'), coverImage: 'https://example.test/cover.webp', gallery: [], phone: '+37491123456', whatsapp: '', telegram: '', instagram: '', website: '', city: 'Yerevan', district: 'Kentron', mapUrl: '', latitude: null, longitude: null, languagesSpoken: ['fa'], highlights: [] };
    assert.equal((await f.admin.action('saveService', [service])).data.success, true);
    const article = { id: randomUUID(), slug: 'synthetic-guide', title: 'SYNTHETIC article', summary: 'Summary', category: 'Guide', content: 'Fictional guide', tags: [], sources: [], featuredImage: '', author: 'Synthetic author', language: 'en', status: 'published', lastVerifiedDate: '', createdAt: '', updatedAt: '' };
    assert.equal((await f.admin.action('saveArticle', [article])).data.success, true);
    const review = randomUUID();
    // Representative historical review with an explicit legacy booking reference.
    await f.db.sqlTransaction(tx => tx.execute({ sql: "INSERT INTO reviews(id,hostel_id,property_kind,legacy_booking_id,hostel_name,guest_name,comment,status,admin_reply,created_at,rating,scores) VALUES(?,?,'hostel',?,'SYNTHETIC hostel','SYNTHETIC guest','SYNTHETIC review','approved','',?,5,'{}')", args: [review, hostel.id, randomUUID(), new Date().toISOString()] }));
    return { ids: { hostel: hostel.id, rental: rental.id, job: job.id, tour: tour.id, service: service.id, article: article.id, review }, hostel, rental, service, tour, article, job };
}
test('seven-module moderation separates approval/publication, gates API/direct pages/sitemaps and never grants verification', async (t) => {
    const f = await fixture(t), seed = await seedAll(f);
    for (const module of contentModules) {
        const id = seed.ids[module];
        assert.equal((await detail(f, module, id)).status, 'published');
        await decide(f, module, id, 'changes_requested');
        await decide(f, module, id, 'approved');
        const state = await f.db.publicState();
        const collection = { hostel: state.hostels, rental: state.rentals, job: state.jobs!, tour: state.tours!, service: state.services!, article: state.articles, review: state.reviews }[module];
        assert(!collection.some(r => r.id === id), module + ' approved is not public');
        if (module === 'service')
            assert.equal((await f.client().get('/api/services/' + seed.service.slug)).status, 404);
        const path = module === 'hostel' ? '/en/hostels/' + seed.hostel.slug : module === 'rental' ? '/en/rentals/' + seed.rental.slug : module === 'article' ? '/en/guides/' + seed.article.slug : module === 'service' ? '/en/services/' + seed.service.slug : null;
        if (path)
            assert.equal(renderPublicHtml('<html><head></head><body></body></html>', state, path, 'https://example.test').status, 404, module + ' direct page');
        if (module === 'hostel')
            assert(!sitemap(state, 'https://example.test').includes(seed.hostel.slug));
        if (module === 'rental')
            assert(!sitemap(state, 'https://example.test').includes(seed.rental.slug));
        if (module === 'article')
            assert(!sitemap(state, 'https://example.test').includes(seed.article.slug));
        await decide(f, module, id, 'published');
        assert.equal((await detail(f, module, id)).status, 'published');
        if (path)
            assert.equal(renderPublicHtml('<html><head></head><body></body></html>', await f.db.publicState(), path, 'https://example.test').status, 200, module + ' published detail');
    }
    const state = await f.db.publicState();
    assert.equal(state.services!.find(s => s.id === seed.ids.service)!.isVerified, false);
    assert.equal(state.hostels.find(h => h.id === seed.ids.hostel)!.verification?.status, 'unverified');
    assert.equal(state.rentals.find(r => r.id === seed.ids.rental)!.verifiedBadge, false);
    await decide(f, 'service', seed.ids.service, 'suspended');
    const request = await f.client().action('requestService', [{ requestId: randomUUID(), serviceId: seed.ids.service, version: 3, name: 'Synthetic visitor', contact: '+37491123456', preferredDate: '', note: '' }]);
    assert.equal(request.data.success, false);
    assert.equal((await f.db.client.execute('PRAGMA integrity_check')).rows[0].integrity_check, 'ok');
    assert.equal((await f.db.client.execute('PRAGMA foreign_key_check')).rows.length, 0);
});
test('every supported transition is enforced natively; illegal transitions and empty required reasons are rejected', async (t) => {
    const f = await fixture(t);
    for (const from of moderationStates)
        for (const to of moderationStates) {
            const job = await f.job();
            // Set an isolated starting condition, then exercise the real policy/action.
            await f.db.client.execute({ sql: 'UPDATE content_moderation SET status=? WHERE module=\'job\' AND content_id=?', args: [from, job.id] });
            if (moderationTransitions[from].includes(to))
                await decide(f, 'job', job.id, to);
            else
                await assert.rejects(() => decide(f, 'job', job.id, to));
        }
    const job = await f.job(), target = await detail(f, 'job', job.id);
    await assert.rejects(() => f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, { targets: [{ module: 'job', id: job.id, version: target.version, contentVersion: target.contentVersion }], status: 'suspended', note: '', confirmed: true })));
    assert.equal((await detail(f, 'job', job.id)).status, 'published');
});
test('guest/traveler/provider/expired/disabled sessions cannot moderate or read the administrative queue', async (t) => {
    const f = await fixture(t), owner = await employer(f), traveler = await f.traveler(), job = await publish(f, owner), target = await detail(f, 'job', job.id);
    const payload = { targets: [{ module: 'job', id: job.id, version: target.version, contentVersion: target.contentVersion }], status: 'suspended', note: 'Unauthorized', confirmed: true };
    for (const actor of [f.client(), owner.c, traveler.c]) {
        assert.equal((await actor.get('/api/admin/moderation')).status, 403);
        assert.equal((await actor.get('/api/admin/moderation/history?module=job&id='+job.id)).status,403);
        assert.equal((await actor.action('moderateContent', [payload])).status, 403);
    }
    await f.db.client.execute('UPDATE sessions SET expires_at=0');
    assert.equal((await f.admin.get('/api/admin/moderation')).status, 403);
    await f.db.client.execute({ sql: 'UPDATE users SET is_active=0 WHERE id=?', args: [f.adminUser.id] });
    await assert.rejects(() => f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, payload)));
    const actualTraveler = traveler.user;
    await assert.rejects(() => f.db.sqlTransaction(tx => moderateContent(tx, { ...actualTraveler, role: 'admin' }, payload))); // live DB role, not payload authority
});
test('bulk decisions are atomic, reject stale content and metadata, and roll back on audit failures', async (t) => {
    const f = await fixture(t), a = await f.job(), b = await f.job();
    const targets = await Promise.all([detail(f, 'job', a.id), detail(f, 'job', b.id)]);
    const payload = { targets: targets.map(({ module, id, version, contentVersion }) => ({ module, id, version, contentVersion })), status: 'suspended', note: 'Reviewed batch', confirmed: true };
    await f.db.client.execute("CREATE TRIGGER fail_moderation_audit BEFORE INSERT ON moderation_events BEGIN SELECT RAISE(ABORT,'injected audit failure'); END");
    await assert.rejects(() => f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, payload)));
    for (const item of targets)
        assert.deepEqual(await detail(f, 'job', item.id), item);
    await f.db.client.execute('DROP TRIGGER fail_moderation_audit');
    await f.db.client.execute({ sql: 'UPDATE job_postings SET description=? WHERE id=?', args: ['Concurrent material edit', b.id] });
    await assert.rejects(() => f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, payload)));
    assert.equal((await detail(f, 'job', a.id)).status, 'published');
    const current = await detail(f, 'job', a.id), one = { targets: [{ module: 'job', id: a.id, version: current.version, contentVersion: current.contentVersion }], status: 'suspended', note: 'Concurrent decision', confirmed: true };
    const db2 = new Database({ url: process.env.DATABASE_URL });
    await db2.waitUntilReady();
    try {
        const results = await Promise.allSettled([f.db.sqlTransaction(tx => moderateContent(tx, f.adminUser, one)), db2.sqlTransaction(tx => moderateContent(tx, f.adminUser, one))]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    }
    finally {
        await db2.close();
    }
});
test('provider material edits require re-review, feedback is scoped, and legacy editors cannot undo sanctions', async (t) => {
    const f = await fixture(t), owner = await employer(f), peer = await employer(f), job = await publish(f, owner);
    await decide(f, 'job', job.id, 'changes_requested');
    let own = (await owner.c.get('/api/app')).data.state.jobs.find(j => j.id === job.id);
    assert.equal(own.moderationFeedback, 'SYNTHETIC reviewed decision');
    assert(!(await peer.c.get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: { ...own, description: 'Corrected requirements' }, publication: 'pending', expiresAt: null, moderationNote: '' }])).data.success, true);
    assert.equal((await detail(f, 'job', job.id)).status, 'pending_review');
    await decide(f, 'job', job.id, 'published');
    await decide(f, 'job', job.id, 'suspended');
    own = (await f.admin.get('/api/app')).data.state.jobs.find(j => j.id === job.id);
    assert.equal((await f.admin.action('saveJob', [{ ...own, approved: true, title: 'Legacy editor attempted publication' }])).data.success, true);
    assert.equal((await detail(f, 'job', job.id)).status, 'suspended');
    assert(!(await f.db.publicState()).jobs!.some(j => j.id === job.id));
    assert.equal((await f.db.client.execute({ sql: 'SELECT approved FROM job_postings WHERE id=?', args: [job.id] })).rows[0].approved, 0);
    await decide(f, 'job', job.id, 'archived');
    await decide(f, 'job', job.id, 'draft');
    await decide(f, 'job', job.id, 'published');
    assert((await f.db.publicState()).jobs!.some(j => j.id === job.id));
});
test('migration is additive/idempotent, preserves old rows, guards backups and fails transactionally', async (t) => {
    const f = await fixture(t), job = await f.job();
    await f.db.client.batch(['DROP TABLE content_moderation', 'DROP TABLE moderation_events', "DELETE FROM module_migrations WHERE name='content-moderation-v1'"], 'write');
    const before = (await f.db.client.execute('SELECT * FROM job_postings')).rows;
    const oldSnapshot = await exportSnapshot(f.db.client);
    const digests = (snapshot: typeof oldSnapshot) => Object.fromEntries(snapshot.tables.filter(t => !['module_migrations', 'content_moderation', 'moderation_events'].includes(t.name)).map(t => [t.name, createHash('sha256').update(JSON.stringify(t.rows)).digest('hex')]));
    const oldDigests = digests(oldSnapshot);
    assert.equal(await moderationReady(f.db.client), false);
    assert.equal(await pendingMigrations(f.db.client), true);
    await assert.rejects(() => guardMigrations(f.db.client, undefined, { ...process.env, REQUIRE_MIGRATION_BACKUP: 'true' }));
    const backup = await createVerifiedBackup(f.db.client, f.root + '/recovery', process.env.BACKUP_ENCRYPTION_KEY!);
    await guardMigrations(f.db.client, backup.file, { ...process.env, REQUIRE_MIGRATION_BACKUP: 'true' });
    await f.db.client.execute("CREATE TRIGGER fail_moderation_migration BEFORE INSERT ON module_migrations WHEN NEW.name='content-moderation-v1' BEGIN SELECT RAISE(ABORT,'injected migration failure'); END");
    await assert.rejects(() => migrateModeration(f.db.client));
    assert.equal((await f.db.client.execute("SELECT name FROM sqlite_master WHERE name='content_moderation'")).rows.length, 0);
    await f.db.client.execute('DROP TRIGGER fail_moderation_migration');
    await migrateModeration(f.db.client);
    await migrateModeration(f.db.client);
    assert.equal(await moderationReady(f.db.client), true);
    assert.deepEqual((await f.db.client.execute('SELECT * FROM job_postings')).rows, before);
    assert.deepEqual(digests(await exportSnapshot(f.db.client)), oldDigests);
    assert.equal((await f.db.client.execute('SELECT * FROM content_moderation')).rows.length, 0);
    assert.equal((await detail(f, 'job', job.id)).status, 'published'); // legacy visibility retained
    const restored = createClient({ url: 'file:' + f.root + '/restored.db' });
    try {
        await restoreSnapshot(restored, (await verifyBackup(backup.file, process.env.BACKUP_ENCRYPTION_KEY!)).snapshot, f.root + '/restored-media');
        await migrateModeration(restored);
        assert.deepEqual((await restored.execute('SELECT * FROM job_postings')).rows, before);
        assert.equal((await restored.execute('PRAGMA foreign_key_check')).rows.length, 0);
    }
    finally {
        restored.close();
    }
});
test('locale keys, Unicode filters, pagination and native validation remain strict', async (t) => {
    const f = await fixture(t);
    for (let i = 0; i < 22; i++) {
        const job = await f.job();
        await f.db.client.execute({ sql: 'UPDATE job_postings SET title=? WHERE id=?', args: ['ПРОВЕРКА ' + i, job.id] });
    }
    const first = await f.db.sqlTransaction(tx => moderationPage(tx, f.adminUser, moderationQuery.parse({ module: 'job', status: 'published', search: 'проверка' })), 'read');
    assert.equal(first.total, 22);
    assert.equal(first.items.length, 20);
    const second = await f.db.sqlTransaction(tx => moderationPage(tx, f.adminUser, moderationQuery.parse({ module: 'job', status: 'published', search: 'проверка', page: 2 })), 'read');
    assert.equal(second.items.length, 2);
    for (const lang of ['fa', 'en', 'ru', 'hy'] as const) {
        assert.deepEqual(Object.keys(moderationText[lang]), Object.keys(moderationText.en));
        assert(Object.values(moderationText[lang]).every(v => v.length));
    }
    const tracked = first.items[0];
    for (let i = 0; i < 55; i++)
        await f.db.client.execute({ sql: 'INSERT INTO moderation_events VALUES(?,?,?,?,?,?,?,?)', args: [randomUUID(), 'job', tracked.id, 'draft', 'pending_review', 'Synthetic history ' + i, f.adminUser.id, new Date().toISOString()] });
    const recent = await detail(f, 'job', tracked.id);
    assert.equal(recent.history.length, 50);
    const last = recent.history.at(-1)!, older = await f.db.sqlTransaction(tx => moderationHistory(tx, f.adminUser, moderationHistoryQuery.parse({ module: 'job', id: tracked.id, beforeTime: last.createdAt, beforeId: last.id })), 'read');
    assert.equal(older.items.length, recent.historyTotal - 50);
    assert(!older.items.some(e => recent.history.some(r => r.id === e.id)));
    const closed=await f.job();await f.db.sqlTransaction(tx=>recruitmentAction(tx,f.adminUser,'closeRecruitmentJob',[closed.id,1]));
    await decide(f,'job',closed.id,'changes_requested');await decide(f,'job',closed.id,'published');
    assert.equal((await f.db.client.execute({sql:'SELECT status FROM job_postings WHERE id=?',args:[closed.id]})).rows[0].status,'closed');
    assert(!(await f.db.publicState()).jobs!.some(j=>j.id===closed.id));
    const incomplete = listing();
    await f.db.sqlTransaction(tx => recruitmentAction(tx, f.adminUser, 'saveRecruitmentJob', [{ job: { ...incomplete, description: '' }, publication: 'draft', expiresAt: null, moderationNote: '' }]));
    await assert.rejects(() => decide(f, 'job', incomplete.id, 'published'));
});
