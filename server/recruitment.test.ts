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
async function employer(f: Awaited<ReturnType<typeof fixture>>) { const c = f.client(), email = randomUUID() + '@example.test'; const r = await f.admin.action('saveProvider', [{ name: 'SYNTHETIC employer', email, password: f.password, phone: '', organization: 'Fictional agency', role: 'job_provider', isActive: true }]); assert.equal(r.data.success, true, r.data.error); assert.equal((await c.action('login', [email, f.password])).data.success, true); return { c, user: (await c.get('/api/app')).data.state.currentUser as User }; }
const until = () => new Date(Date.now() + 30 * 86400000).toISOString();
const listing = () => ({ id: randomUUID(), version: 0, title: 'SYNTHETIC role', company: 'Fictional agency', location: 'Yerevan', schedule: 'Full time', description: 'Fictional requirements', contact: 'jobs@example.test', salary: 200000, period: 'month' as const, status: 'open' as const });
async function publish(f: Awaited<ReturnType<typeof fixture>>, owner: Awaited<ReturnType<typeof employer>>) { const job = listing(); assert.equal((await owner.c.action('saveRecruitmentJob', [{ job, publication: 'pending', expiresAt: until(), moderationNote: '' }])).data.success, true); assert.equal((await f.admin.action('saveRecruitmentJob', [{ job: { ...job, version: 1 }, publication: 'approved', expiresAt: until(), moderationNote: '' }])).data.success, true); return { ...job, version: 2 }; }
test('organization, real drafts, moderation, closure, renewal and scoped publication statistics', async (t) => {
    const f = await fixture(t), owner = await employer(f), peer = await employer(f);
    assert.equal((await f.client().get('/api/recruitment')).status, 403);
    const org = (await owner.c.get('/api/recruitment')).data.organization;
    assert.equal((await peer.c.action('saveEmployerOrganization', [{ ...org, name: 'forged' }])).status, 403);
    assert.equal((await owner.c.action('saveEmployerOrganization', [{ ...org, name: 'SYNTHETIC business', description: 'Private organization', website: 'https://example.test' }])).data.success, true);
    assert.equal((await owner.c.action('saveEmployerOrganization', [org])).status, 400);
    const job = { ...listing(), description: '', location: '', schedule: '', contact: '' };
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job, publication: 'draft', expiresAt: null, moderationNote: '' }])).data.success, true);
    assert(!(await f.client().get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await owner.c.get('/api/recruitment')).data.stats.drafts, 1);
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: { ...job, version: 1 }, publication: 'pending', expiresAt: null, moderationNote: '' }])).status, 400);
    const complete = { ...job, location: 'Yerevan', schedule: 'Daily', contact: 'jobs@example.test', description: 'Complete fictional requirements', version: 1 };
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: complete, publication: 'pending', expiresAt: until(), moderationNote: 'forged admin reason' }])).status, 403);
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: complete, publication: 'approved', expiresAt: until(), moderationNote: '' }])).status, 403);
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: complete, publication: 'pending', expiresAt: until(), moderationNote: '' }])).data.success, true);
    assert.equal((await peer.c.action('closeRecruitmentJob', [job.id, 2])).status, 400);
    assert.equal((await f.admin.action('saveRecruitmentJob', [{ job: { ...complete, version: 2 }, publication: 'rejected', expiresAt: null, moderationNote: 'SYNTHETIC private moderation reason' }])).data.success, true);
    assert(!JSON.stringify((await f.client().get('/api/app')).data).includes('SYNTHETIC private moderation reason'));
    assert.equal((await owner.c.action('saveRecruitmentJob', [{ job: { ...complete, version: 3 }, publication: 'pending', expiresAt: until(), moderationNote: '' }])).data.success, true);
    assert.equal((await f.admin.action('saveRecruitmentJob', [{ job: { ...complete, version: 4 }, publication: 'approved', expiresAt: until(), moderationNote: '' }])).data.success, true);
    assert((await f.client().get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await owner.c.action('closeRecruitmentJob', [job.id, 5])).data.success, true);
    assert.equal((await owner.c.action('renewRecruitmentJob', [job.id, 6, until()])).data.success, true);
    assert(!(await f.client().get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await owner.c.get('/api/recruitment')).data.stats.pending, 1);
    assert.equal((await peer.c.get('/api/recruitment?ownerId=' + owner.user.id)).status, 403);
    assert.equal((await f.admin.get('/api/recruitment?ownerId=' + owner.user.id)).data.organization.name, 'SYNTHETIC business');
});
test('account-linked pipeline, private notes, proposed interviews, scoped CV access, outcomes and audit', async (t) => {
    const f = await fixture(t), owner = await employer(f), peer = await employer(f), candidate = await f.traveler(), job = await publish(f, owner);
    const upload = await candidate.c.upload(), doc = await upload.json();
    const r = await candidate.c.action('applyForJob', [f.input(job.id, { version: 2, consent: true, documentId: doc.id })]);
    assert.equal(r.data.success, true, r.data.error);
    const ref = r.data.applicationReference;
    assert.equal((await peer.c.action('reviewApplication', [ref, 'received', 'reviewing'])).status, 400);
    assert.equal((await owner.c.action('reviewApplication', [ref, 'received', 'interview_scheduled'])).status, 400);
    assert.equal((await owner.c.action('reviewApplication', [ref, 'received', 'shortlisted'])).data.success, true);
    assert.equal((await candidate.c.get()).data.applications[0].status, 'shortlisted');
    let app = (await owner.c.get('/api/recruitment')).data.applications.items[0];
    assert.equal((await peer.c.action('saveRecruitmentNote', [ref, app.noteVersion, 'other'])).status, 403);
    assert.equal((await owner.c.action('saveRecruitmentNote', [ref, app.noteVersion, 'SYNTHETIC-PRIVATE-NOTE'])).data.success, true);
    assert(!JSON.stringify((await candidate.c.get()).data).includes('SYNTHETIC-PRIVATE-NOTE'));
    assert(!JSON.stringify((await f.client().get('/api/app')).data).includes('SYNTHETIC-PRIVATE-NOTE'));
    const proposal = { reference: ref, previousStatus: 'shortlisted', previousId: null, startsAt: new Date(Date.now() + 86400000).toISOString(), minutes: 30, kind: 'video', location: 'SYNTHETIC meeting details' };
    assert.equal((await owner.c.action('scheduleRecruitmentInterview', [proposal])).data.success, true);
    app = (await owner.c.get('/api/recruitment')).data.applications.items[0];
    assert.equal(app.status, 'interview_scheduled');
    assert.equal(app.interviews[0].state, 'proposed');
    assert.equal((await candidate.c.get()).data.applications[0].interviews[0].state, 'proposed');
    assert.equal((await f.client().action('trackApplication', [ref])).data.applicationStatus, 'interview_scheduled');
    assert.equal((await peer.c.action('finishRecruitmentInterview', [app.interviews[0].id, 'cancelled', true])).status, 403);
    assert.equal((await owner.c.action('finishRecruitmentInterview', [app.interviews[0].id, 'completed', true])).status, 400);
    assert.equal((await owner.c.request('/api/job-applications/' + ref + '/resume')).status, 200);
    assert.equal((await peer.c.request('/api/job-applications/' + ref + '/resume')).status, 404);
    assert((await owner.c.get('/api/recruitment')).data.history.items.some(e => e.kind === 'cv_download_authorized'));
    await f.db.client.execute({ sql: 'UPDATE recruitment_interviews SET starts_at=? WHERE id=?', args: [new Date(Date.now() - 1000).toISOString(), app.interviews[0].id] });
    assert.equal((await owner.c.action('finishRecruitmentInterview', [app.interviews[0].id, 'completed', true])).data.success, true);
    assert.equal((await candidate.c.get()).data.applications[0].status, 'reviewing');
    assert.equal((await owner.c.action('reviewApplication', [ref, 'reviewing', 'accepted'])).data.success, true);
    assert.equal((await candidate.c.get()).data.applications[0].status, 'accepted');
    assert.equal((await owner.c.get('/api/recruitment')).data.applications.items[0].interviews[0].state, 'completed');
    assert.equal((await owner.c.action('reviewApplication', [ref, 'accepted', 'reviewing'])).status, 400);
    assert.equal((await candidate.c.action('withdrawJobApplication', [ref])).status, 400);
    const audit = (await f.admin.get('/api/recruitment')).data.history.items;
    assert(audit.some(e => e.kind === 'application_status_changed' && e.details.next === 'accepted'));
    assert(!JSON.stringify(audit).includes('SYNTHETIC-PRIVATE-NOTE'));
    assert.equal((await peer.c.get('/api/recruitment')).data.applications.total, 0);
});
test('interview races, cancellation, withdrawal and stale notes roll back without invented confirmations', async (t) => {
    const f = await fixture(t), owner = await employer(f), candidate = await f.traveler(), job = await publish(f, owner);
    const ref = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { version: 2, consent: true }), candidate.user));
    const proposal = { reference: ref, previousStatus: 'received', previousId: null, startsAt: new Date(Date.now() + 86400000).toISOString(), minutes: 45, kind: 'phone', location: 'SYNTHETIC contact only' };
    const results = await Promise.all([owner.c.action('scheduleRecruitmentInterview', [proposal]), owner.c.action('scheduleRecruitmentInterview', [proposal])]);
    assert.equal(results.filter(r => r.data.success).length, 1);
    assert.equal((await f.db.client.execute("SELECT COUNT(*) n FROM recruitment_interviews WHERE state='proposed'")).rows[0].n, 1);
    let app = (await owner.c.get('/api/recruitment')).data.applications.items[0];
    const version = app.noteVersion;
    assert.equal((await owner.c.action('saveRecruitmentNote', [ref, version, 'SYNTHETIC note'])).data.success, true);
    assert.equal((await owner.c.action('saveRecruitmentNote', [ref, version, 'stale overwrite'])).status, 400);
    assert.equal((await candidate.c.action('withdrawJobApplication', [ref])).data.success, true);
    app = (await owner.c.get('/api/recruitment')).data.applications.items[0];
    assert.equal(app.status, 'withdrawn');
    assert.equal(app.interviews[0].state, 'cancelled');
    assert.equal((await owner.c.action('saveRecruitmentNote', [ref, app.noteVersion, 'must reject'])).status, 400);
    assert.equal((await owner.c.action('reviewApplication', [ref, 'withdrawn', 'accepted'])).status, 400);
    assert.equal((await owner.c.action('scheduleRecruitmentInterview', [{ ...proposal, previousStatus: 'withdrawn' }])).status, 400);
    const n = (await f.db.client.execute("SELECT COUNT(*) n FROM recruitment_events WHERE kind='application_withdrawn'")).rows[0].n;
    assert.equal((await candidate.c.action('withdrawJobApplication', [ref])).data.success, true);
    assert.equal((await f.db.client.execute("SELECT COUNT(*) n FROM recruitment_events WHERE kind='application_withdrawn'")).rows[0].n, n);
});
test('expiration gates public, saved and apply paths; renewal preserves existing applications', async (t) => {
    const f = await fixture(t), owner = await employer(f), candidate = await f.traveler(), job = await publish(f, owner);
    assert.equal((await candidate.c.action('saveSeekerJob', [job.id, true])).data.success, true);
    const ref = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { version: 2, consent: true }), candidate.user));
    // Isolated clock fixture: represent an already expired listing without waiting days.
    await f.db.client.execute({ sql: 'UPDATE recruitment_jobs SET expires_at=? WHERE job_id=?', args: [new Date(Date.now() - 1000).toISOString(), job.id] });
    assert(!(await f.client().get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await candidate.c.get()).data.savedJobs[0].available, false);
    assert.equal((await f.client().action('applyForJob', [f.input(job.id, { version: 2 })])).status, 400);
    assert.equal((await (await f.traveler()).c.action('saveSeekerJob', [job.id, true])).status, 400);
    assert.equal((await owner.c.get('/api/recruitment')).data.stats.expired, 1);
    assert.equal((await owner.c.action('renewRecruitmentJob', [job.id, 2, until()])).data.success, true);
    assert.equal((await owner.c.get('/api/recruitment')).data.jobs.items[0].publication, 'pending');
    assert(!(await f.client().get('/api/app')).data.state.jobs.some(j => j.id === job.id));
    assert.equal((await f.admin.action('saveRecruitmentJob', [{ job: { ...job, version: 3 }, publication: 'approved', expiresAt: until(), moderationNote: '' }])).data.success, true);
    assert.equal((await candidate.c.get()).data.applications[0].reference, ref);
    assert.equal((await candidate.c.get()).data.savedJobs[0].available, true);
});
test('Unicode search, pagination, scope, statistics and audit failure atomicity', async (t) => {
    const f = await fixture(t), owner = await employer(f), peer = await employer(f), job = await publish(f, owner), other = await publish(f, peer);
    for (let i = 0; i < 13; i++)
        await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { version: 2, name: i === 12 ? 'ТЕСТ Кандидат' : 'SYNTHETIC ' + i })));
    await f.db.sqlTransaction(tx => applyForJob(tx, f.input(other.id, { version: 2 })));
    const first = (await owner.c.get('/api/recruitment')).data;
    assert.equal(first.stats.applications, 13);
    assert.equal(first.applications.items.length, 10);
    assert.equal((await owner.c.get('/api/recruitment?page=2')).data.applications.items.length, 3);
    assert.equal((await owner.c.get('/api/recruitment?applicantSearch=' + encodeURIComponent('тест'))).data.applications.total, 1);
    assert.equal((await peer.c.get('/api/recruitment')).data.stats.applications, 1);
    assert.equal((await owner.c.get('/api/recruitment?page=0')).status, 400);
    const ref = first.applications.items[0].reference;
    await f.db.client.execute("CREATE TRIGGER recruitment_audit_failure BEFORE INSERT ON recruitment_events BEGIN SELECT RAISE(ABORT,'Injected audit failure'); END");
    await assert.rejects(f.db.sqlTransaction(tx => recruitmentAction(tx, owner.user, 'saveRecruitmentNote', [ref, 0, 'must roll back'])));
    assert.equal((await f.db.client.execute({ sql: 'SELECT reference FROM recruitment_applications WHERE reference=?', args: [ref] })).rows.length, 0);
    await f.db.client.execute('DROP TRIGGER recruitment_audit_failure');
    await f.db.client.execute({ sql: 'UPDATE users SET is_active=0 WHERE id=?', args: [owner.user.id] });
    assert.equal((await owner.c.get('/api/recruitment')).status, 403);
    assert.equal((await f.admin.get('/api/recruitment?ownerId=' + owner.user.id)).data.applications.total, 13);
});
test('additive recruitment migration preserves legacy rows and verified backups recover new private data', async (t) => {
    const f = await fixture(t), owner = await employer(f), job = await publish(f, owner);
    const ref = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { version: 2 })));
    await f.db.sqlTransaction(tx => recruitmentAction(tx, owner.user, 'saveRecruitmentNote', [ref, 0, 'SYNTHETIC persisted private note']));
    const before = await exportSnapshot(f.db.client);
    assert(await recruitmentReady(f.db.client));
    await migrateRecruitment(f.db.client);
    assert.equal(snapshotFingerprint(before), snapshotFingerprint(await exportSnapshot(f.db.client)));
    const backup = await createVerifiedBackup(f.db.client, f.root + '/backups', process.env.BACKUP_ENCRYPTION_KEY!);
    assert.equal((await verifyBackup(backup.file, process.env.BACKUP_ENCRYPTION_KEY!)).fingerprint, backup.fingerprint);
    const old = createClient({ url: 'file:' + f.root + '/legacy.db' });
    try {
        const snapshot = { ...before, tables: before.tables.filter(x => !x.name.startsWith('recruitment_') && x.name !== 'employer_organizations').map(x => x.name === 'module_migrations' ? { ...x, rows: x.rows.filter(r => r[0] !== 'employer-recruitment-v1') } : x), indexes: before.indexes!.filter(x => !x.name.startsWith('recruitment_') && x.name !== 'job_applications_job_submitted') };
        await restoreSnapshot(old, snapshot, f.root + '/legacy-media');
        assert.equal(await pendingMigrations(old), true);
        await assert.rejects(guardMigrations(old, undefined, { ...process.env, REQUIRE_MIGRATION_BACKUP: 'true' }));
        const legacy = await exportSnapshot(old), original = old.transaction.bind(old);
        old.transaction = async (mode?: import('@libsql/client').TransactionMode) => { const tx = await original(mode), execute = tx.execute.bind(tx); tx.execute = (sql) => { if (String(typeof sql === 'string' ? sql : sql.sql).includes('CREATE TABLE IF NOT EXISTS recruitment_interviews'))
            throw Error('Injected migration failure'); return execute(sql); }; return tx; };
        await assert.rejects(migrateRecruitment(old));
        old.transaction = original;
        assert.equal(snapshotFingerprint(legacy), snapshotFingerprint(await exportSnapshot(old)));
        await migrateRecruitment(old);
        const after = await exportSnapshot(old);
        for (const table of legacy.tables)
            if (table.name !== 'module_migrations')
                assert.deepEqual(after.tables.find(x => x.name === table.name)!.rows, table.rows);
        assert.equal((await old.execute('PRAGMA foreign_key_check')).rows.length, 0);
        assert.equal((await old.execute('PRAGMA integrity_check')).rows[0].integrity_check, 'ok');
    }
    finally {
        old.close();
    }
    const reopened = new Database({ demo: false });
    try {
        await reopened.waitUntilReady();
        const state = await reopened.sqlTransaction(tx => recruitmentState(tx, owner.user, recruitmentQuery.parse({})), 'read');
        assert.equal(state.applications.items[0].note, 'SYNTHETIC persisted private note');
    }
    finally {
        await reopened.close();
    }
});
test('recruitment locales have complete four-language keys', () => { for (const l of ['en', 'ru', 'hy'] as const) {
    assert.deepEqual(Object.keys(recruitmentText[l]), Object.keys(recruitmentText.fa));
    assert(Object.values(recruitmentText[l]).every(Boolean));
} });
