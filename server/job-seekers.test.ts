import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createClient } from '@libsql/client';
import { Database } from './database.js';
import { createApi } from './api.js';
import { saveJob, jobInput } from './job-postings.js';
import { applyForJob, applicationInput, readApplications, reviewApplication } from './job-applications.js';
import { emptySeekerProfile, saveSeekerProfile, seekerAction, seekerState, uploadResume, validateResume, jobSeekersReady, migrateJobSeekers } from './job-seekers.js';
import { syntheticResume } from './resume-fixtures.js';
import { exportSnapshot } from './backups.js';
import { createVerifiedBackup, verifyBackup, snapshotFingerprint } from './backup-files.js';
import { restoreSnapshot } from './backups.js';
import { pendingMigrations, guardMigrations } from './persistence.js';
import { seekerText } from '../src/i18n/jobSeeker.js';
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
    t.after(async () => { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); await db.close(); for (const k of Object.keys(process.env))
        if (!(k in env))
            delete process.env[k]; Object.assign(process.env, env); await rm(root, { recursive: true, force: true }); });
    function client() { let cookie = ''; return { get cookie() { return cookie; }, async request(path: string, init: RequestInit = {}) { return fetch(origin + path, { ...init, headers: { Cookie: cookie, 'X-Requested-With': 'YerevanHub', ...init.headers } }); }, async get(path = '/api/job-seeker') { const r = await this.request(path); return { status: r.status, data: await r.json() }; }, async action(action: string, args: unknown[]) { const r = await this.request('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }); if (r.headers.get('set-cookie'))
            cookie = r.headers.get('set-cookie')!.split(';')[0]; return { status: r.status, data: await r.json() }; }, async upload(bytes = syntheticResume(), name = 'resume.pdf', mime = 'application/pdf') { return this.request('/api/job-seeker/documents', { method: 'POST', headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(name) }, body: bytes }); } }; }
    const admin = client();
    assert.equal((await admin.action('login', ['admin@example.test', password])).data.success, true);
    const adminUser = (await admin.get('/api/app')).data.state.currentUser as User;
    async function traveler() { const c = client(), email = randomUUID() + '@example.test'; const result = await c.action('registerTraveler', ['Synthetic seeker', email, '', password]); assert.equal(result.data.success, true, result.data.error); return { c, user: result.data.state.currentUser as User }; }
    async function job(owner = adminUser) { const value = jobInput.parse({ id: randomUUID(), version: 0, title: 'Synthetic role', company: 'Fictional company', location: 'Yerevan', schedule: 'Full time', description: 'Synthetic job only', contact: 'jobs@example.test', salary: 200000, period: 'month', status: 'open' }); await db.sqlTransaction(tx => saveJob(tx, owner, value)); return { ...value, version: 1 }; }
    const input = (jobId: string, extra = {}) => applicationInput.parse({ requestId: randomUUID(), jobId, version: 1, name: 'Synthetic seeker', contact: 'seeker@example.test', message: 'Fictional application', ...extra });
    return { root, db, admin, adminUser, client, traveler, job, input, password };
}
test('seeker API: private profile, normalized rows, optimistic concurrency, validation and account identity', async (t) => {
    const f = await fixture(t), a = await f.traveler(), b = await f.traveler();
    assert.equal((await f.client().get()).status, 403);
    const p = { ...emptySeekerProfile(a.user), skills: ['TypeScript', 'typescript'], languages: [{ code: 'en', proficiency: 'fluent' }], experience: [{ id: randomUUID(), title: 'Developer', organization: 'Fictional', startDate: '2024-01', endDate: '', description: 'Synthetic' }], education: [{ id: randomUUID(), institution: 'Fictional institute', qualification: 'Certificate', startDate: '2022-01', endDate: '2023-01', description: '' }] };
    assert.equal((await a.c.action('saveSeekerProfile', [p])).data.success, true);
    const saved = (await a.c.get()).data.profile;
    assert.equal(saved.version, 1);
    assert.equal(saved.skills.length, 1);
    assert.equal(saved.experience.length, 1);
    assert.equal(saved.education.length, 1);
    assert.equal((await b.c.get()).data.profile.version, 0);
    assert.equal((await f.admin.get()).data.profile.version, 0);
    assert(!JSON.stringify((await f.client().get('/api/app')).data).includes('Fictional institute'));
    assert.equal((await a.c.action('saveSeekerProfile', [p])).status, 400);
    assert.equal((await a.c.action('saveSeekerProfile', [{ ...saved, userId: b.user.id }])).status, 400);
    assert.equal((await a.c.action('saveSeekerProfile', [{ ...saved, education: [{ ...saved.education[0], endDate: '2020-01' }] }])).status, 400);
    const parallel = await Promise.all([a.c.action('saveSeekerProfile', [{ ...saved, headline: 'One' }]), a.c.action('saveSeekerProfile', [{ ...saved, headline: 'Two' }])]);
    assert.equal(parallel.filter(r => r.data.success).length, 1);
    assert.equal((await f.db.client.execute('PRAGMA foreign_key_check')).rows.length, 0);
    assert.equal((await f.db.client.execute('PRAGMA integrity_check')).rows[0].integrity_check, 'ok');
});
test('linked applications preserve guest tracking, explicit consent, own document/profile snapshots, duplicate and withdrawal rules', async (t) => {
    const f = await fixture(t), a = await f.traveler(), b = await f.traveler(), job = await f.job();
    const guestInput = f.input(job.id, { contact: a.user.email });
    const guest = await f.db.sqlTransaction(tx => applyForJob(tx, guestInput));
    assert.equal(await f.db.sqlTransaction(tx => applyForJob(tx, guestInput)), guest);
    assert.equal((await a.c.get()).data.applications.length, 0);
    // The pre-feature JSON fingerprint must remain byte-for-byte compatible.
    assert.equal((await f.db.client.execute({ sql: 'SELECT fingerprint FROM job_applications WHERE reference=?', args: [guest] })).rows[0].fingerprint, createHash('sha256').update(JSON.stringify(guestInput)).digest('hex'));
    const profile = { ...emptySeekerProfile(a.user), headline: 'Private snapshot' };
    await f.db.sqlTransaction(tx => saveSeekerProfile(tx, a.user, profile));
    const doc = await f.db.sqlTransaction(tx => uploadResume(tx, a.user, syntheticResume(), 'resume.pdf', 'application/pdf'));
    assert.equal((await a.c.action('applyForJob', [f.input(job.id)])).status, 403);
    assert.equal((await f.client().action('applyForJob', [f.input(job.id, { consent: true, accountRequired: true })])).status, 403);
    assert.equal((await b.c.action('applyForJob', [f.input(job.id, { consent: true, documentId: doc.id })])).status, 403);
    const request = f.input(job.id, { consent: true, shareProfile: true, documentId: doc.id });
    const result = await a.c.action('applyForJob', [request]);
    assert.equal(result.data.success, true, result.data.error);
    const ref = result.data.applicationReference;
    // Retry is idempotent independently of the current listing state.
    assert.equal(await f.db.sqlTransaction(tx => applyForJob(tx, request, a.user)), ref);
    await assert.rejects(f.db.sqlTransaction(tx => applyForJob(tx, request, b.user)));
    await assert.rejects(f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true }), a.user)));
    await f.db.sqlTransaction(tx => saveSeekerProfile(tx, a.user, { ...profile, version: 1, headline: 'Changed private profile' }));
    const visible = await f.db.sqlTransaction(tx => readApplications(tx, f.adminUser));
    assert.equal(visible.find(x => x.reference === ref)!.sharedProfile!.headline, 'Private snapshot');
    assert.equal(visible.find(x => x.reference === ref)!.resume!.id, doc.id);
    assert.equal((await b.c.action('withdrawJobApplication', [ref])).status, 403);
    assert.equal((await a.c.action('withdrawJobApplication', [ref])).data.success, true);
    assert.equal((await a.c.get()).data.applications[0].status, 'withdrawn');
    assert.equal((await f.client().action('trackApplication', [ref])).data.applicationStatus, 'withdrawn');
    await assert.rejects(f.db.sqlTransaction(tx => reviewApplication(tx, f.adminUser, ref, 'received', 'accepted')));
    const next = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true }), a.user));
    assert.notEqual(next, ref);
    assert.equal((await a.c.get()).data.applications.length, 2);
    assert.equal((await b.c.get()).data.applications.length, 0);
    await f.db.sqlTransaction(tx => reviewApplication(tx, f.adminUser, next, 'received', 'accepted'));
    assert.equal((await a.c.action('withdrawJobApplication', [next])).status, 400);
});
test('protected resume transport, employer isolation, revoke/delete security, upload validation and document limits', async (t) => {
    const f = await fixture(t), a = await f.traveler(), b = await f.traveler(), job = await f.job();
    const bytes = syntheticResume();
    let r = await a.c.upload(bytes);
    assert.equal(r.status, 201);
    const doc = await r.json();
    r = await a.c.upload(bytes);
    assert.equal((await r.json()).id, doc.id);
    assert.equal((await b.c.request('/api/job-seeker/documents/' + doc.id)).status, 404);
    assert.equal((await f.admin.request('/api/job-seeker/documents/' + doc.id)).status, 404);
    assert.equal((await f.client().request('/api/job-seeker/documents/' + doc.id)).status, 403);
    r = await a.c.request('/api/job-seeker/documents/' + doc.id);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-disposition')!, /attachment/);
    assert.match(r.headers.get('cache-control')!, /no-store/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('content-security-policy')!, /sandbox/);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes);
    const ref = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true, documentId: doc.id }), a.user));
    assert.equal((await f.admin.request('/api/job-applications/' + ref + '/resume')).status, 200);
    assert.equal((await b.c.request('/api/job-applications/' + ref + '/resume')).status, 403);
    assert.equal((await a.c.action('revokeApplicationSharing', [ref])).data.success, true);
    assert.equal((await f.admin.request('/api/job-applications/' + ref + '/resume')).status, 404);
    assert.equal((await b.c.action('deleteSeekerDocument', [doc.id])).status, 403);
    assert.equal((await a.c.action('deleteSeekerDocument', [doc.id])).data.success, true);
    assert.equal((await a.c.request('/api/job-seeker/documents/' + doc.id)).status, 404);
    assert.equal((await a.c.upload(Buffer.from('fake pdf'))).status, 400);
    assert.equal((await a.c.upload(bytes, '../resume.pdf')).status, 400);
    assert.equal((await a.c.upload(bytes, 'resume.pdf', 'image/png')).status, 400);
    assert.equal((await a.c.upload(bytes)).status, 429); // durable per-account attempt budget
    assert.equal((await b.c.request('/api/job-seeker/documents', { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/pdf' }, body: bytes })).status, 403);
    for (let i = 0; i < 3; i++)
        await f.db.sqlTransaction(tx => uploadResume(tx, a.user, syntheticResume('SYNTHETIC ' + i), i + '.pdf', 'application/pdf'));
    await assert.rejects(f.db.sqlTransaction(tx => uploadResume(tx, a.user, syntheticResume('fourth'), '4.pdf', 'application/pdf')));
    assert.throws(() => validateResume(Buffer.from('%PDF-1.4\n1 0 obj << /J#53 (x) >> endobj\ntrailer\n%%EOF'), 'x.pdf', 'application/pdf'));
    assert.throws(() => validateResume(Buffer.alloc(2097153), 'x.pdf', 'application/pdf'));
    assert.throws(() => validateResume(bytes, 'x.pdf', 'text/plain'));
});
test('saved jobs, concurrent submissions, closed listing history and privacy deletion preserve identity and basic records', async (t) => {
    const f = await fixture(t), a = await f.traveler(), job = await f.job();
    assert.equal((await a.c.action('saveSeekerJob', [job.id, true])).data.success, true);
    assert.equal((await a.c.action('saveSeekerJob', [job.id, true])).data.success, true);
    const credential = JSON.stringify((await f.db.client.execute({ sql: 'SELECT * FROM user_credentials WHERE user_id=?', args: [a.user.id] })).rows);
    const requests = await Promise.allSettled([f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true }), a.user)), f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true }), a.user))]);
    assert.equal(requests.filter(x => x.status === 'fulfilled').length, 1);
    await f.db.sqlTransaction(tx => saveJob(tx, f.adminUser, { ...job, status: 'closed' }));
    assert.equal((await a.c.get()).data.savedJobs[0].available, false);
    assert.equal((await a.c.get()).data.applications.length, 1);
    await assert.rejects(f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id), null)));
    assert.equal((await a.c.action('deleteSeekerProfile', [true])).data.success, true);
    const d = (await a.c.get()).data;
    assert.equal(d.profile.version, 0);
    assert.equal(d.savedJobs.length, 0);
    assert.equal(d.applications.length, 1);
    assert.equal(credential, JSON.stringify((await f.db.client.execute({ sql: 'SELECT * FROM user_credentials WHERE user_id=?', args: [a.user.id] })).rows));
    assert.equal((await f.db.client.execute('PRAGMA foreign_key_check')).rows.length, 0);
});
test('additive migration rollback, restart persistence and verified encrypted backup restore include private BLOBs', async (t) => {
    const f = await fixture(t), a = await f.traveler();
    await f.db.sqlTransaction(tx => saveSeekerProfile(tx, a.user, { ...emptySeekerProfile(a.user), headline: 'Persisted' }));
    const bytes = syntheticResume(), doc = await f.db.sqlTransaction(tx => uploadResume(tx, a.user, bytes, 'private.pdf', 'application/pdf'));
    const job = await f.job();
    await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { consent: true, documentId: doc.id, shareProfile: true }), a.user));
    assert(await jobSeekersReady(f.db.client));
    assert.equal(await pendingMigrations(f.db.client), false);
    const before = await exportSnapshot(f.db.client);
    await migrateJobSeekers(f.db.client);
    assert.equal(snapshotFingerprint(before), snapshotFingerprint(await exportSnapshot(f.db.client)));
    const backup = await createVerifiedBackup(f.db.client, f.root + '/backups', process.env.BACKUP_ENCRYPTION_KEY!);
    assert.equal((await verifyBackup(backup.file, process.env.BACKUP_ENCRYPTION_KEY!)).fingerprint, backup.fingerprint);
    const corrupted = Buffer.from(await readFile(backup.file));
    corrupted[corrupted.length - 1] ^= 1;
    await writeFile(f.root + '/corrupt.yhbak', corrupted);
    await assert.rejects(verifyBackup(f.root + '/corrupt.yhbak', process.env.BACKUP_ENCRYPTION_KEY!));
    const target = createClient({ url: 'file:' + f.root + '/restored.db' });
    try {
        await restoreSnapshot(target, before, f.root + '/restored-media');
        assert.equal((await target.execute('PRAGMA integrity_check')).rows[0].integrity_check, 'ok');
        assert.equal((await target.execute('PRAGMA foreign_key_check')).rows.length, 0);
        assert.deepEqual(Buffer.from((await target.execute({ sql: 'SELECT content FROM job_seeker_documents WHERE id=?', args: [doc.id] })).rows[0].content as ArrayBuffer), bytes);
    }
    finally {
        target.close();
    }
    const second = new Database({ demo: false });
    try {
        await second.waitUntilReady();
        assert.equal((await second.sqlTransaction(tx => seekerState(tx, a.user), 'read')).profile.headline, 'Persisted');
    }
    finally {
        await second.close();
    }
    // Reproduce a pre-feature schema without touching any historical business row.
    const old = createClient({ url: 'file:' + f.root + '/old.db' });
    try {
        const snapshot = { ...before, tables: before.tables.filter(x => !x.name.startsWith('job_seeker_') && !['account_job_applications', 'saved_jobs'].includes(x.name)).map(x => x.name === 'module_migrations' ? { ...x, rows: x.rows.filter(r => r[0] !== 'job-seekers-v1') } : x), indexes: before.indexes!.filter(x => !x.name.startsWith('account_job_') && x.name !== 'job_applications_reference_job') };
        await restoreSnapshot(old, snapshot, f.root + '/old-media');
        assert.equal(await pendingMigrations(old), true);
        await assert.rejects(guardMigrations(old, undefined, { ...process.env, REQUIRE_MIGRATION_BACKUP: 'true' }));
        const original = await exportSnapshot(old);
        const execute = old.transaction.bind(old);
        old.transaction = async (mode?: import('@libsql/client').TransactionMode) => { const tx = await execute(mode), run = tx.execute.bind(tx); tx.execute = (sql) => { if (String(typeof sql === 'string' ? sql : sql.sql).includes('CREATE TABLE IF NOT EXISTS job_seeker_languages'))
            throw Error('Injected migration failure'); return run(sql); }; return tx; };
        await assert.rejects(migrateJobSeekers(old));
        old.transaction = execute;
        assert.equal(snapshotFingerprint(original), snapshotFingerprint(await exportSnapshot(old)));
        await migrateJobSeekers(old);
        assert(await jobSeekersReady(old));
        for (const table of original.tables) {
            const actual = (await exportSnapshot(old)).tables.find(x => x.name === table.name)!;
            if (table.name !== 'module_migrations')
                assert.deepEqual(actual.rows, table.rows);
        }
    }
    finally {
        old.close();
    }
});
test('all job seeker UI locales have matching complete keys', () => { const keys = Object.keys(seekerText.fa); for (const locale of ['en', 'ru', 'hy'] as const) {
    assert.deepEqual(Object.keys(seekerText[locale]), keys);
    for (const text of Object.values(seekerText[locale]))
        assert(text.length > 0);
} });
test('live sessions and employer resource ownership gate private downloads and consented profile snapshots', async (t) => {
    const f = await fixture(t), a = await f.traveler(), one = f.client(), two = f.client(), ids: string[] = [];
    for (const c of [one, two]) {
        const email = randomUUID() + '@example.test';
        const result = await f.admin.action('saveProvider', [{ name: 'Synthetic employer', email, password: f.password, phone: '', organization: 'Fictional', role: 'job_provider', isActive: true }]);
        assert.equal(result.data.success, true, result.data.error);
        assert.equal((await c.action('login', [email, f.password])).data.success, true);
        ids.push((await c.get('/api/app')).data.state.currentUser.id);
    }
    const owner = (await one.get('/api/app')).data.state.currentUser as User;
    const job = await f.job(owner);
    await f.db.sqlTransaction(tx => saveJob(tx, f.adminUser, { ...job, approved: true }));
    const doc = await f.db.sqlTransaction(tx => uploadResume(tx, a.user, syntheticResume(), 'a.pdf', 'application/pdf'));
    const ref = await f.db.sqlTransaction(tx => applyForJob(tx, f.input(job.id, { version: 2, consent: true, documentId: doc.id }), a.user));
    assert.equal((await one.request('/api/job-applications/' + ref + '/resume')).status, 200);
    assert.equal((await two.request('/api/job-applications/' + ref + '/resume')).status, 404);
    assert.equal((await two.get('/api/app')).data.state.jobApplications.length, 0);
    await f.db.client.execute({ sql: 'UPDATE users SET is_active=0 WHERE id=?', args: [a.user.id] });
    assert.equal((await a.c.get()).status, 403);
    assert.equal((await a.c.request('/api/job-seeker/documents/' + doc.id)).status, 403);
    assert.equal((await a.c.action('saveSeekerJob', [job.id, true])).status, 403);
    await f.db.client.execute({ sql: 'UPDATE users SET is_active=0 WHERE id=?', args: [ids[0]] });
    assert.equal((await one.request('/api/job-applications/' + ref + '/resume')).status, 403);
    const managed=(await f.admin.get('/api/app')).data.state.jobs.find((j:{id:string})=>j.id===job.id);assert.equal(managed.manageable,true);assert.equal(managed.acceptingApplications,false,'An inactive employer listing remains manageable but cannot be offered to job seekers');
    assert(!(await f.client().get('/api/app')).data.state.jobs.some((j:{id:string})=>j.id===job.id));
    assert.equal((await f.client().action('applyForJob',[f.input(job.id,{version:2})])).status,400);
    await f.db.client.execute({sql:'UPDATE users SET is_active=1 WHERE id=?',args:[ids[0]]});
    assert.equal((await f.admin.get('/api/app')).data.state.jobs.find((j:{id:string})=>j.id===job.id).acceptingApplications,true);
    await f.db.sqlTransaction(tx=>saveJob(tx,f.adminUser,{...job,version:2,approved:false}));
    assert.equal((await f.admin.get('/api/app')).data.state.jobs.find((j:{id:string})=>j.id===job.id).acceptingApplications,false);
});
