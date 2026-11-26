import type { Client, Transaction } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import type { RecruitmentStatus } from '../src/types/recruitment.js';
export const recruitmentSQL = [
    `CREATE TABLE IF NOT EXISTS employer_organizations(user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id),version INTEGER NOT NULL CHECK(version>0),name TEXT NOT NULL,description TEXT NOT NULL,website TEXT NOT NULL,phone TEXT NOT NULL,city TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS recruitment_jobs(job_id TEXT NOT NULL PRIMARY KEY REFERENCES job_postings(id) ON DELETE CASCADE,state TEXT NOT NULL CHECK(state IN ('draft','pending','approved','rejected')),expires_at TEXT,published_at TEXT,moderation_note TEXT NOT NULL DEFAULT '')`,
    `CREATE TABLE IF NOT EXISTS recruitment_applications(reference TEXT NOT NULL PRIMARY KEY REFERENCES job_applications(reference) ON DELETE CASCADE,stage TEXT CHECK(stage IN ('shortlisted','interview_scheduled')),note TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1 CHECK(version>0))`,
    `CREATE TABLE IF NOT EXISTS recruitment_interviews(id TEXT NOT NULL PRIMARY KEY,reference TEXT NOT NULL REFERENCES job_applications(reference) ON DELETE CASCADE,starts_at TEXT NOT NULL,minutes INTEGER NOT NULL CHECK(minutes BETWEEN 15 AND 240),kind TEXT NOT NULL CHECK(kind IN ('video','phone','in_person')),location TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('proposed','cancelled','completed')),created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS recruitment_events(id TEXT NOT NULL PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,job_id TEXT REFERENCES job_postings(id) ON DELETE SET NULL,target_id TEXT NOT NULL,kind TEXT NOT NULL,details TEXT NOT NULL CHECK(json_valid(details)),created_at TEXT NOT NULL)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS recruitment_interviews_active ON recruitment_interviews(reference) WHERE state='proposed'`,
    `CREATE INDEX IF NOT EXISTS recruitment_events_owner ON recruitment_events(owner_id,created_at,id)`,
    `CREATE INDEX IF NOT EXISTS recruitment_events_job ON recruitment_events(job_id,created_at,id)`,
    `CREATE INDEX IF NOT EXISTS job_applications_job_submitted ON job_applications(job_id,submitted_at,reference)`,
];
export const publicJobEligibility = (alias = 'j') => `${alias}.status='open' AND ${alias}.approved=1 AND ${alias}.owner_id IN (SELECT id FROM users WHERE is_active=1) AND NOT EXISTS(SELECT 1 FROM recruitment_jobs r WHERE r.job_id=${alias}.id AND (r.state!='approved' OR (r.expires_at IS NOT NULL AND r.expires_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))))`;
export const effectiveApplicationStatus = (a = 'a', l = 'l', r = 'r') => `CASE WHEN ${l}.withdrawn_at IS NOT NULL THEN 'withdrawn' WHEN ${a}.status='reviewing' AND ${r}.stage IS NOT NULL THEN ${r}.stage ELSE ${a}.status END`;
export { recruitmentTransitions as transitions } from '../src/utils/recruitment.js';
export async function recruitmentReady(db: Client | Transaction) { const names = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r => String(r.name))); if (!names.has('module_migrations'))
    return false; for (const [table, required] of Object.entries({ employer_organizations: ['user_id', 'version', 'name', 'description', 'website', 'phone', 'city', 'updated_at'], recruitment_jobs: ['job_id', 'state', 'expires_at', 'published_at', 'moderation_note'], recruitment_applications: ['reference', 'stage', 'note', 'version'], recruitment_interviews: ['id', 'reference', 'starts_at', 'minutes', 'kind', 'location', 'state', 'created_at'], recruitment_events: ['id', 'owner_id', 'actor_id', 'job_id', 'target_id', 'kind', 'details', 'created_at'] })) {
    if (!names.has(table))
        return false;
    const columns = new Set((await db.execute('PRAGMA table_info(' + table + ')')).rows.map(r => String(r.name)));
    if (required.some(c => !columns.has(c)))
        return false;
} const indexes = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r => String(r.name))); return ['recruitment_interviews_active', 'recruitment_events_owner', 'recruitment_events_job', 'job_applications_job_submitted'].every(n => indexes.has(n)) && !!(await db.execute("SELECT name FROM module_migrations WHERE name='employer-recruitment-v1'")).rows.length; }
export async function migrateRecruitment(db: Client) { const tx = await db.transaction('write'); try {
    for (const sql of recruitmentSQL)
        await tx.execute(sql);
    await tx.execute("INSERT OR IGNORE INTO module_migrations VALUES('employer-recruitment-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    if (!await recruitmentReady(tx))
        throw Error('Recruitment schema is incomplete.');
    await tx.commit();
}
catch (e) {
    await tx.rollback();
    throw e;
}
finally {
    tx.close();
} }
export async function recruitmentEvent(tx: Transaction, ownerId: string, actorId: string | null, jobId: string | null, targetId: string, kind: string, details: Record<string, unknown> = {}) { await tx.execute({ sql: 'INSERT INTO recruitment_events VALUES(?,?,?,?,?,?,?,?)', args: [randomUUID(), ownerId, actorId, jobId, targetId, kind, JSON.stringify(details), new Date().toISOString()] }); }
export async function recordJobSave(tx: Transaction, id: string, actorId: string, approved: boolean) { const row = (await tx.execute({ sql: 'SELECT owner_id FROM job_postings WHERE id=?', args: [id] })).rows[0]; await tx.execute({ sql: "INSERT INTO recruitment_jobs(job_id,state,published_at) VALUES(?,?,?) ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,published_at=CASE WHEN excluded.state='approved' THEN COALESCE(recruitment_jobs.published_at,excluded.published_at) ELSE recruitment_jobs.published_at END,moderation_note=''", args: [id, approved ? 'approved' : 'pending', approved ? new Date().toISOString() : null] }); await recruitmentEvent(tx, String(row.owner_id), actorId, id, id, 'job_saved', { publication: approved ? 'approved' : 'pending' }); }
export async function cancelProposedInterviews(tx: Transaction, reference: string, ownerId: string, actorId: string | null, jobId: string, reason: string) { const rows = (await tx.execute({ sql: "SELECT id FROM recruitment_interviews WHERE reference=? AND state='proposed'", args: [reference] })).rows; await tx.execute({ sql: "UPDATE recruitment_interviews SET state='cancelled' WHERE reference=? AND state='proposed'", args: [reference] }); for (const row of rows)
    await recruitmentEvent(tx, ownerId, actorId, jobId, reference, 'interview_cancelled', { interviewId: String(row.id), reason }); }
