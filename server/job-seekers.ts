import type { Client, Transaction } from '@libsql/client';
import { z } from 'zod';
import { randomUUID, createHash } from 'node:crypto';
import type { User } from '../src/types/index.js';
import type { SeekerProfile, SharedSeekerProfile, SeekerState, SeekerDocument } from '../src/types/jobSeeker.js';
import { requireLivePermission } from './authorization.js';
import { isTourPhone } from '../src/utils/tour-contact.js';
export const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const text = (n: number) => z.string().trim().max(n);
const month = z.union([z.literal(''), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]);
const dates = (v: {
    startDate?: string;
    endDate?: string;
}) => !v.endDate || !!v.startDate && v.endDate >= v.startDate;
const experience = z.object({ id: z.uuid(), title: text(160).min(1), organization: text(160).min(1), startDate: month, endDate: month, description: text(2000) }).strict().refine(dates);
const education = z.object({ id: z.uuid(), institution: text(160).min(1), qualification: text(160).min(1), startDate: month, endDate: month, description: text(2000) }).strict().refine(dates);
export const seekerProfileInput = z.object({ version: z.number().int().nonnegative(), fullName: text(120).min(1), headline: text(160), city: text(120), contact: text(250).refine(v => !v || z.email().safeParse(v).success || isTourPhone(v)), about: text(3000), desiredRole: text(160), preferredLocation: text(160), minimumSalary: z.number().int().min(0).max(1000000000).nullable(), employmentTypes: z.array(z.enum(['full_time', 'part_time', 'contract', 'internship'])).max(4), remote: z.boolean(), skills: z.array(text(80).min(1)).max(30), languages: z.array(z.object({ code: z.string().regex(/^[a-z]{2,3}$/), proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']) }).strict()).max(12), experience: z.array(experience).max(15), education: z.array(education).max(15) }).strict().refine(v => new Set(v.languages.map(x => x.code)).size === v.languages.length && new Set(v.experience.map(x => x.id)).size === v.experience.length && new Set(v.education.map(x => x.id)).size === v.education.length);
const schemaSQL = [
    `CREATE TABLE IF NOT EXISTS job_seeker_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,version INTEGER NOT NULL CHECK(version>0),profile_json TEXT NOT NULL CHECK(json_valid(profile_json)),updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS job_seeker_skills(user_id TEXT NOT NULL REFERENCES job_seeker_profiles(user_id) ON DELETE CASCADE,skill TEXT NOT NULL,PRIMARY KEY(user_id,skill))`,
    `CREATE TABLE IF NOT EXISTS job_seeker_languages(user_id TEXT NOT NULL REFERENCES job_seeker_profiles(user_id) ON DELETE CASCADE,code TEXT NOT NULL,proficiency TEXT NOT NULL CHECK(proficiency IN ('basic','conversational','fluent','native')),PRIMARY KEY(user_id,code))`,
    `CREATE TABLE IF NOT EXISTS job_seeker_experience(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES job_seeker_profiles(user_id) ON DELETE CASCADE,data_json TEXT NOT NULL CHECK(json_valid(data_json)),PRIMARY KEY(user_id,id))`,
    `CREATE TABLE IF NOT EXISTS job_seeker_education(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES job_seeker_profiles(user_id) ON DELETE CASCADE,data_json TEXT NOT NULL CHECK(json_valid(data_json)),PRIMARY KEY(user_id,id))`,
    `CREATE TABLE IF NOT EXISTS job_seeker_documents(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,content BLOB NOT NULL,sha256 TEXT NOT NULL,byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=2097152 AND length(content)=byte_size),created_at TEXT NOT NULL,UNIQUE(id,user_id),UNIQUE(user_id,sha256))`,
    `CREATE TABLE IF NOT EXISTS saved_jobs(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,job_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,title TEXT NOT NULL,company TEXT NOT NULL,location TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,job_id))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS job_applications_reference_job ON job_applications(reference,job_id)`,
    `CREATE TABLE IF NOT EXISTS account_job_applications(reference TEXT PRIMARY KEY,job_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,document_id TEXT,profile_snapshot_json TEXT CHECK(profile_snapshot_json IS NULL OR json_valid(profile_snapshot_json)),consent_at TEXT NOT NULL,withdrawn_at TEXT,job_title TEXT NOT NULL,company TEXT NOT NULL,FOREIGN KEY(reference,job_id) REFERENCES job_applications(reference,job_id) ON DELETE CASCADE,FOREIGN KEY(document_id,user_id) REFERENCES job_seeker_documents(id,user_id))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS account_job_applications_current ON account_job_applications(user_id,job_id) WHERE withdrawn_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS account_job_applications_document ON account_job_applications(document_id,user_id)`,
];
export async function jobSeekersReady(db: Client | Transaction) {
    const names = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r => String(r.name)));
    const tables = ['job_seeker_profiles', 'job_seeker_skills', 'job_seeker_languages', 'job_seeker_experience', 'job_seeker_education', 'job_seeker_documents', 'saved_jobs', 'account_job_applications'];
    if (!tables.every(t => names.has(t)) || !names.has('module_migrations'))
        return false;
    for (const [table, required] of Object.entries({ job_seeker_profiles: ['user_id', 'version', 'profile_json', 'updated_at'], job_seeker_skills: ['user_id', 'skill'], job_seeker_languages: ['user_id', 'code', 'proficiency'], job_seeker_experience: ['id', 'user_id', 'data_json'], job_seeker_education: ['id', 'user_id', 'data_json'], job_seeker_documents: ['id', 'user_id', 'content', 'sha256', 'byte_size', 'name', 'created_at'], saved_jobs: ['user_id', 'job_id', 'title', 'company', 'location', 'created_at'], account_job_applications: ['reference', 'job_id', 'user_id', 'document_id', 'profile_snapshot_json', 'consent_at', 'withdrawn_at', 'job_title', 'company'] })) {
        const columns = new Set((await db.execute('PRAGMA table_info(' + table + ')')).rows.map(r => String(r.name)));
        if (required.some(c => !columns.has(c)))
            return false;
    }
    const indexes = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r => String(r.name)));
    return ['job_applications_reference_job', 'account_job_applications_current', 'account_job_applications_document'].every(n => indexes.has(n)) && !!(await db.execute("SELECT name FROM module_migrations WHERE name='job-seekers-v1'")).rows.length;
}
export async function migrateJobSeekers(client: Client) { const tx = await client.transaction('write'); try {
    for (const sql of schemaSQL)
        await tx.execute(sql);
    await tx.execute("INSERT OR IGNORE INTO module_migrations VALUES('job-seekers-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    if (!await jobSeekersReady(tx))
        throw Error('Job seeker schema is incomplete.');
    await tx.commit();
}
catch (e) {
    await tx.rollback();
    throw e;
}
finally {
    tx.close();
} }
const parse = <T>(value: unknown) => JSON.parse(String(value)) as T;
export function emptySeekerProfile(user: User): SeekerProfile { return { version: 0, fullName: user.name.slice(0, 120), headline: '', city: '', contact: user.email, about: '', desiredRole: '', preferredLocation: '', minimumSalary: null, employmentTypes: [], remote: false, skills: [], languages: [], experience: [], education: [] }; }
export async function readSeekerProfile(tx: Transaction, user: User): Promise<SeekerProfile> {
    const row = (await tx.execute({ sql: 'SELECT * FROM job_seeker_profiles WHERE user_id=?', args: [user.id] })).rows[0];
    if (!row)
        return emptySeekerProfile(user);
    return { ...parse<SeekerProfile>(row.profile_json), version: Number(row.version), skills: (await tx.execute({ sql: 'SELECT skill FROM job_seeker_skills WHERE user_id=? ORDER BY skill', args: [user.id] })).rows.map(r => String(r.skill)), languages: (await tx.execute({ sql: 'SELECT code,proficiency FROM job_seeker_languages WHERE user_id=? ORDER BY code', args: [user.id] })).rows.map(r => ({ code: String(r.code), proficiency: r.proficiency as SeekerProfile['languages'][number]['proficiency'] })), experience: (await tx.execute({ sql: 'SELECT data_json FROM job_seeker_experience WHERE user_id=? ORDER BY id', args: [user.id] })).rows.map(r => parse(r.data_json)), education: (await tx.execute({ sql: 'SELECT data_json FROM job_seeker_education WHERE user_id=? ORDER BY id', args: [user.id] })).rows.map(r => parse(r.data_json)) };
}
export async function saveSeekerProfile(tx: Transaction, actor: User | null, value: unknown) {
    const user = await requireLivePermission(tx, actor, 'account.self'), input = seekerProfileInput.parse(value);
    const { version, skills, languages, experience, education, ...personal } = input;
    const result = version === 0 ? await tx.execute({ sql: 'INSERT INTO job_seeker_profiles VALUES(?,1,?,?) ON CONFLICT(user_id) DO NOTHING', args: [user.id, JSON.stringify(personal), new Date().toISOString()] }) : await tx.execute({ sql: 'UPDATE job_seeker_profiles SET profile_json=?,version=version+1,updated_at=? WHERE user_id=? AND version=?', args: [JSON.stringify(personal), new Date().toISOString(), user.id, version] });
    if (!result.rowsAffected)
        throw new Error('پروفایل تغییر کرده است؛ دوباره بارگذاری کنید.');
    for (const table of ['job_seeker_skills', 'job_seeker_languages', 'job_seeker_experience', 'job_seeker_education'])
        await tx.execute({ sql: 'DELETE FROM ' + table + ' WHERE user_id=?', args: [user.id] });
    const unique = new Map(skills.map(s => [s.normalize('NFKC').toLocaleLowerCase(), s]));
    for (const skill of unique.values())
        await tx.execute({ sql: 'INSERT INTO job_seeker_skills VALUES(?,?)', args: [user.id, skill] });
    for (const l of languages)
        await tx.execute({ sql: 'INSERT INTO job_seeker_languages VALUES(?,?,?)', args: [user.id, l.code, l.proficiency] });
    for (const [table, items] of [['job_seeker_experience', experience], ['job_seeker_education', education]] as const)
        for (const item of items)
            await tx.execute({ sql: 'INSERT INTO ' + table + ' VALUES(?,?,?)', args: [item.id, user.id, JSON.stringify(item)] });
}
export function sharedProfile(profile: SeekerProfile): SharedSeekerProfile { const { version, ...snapshot } = profile; return snapshot; }
export function documentMetadata(row: Record<string, unknown>): SeekerDocument { return { id: String(row.id), name: String(row.name), bytes: Number(row.byte_size), createdAt: String(row.created_at) }; }
export function validateResume(bytes: Buffer, filename: string, mime: string) {
    if (mime !== 'application/pdf' || !filename.toLowerCase().endsWith('.pdf') || filename.length > 120 || /[\x00-\x1f\x7f/\\]/.test(filename) || !bytes.length || bytes.length > MAX_RESUME_BYTES)
        throw new Error('رزومه باید PDF ساده و حداکثر ۲ مگابایت باشد.');
    const raw = bytes.toString('latin1'), decoded = raw.replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(raw) || !/%{2}EOF\s*$/.test(raw) || !/\bobj\b/.test(raw) || !/\btrailer\b|\bstartxref\b/.test(raw) || /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia|AcroForm|XFA|Encrypt|ObjStm)\b|<script\b|<!doctype\s+html/i.test(decoded))
        throw new Error('رزومه باید PDF ساده و حداکثر ۲ مگابایت باشد.');
}
export async function uploadResume(tx: Transaction, actor: User | null, bytes: Buffer, filename: string, mime: string) {
    const user = await requireLivePermission(tx, actor, 'account.self');
    validateResume(bytes, filename, mime);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const existing = (await tx.execute({ sql: 'SELECT id,name,byte_size,created_at FROM job_seeker_documents WHERE user_id=? AND sha256=?', args: [user.id, hash] })).rows[0];
    if (existing)
        return documentMetadata(existing);
    if (Number((await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM job_seeker_documents WHERE user_id=?', args: [user.id] })).rows[0].n) >= 3)
        throw new Error('حداکثر سه رزومه می‌توانید نگه دارید.');
    const doc = { id: randomUUID(), name: filename, bytes: bytes.length, createdAt: new Date().toISOString() };
    await tx.execute({ sql: 'INSERT INTO job_seeker_documents VALUES(?,?,?,?,?,?,?)', args: [doc.id, user.id, filename, bytes, hash, bytes.length, doc.createdAt] });
    return doc;
}
export async function seekerState(tx: Transaction, actor: User | null): Promise<SeekerState> { const user = await requireLivePermission(tx, actor, 'account.self'); return { profile: await readSeekerProfile(tx, user), documents: (await tx.execute({ sql: 'SELECT id,name,byte_size,created_at FROM job_seeker_documents WHERE user_id=? ORDER BY created_at DESC,id', args: [user.id] })).rows.map(documentMetadata), savedJobs: (await tx.execute({ sql: "SELECT s.*,EXISTS(SELECT 1 FROM job_postings j JOIN users u ON u.id=j.owner_id WHERE j.id=s.job_id AND j.status='open' AND j.approved=1 AND u.is_active=1) AS available FROM saved_jobs s WHERE s.user_id=? ORDER BY s.created_at DESC,s.job_id", args: [user.id] })).rows.map(r => ({ jobId: String(r.job_id), title: String(r.title), company: String(r.company), location: String(r.location), available: !!r.available })), applications: (await tx.execute({ sql: 'SELECT l.*,a.status,a.submitted_at,d.id,d.name,d.byte_size,d.created_at FROM account_job_applications l JOIN job_applications a ON a.reference=l.reference LEFT JOIN job_seeker_documents d ON d.id=l.document_id AND d.user_id=l.user_id WHERE l.user_id=? ORDER BY a.submitted_at DESC,l.reference', args: [user.id] })).rows.map(r => ({ reference: String(r.reference), jobId: String(r.job_id), title: String(r.job_title), company: String(r.company), status: r.withdrawn_at ? 'withdrawn' : r.status as SeekerState['applications'][number]['status'], submittedAt: String(r.submitted_at), consentAt: String(r.consent_at), profileShared: !!r.profile_snapshot_json && !r.withdrawn_at, document: r.id && !r.withdrawn_at ? documentMetadata(r) : null })) }; }
export const seekerActionSchemas = { saveSeekerProfile: z.tuple([seekerProfileInput]), saveSeekerJob: z.tuple([z.uuid(), z.boolean()]), withdrawJobApplication: z.tuple([z.uuid()]), revokeApplicationSharing: z.tuple([z.uuid()]), deleteSeekerDocument: z.tuple([z.uuid()]), deleteSeekerProfile: z.tuple([z.literal(true)]) };
export async function seekerAction(tx: Transaction, actor: User | null, action: keyof typeof seekerActionSchemas, args: unknown[]) {
    const user = await requireLivePermission(tx, actor, 'account.self');
    if (action === 'saveSeekerProfile')
        await saveSeekerProfile(tx, user, args[0]);
    else if (action === 'saveSeekerJob') {
        if (!args[1])
            await tx.execute({ sql: 'DELETE FROM saved_jobs WHERE user_id=? AND job_id=?', args: [user.id, String(args[0])] });
        else {
            const r = await tx.execute({ sql: "INSERT INTO saved_jobs SELECT ?,j.id,j.title,j.company,j.location,? FROM job_postings j JOIN users u ON u.id=j.owner_id WHERE j.id=? AND j.status='open' AND j.approved=1 AND u.is_active=1 ON CONFLICT(user_id,job_id) DO NOTHING", args: [user.id, new Date().toISOString(), String(args[0])] });
            if (!r.rowsAffected && !(await tx.execute({ sql: 'SELECT job_id FROM saved_jobs WHERE user_id=? AND job_id=?', args: [user.id, String(args[0])] })).rows.length)
                throw new Error('اطلاعات واردشده معتبر نیست.');
        }
    }
    else if (action === 'withdrawJobApplication' || action === 'revokeApplicationSharing') {
        const row = (await tx.execute({ sql: 'SELECT l.*,a.status FROM account_job_applications l JOIN job_applications a ON a.reference=l.reference WHERE l.reference=? AND l.user_id=?', args: [String(args[0]), user.id] })).rows[0];
        if (!row)
            throw new Error('دسترسی مجاز نیست.');
        if (action === 'withdrawJobApplication' && !row.withdrawn_at && !['received', 'reviewing'].includes(String(row.status)))
            throw new Error('این درخواست دیگر قابل انصراف نیست.');
        await tx.execute({ sql: 'UPDATE account_job_applications SET document_id=NULL,profile_snapshot_json=NULL,withdrawn_at=CASE WHEN ?=1 THEN COALESCE(withdrawn_at,?) ELSE withdrawn_at END WHERE reference=? AND user_id=?', args: [Number(action === 'withdrawJobApplication'), new Date().toISOString(), String(args[0]), user.id] });
    }
    else if (action === 'deleteSeekerDocument') {
        const doc = (await tx.execute({ sql: 'SELECT id FROM job_seeker_documents WHERE id=? AND user_id=?', args: [String(args[0]), user.id] })).rows[0];
        if (!doc)
            throw new Error('دسترسی مجاز نیست.');
        await tx.execute({ sql: 'UPDATE account_job_applications SET document_id=NULL WHERE document_id=? AND user_id=?', args: [String(args[0]), user.id] });
        await tx.execute({ sql: 'DELETE FROM job_seeker_documents WHERE id=? AND user_id=?', args: [String(args[0]), user.id] });
    }
    else if (action === 'deleteSeekerProfile') {
        await tx.execute({ sql: 'UPDATE account_job_applications SET document_id=NULL,profile_snapshot_json=NULL WHERE user_id=?', args: [user.id] });
        await tx.execute({ sql: 'DELETE FROM job_seeker_documents WHERE user_id=?', args: [user.id] });
        await tx.execute({ sql: 'DELETE FROM saved_jobs WHERE user_id=?', args: [user.id] });
        await tx.execute({ sql: 'DELETE FROM job_seeker_profiles WHERE user_id=?', args: [user.id] });
    }
    return { success: true };
}
