import {syncModeration} from './moderation-storage.js';
import { z } from 'zod';
import type { Transaction } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import type { User, JobPosting } from '../src/types/index.js';
import type { EmployerOrganization, RecruitmentState, RecruitmentInterview, RecruitmentStatus } from '../src/types/recruitment.js';
import { requireLivePermission, authorizationUser } from './authorization.js';
import { readJobs, saveJob, jobInput } from './job-postings.js';
import { readApplications, reviewApplication, applicationStatus } from './job-applications.js';
import { recruitmentEvent, cancelProposedInterviews, transitions } from './recruitment-storage.js';
const text = (n: number) => z.string().trim().max(n), userId = z.string().min(1).max(500);
const future = z.iso.datetime({ offset: true }).transform(s => new Date(s).toISOString()).refine(s => Date.parse(s) > Date.now() && Date.parse(s) < Date.now() + 366 * 86400000);
export const organizationInput = z.object({ ownerId: userId, version: z.number().int().nonnegative(), name: text(160).min(1), description: text(3000), website: z.union([z.literal(''), z.url().max(500).refine(v => ['http:', 'https:'].includes(new URL(v).protocol))]), phone: text(100), city: text(160) }).strict();
const draftJob = jobInput.extend(Object.fromEntries(['company', 'location', 'schedule', 'description', 'contact'].map(k => [k, text(k === 'description' ? 4000 : k === 'contact' ? 250 : k === 'company' ? 120 : 160)])) as {
    company: z.ZodString;
    location: z.ZodString;
    schedule: z.ZodString;
    description: z.ZodString;
    contact: z.ZodString;
});
export const recruitmentJobInput = z.object({ job: draftJob, publication: z.enum(['draft', 'pending', 'approved', 'rejected']), expiresAt: z.union([future, z.null()]), moderationNote: text(2000) }).strict();
export const interviewInput = z.object({ reference: z.uuid(), previousStatus: applicationStatus, previousId: z.uuid().nullable(), startsAt: future, minutes: z.number().int().min(15).max(240), kind: z.enum(['video', 'phone', 'in_person']), location: text(500).min(1) }).strict();
export const recruitmentActions = { saveEmployerOrganization: z.tuple([organizationInput]), saveRecruitmentJob: z.tuple([recruitmentJobInput]), closeRecruitmentJob: z.tuple([z.uuid(), z.number().int().positive()]), renewRecruitmentJob: z.tuple([z.uuid(), z.number().int().positive(), future]), saveRecruitmentNote: z.tuple([z.uuid(), z.number().int().nonnegative(), text(5000)]), scheduleRecruitmentInterview: z.tuple([interviewInput]), finishRecruitmentInterview: z.tuple([z.uuid(), z.enum(['cancelled', 'completed']), z.literal(true)]) };
export async function scopedApplication(tx: Transaction, actor: User | null, reference: string) { const user = await requireLivePermission(tx, actor, 'jobs.manage'); const row = (await tx.execute({ sql: 'SELECT a.*,j.owner_id,j.title AS job_title,r.stage,CASE WHEN l.withdrawn_at IS NOT NULL THEN 1 ELSE 0 END AS withdrawn FROM job_applications a JOIN job_postings j ON j.id=a.job_id LEFT JOIN recruitment_applications r ON r.reference=a.reference LEFT JOIN account_job_applications l ON l.reference=a.reference WHERE a.reference=? AND (j.owner_id=? OR ?=1)', args: [reference, user.id, Number(user.role === 'admin')] })).rows[0]; if (!row)
    throw Error('دسترسی مجاز نیست.'); return { user, row, status: (row.withdrawn ? 'withdrawn' : row.status === 'reviewing' && row.stage ? String(row.stage) : String(row.status)) as RecruitmentStatus }; }
async function organizationOwner(tx: Transaction, id: string): Promise<User> { const r = (await tx.execute({ sql: "SELECT u.id,u.name,u.email,u.phone,u.role,u.is_active,u.created_at FROM users u WHERE u.id=? AND (u.role IN ('admin','job_provider') OR EXISTS(SELECT 1 FROM provider_accounts p WHERE p.user_id=u.id AND p.provider_role='job_provider') OR EXISTS(SELECT 1 FROM legacy_provider_access p WHERE p.user_id=u.id AND p.provider_role='job_provider') OR EXISTS(SELECT 1 FROM job_postings j WHERE j.owner_id=u.id))", args: [id] })).rows[0]; if (!r)
    throw Error('اطلاعات واردشده معتبر نیست.'); return { id: String(r.id), name: String(r.name), email: String(r.email), phone: String(r.phone ?? ''), role: r.role as User['role'], isActive: !!r.is_active, createdAt: String(r.created_at) }; }
export async function organization(tx: Transaction, owner: User): Promise<EmployerOrganization> { const row = (await tx.execute({ sql: 'SELECT * FROM employer_organizations WHERE user_id=?', args: [owner.id] })).rows[0]; const legacy = (await tx.execute({ sql: 'SELECT organization FROM provider_accounts WHERE user_id=?', args: [owner.id] })).rows[0]; return row ? { ownerId: owner.id, version: Number(row.version), name: String(row.name), description: String(row.description), website: String(row.website), phone: String(row.phone), city: String(row.city) } : { ownerId: owner.id, version: 0, name: String(legacy?.organization || owner.name), description: '', website: '', phone: owner.phone ?? '', city: '' }; }
export async function interviews(tx: Transaction, reference: string): Promise<RecruitmentInterview[]> { return (await tx.execute({ sql: 'SELECT * FROM recruitment_interviews WHERE reference=? ORDER BY created_at DESC,id', args: [reference] })).rows.map(r => ({ id: String(r.id), reference: String(r.reference), startsAt: String(r.starts_at), minutes: Number(r.minutes), kind: r.kind as RecruitmentInterview['kind'], location: String(r.location), state: r.state as RecruitmentInterview['state'], createdAt: String(r.created_at) })); }
export async function recruitmentAction(tx: Transaction, actor: User | null, action: keyof typeof recruitmentActions, args: unknown[]) {
    const user = await requireLivePermission(tx, actor, 'jobs.manage');
    args = recruitmentActions[action].parse(args) as unknown[];
    if (action === 'saveEmployerOrganization') {
        const v = organizationInput.parse(args[0]);
        if (v.ownerId !== user.id && user.role !== 'admin')
            throw Error('دسترسی مجاز نیست.');
        const owner = await organizationOwner(tx, v.ownerId);
        const result = v.version === 0 ? await tx.execute({ sql: 'INSERT INTO employer_organizations VALUES(?,1,?,?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING', args: [owner.id, v.name, v.description, v.website, v.phone, v.city, new Date().toISOString()] }) : await tx.execute({ sql: 'UPDATE employer_organizations SET version=version+1,name=?,description=?,website=?,phone=?,city=?,updated_at=? WHERE user_id=? AND version=?', args: [v.name, v.description, v.website, v.phone, v.city, new Date().toISOString(), owner.id, v.version] });
        if (!result.rowsAffected)
            throw Error('اطلاعات واردشده معتبر نیست.');
        await tx.execute({ sql: 'UPDATE provider_accounts SET organization=? WHERE user_id=?', args: [v.name, owner.id] });
        await recruitmentEvent(tx, owner.id, user.id, null, owner.id, 'organization_saved');
    }
    else if (action === 'saveRecruitmentJob') {
        const v = recruitmentJobInput.parse(args[0]);
        if (user.role !== 'admin' && (!['draft', 'pending'].includes(v.publication) || !!v.moderationNote))
            throw Error('دسترسی مجاز نیست.');
        if (v.publication === 'rejected' && !v.moderationNote)
            throw Error('اطلاعات واردشده معتبر نیست.');
        if (!['draft', 'rejected'].includes(v.publication))
            jobInput.parse(v.job);
        await saveJob(tx, user, { ...v.job, approved: v.publication === 'approved' });
        await tx.execute({ sql: 'UPDATE recruitment_jobs SET state=?,expires_at=?,moderation_note=?,published_at=CASE WHEN ?=1 THEN ? ELSE published_at END WHERE job_id=?', args: [v.publication, v.expiresAt, v.moderationNote, Number(v.publication === 'approved'), new Date().toISOString(), v.job.id] });
        await syncModeration(tx,'job',v.job.id,user,{...v.job,approved:v.publication==='approved',recruitment_state:v.publication});
        const owner = (await tx.execute({ sql: 'SELECT owner_id FROM job_postings WHERE id=?', args: [v.job.id] })).rows[0];
        await recruitmentEvent(tx, String(owner.owner_id), user.id, v.job.id, v.job.id, 'publication_changed', { publication: v.publication, expiresAt: v.expiresAt });
    }
    else if (action === 'closeRecruitmentJob' || action === 'renewRecruitmentJob') {
        const job = (await readJobs(tx, user)).find(j => j.id === args[0] && j.manageable);
        if (!job || job.version !== args[1])
            throw Error('اطلاعات واردشده معتبر نیست.');
        const row = (await tx.execute({ sql: 'SELECT owner_id FROM job_postings WHERE id=?', args: [job.id] })).rows[0];
        if (action === 'closeRecruitmentJob')
            await tx.execute({ sql: "UPDATE job_postings SET status='closed',version=version+1 WHERE id=? AND version=?", args: [job.id, job.version] });
        else
            await recruitmentAction(tx, user, 'saveRecruitmentJob', [{ job: { ...job, status: 'open' }, publication: user.role === 'admin' ? 'approved' : 'pending', expiresAt: args[2], moderationNote: '' }]);
        await recruitmentEvent(tx, String(row.owner_id), user.id, job.id, job.id, action === 'closeRecruitmentJob' ? 'job_closed' : 'job_renewed');
    }
    else if (action === 'saveRecruitmentNote') {
        const { row, status } = await scopedApplication(tx, user, String(args[0]));
        if (status === 'withdrawn')
            throw Error('اطلاعات واردشده معتبر نیست.');
        const version = Number(args[1]), note = String(args[2]);
        const result = version === 0 ? await tx.execute({ sql: 'INSERT INTO recruitment_applications(reference,note) VALUES(?,?) ON CONFLICT(reference) DO NOTHING', args: [String(args[0]), note] }) : await tx.execute({ sql: 'UPDATE recruitment_applications SET note=?,version=version+1 WHERE reference=? AND version=?', args: [note, String(args[0]), version] });
        if (!result.rowsAffected)
            throw Error('اطلاعات واردشده معتبر نیست.');
        await recruitmentEvent(tx, String(row.owner_id), user.id, String(row.job_id), String(args[0]), 'employer_note_updated', { length: note.length });
    }
    else if (action === 'scheduleRecruitmentInterview') {
        const v = interviewInput.parse(args[0]), { row, status } = await scopedApplication(tx, user, v.reference);
        if (status !== v.previousStatus || ['accepted', 'declined', 'withdrawn'].includes(status))
            throw Error('اطلاعات واردشده معتبر نیست.');
        const active = (await tx.execute({ sql: "SELECT id FROM recruitment_interviews WHERE reference=? AND state='proposed'", args: [v.reference] })).rows[0];
        if ((active ? String(active.id) : null) !== v.previousId)
            throw Error('اطلاعات واردشده معتبر نیست.');
        await cancelProposedInterviews(tx, v.reference, String(row.owner_id), user.id, String(row.job_id), 'rescheduled');
        const id = randomUUID();
        await tx.execute({ sql: "INSERT INTO recruitment_interviews VALUES(?,?,?,?,?,?,'proposed',?)", args: [id, v.reference, v.startsAt, v.minutes, v.kind, v.location, new Date().toISOString()] });
        await reviewApplication(tx, user, v.reference, status, 'interview_scheduled');
        await recruitmentEvent(tx, String(row.owner_id), user.id, String(row.job_id), v.reference, 'interview_proposed', { interviewId: id, startsAt: v.startsAt, kind: v.kind });
    }
    else if (action === 'finishRecruitmentInterview') {
        const interview = (await tx.execute({ sql: 'SELECT reference,starts_at FROM recruitment_interviews WHERE id=?', args: [String(args[0])] })).rows[0];
        if (!interview)
            throw Error('دسترسی مجاز نیست.');
        const { row, status } = await scopedApplication(tx, user, String(interview.reference));
        if (status === 'withdrawn' || args[1] === 'completed' && Date.parse(String(interview.starts_at)) > Date.now())
            throw Error('اطلاعات واردشده معتبر نیست.');
        const result = await tx.execute({ sql: "UPDATE recruitment_interviews SET state=? WHERE id=? AND state='proposed'", args: [String(args[1]), String(args[0])] });
        if (!result.rowsAffected)
            throw Error('اطلاعات واردشده معتبر نیست.');
        if (status === 'interview_scheduled')
            await reviewApplication(tx, user, String(interview.reference), status, 'reviewing');
        await recruitmentEvent(tx, String(row.owner_id), user.id, String(row.job_id), String(interview.reference), 'interview_' + String(args[1]), { interviewId: String(args[0]) });
    }
    return { success: true };
}
export const recruitmentQuery = z.object({ search: text(120).default(''), applicantSearch: text(120).default(''), publication: z.enum(['all', 'draft', 'pending', 'approved', 'rejected', 'expired', 'closed']).default('all'), status: z.union([applicationStatus, z.literal('all')]).default('all'), jobId: z.union([z.uuid(), z.literal('')]).default(''), ownerId: text(500).default(''), page: z.coerce.number().int().min(1).max(100000).default(1), jobPage: z.coerce.number().int().min(1).max(100000).default(1), historyPage: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
function page<T>(items: T[], number: number, size = 10) { const pages = Math.max(1, Math.ceil(items.length / size)), current = Math.min(number, pages); return { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pages }; }
export async function recruitmentState(tx: Transaction, actor: User | null, q: z.infer<typeof recruitmentQuery>): Promise<RecruitmentState> {
    const user = await requireLivePermission(tx, actor, 'jobs.manage');
    if (q.ownerId && q.ownerId !== user.id && user.role !== 'admin')
        throw Error('دسترسی مجاز نیست.');
    const owner = q.ownerId ? await organizationOwner(tx, q.ownerId) : user;
    const allJobs = (await readJobs(tx, user)).filter(j => j.manageable);
    const ids = new Set<string>();
    if (q.ownerId)
        for (const row of (await tx.execute({ sql: 'SELECT id FROM job_postings WHERE owner_id=?', args: [q.ownerId] })).rows)
            ids.add(String(row.id));
    const jobs = allJobs.filter(j => !q.ownerId || ids.has(j.id));
    const allApps = (await readApplications(tx, user)).filter(a => jobs.some(j => j.id === a.jobId));
    const statuses = { received: 0, reviewing: 0, shortlisted: 0, interview_scheduled: 0, accepted: 0, declined: 0, withdrawn: 0 };
    for (const a of allApps)
        statuses[a.status]++;
    const applications = page(allApps.filter(a => (!q.jobId || a.jobId === q.jobId) && (q.status === 'all' || a.status === q.status) && JSON.stringify([a.name, a.contact, a.message, a.sharedProfile]).toLocaleLowerCase().includes(q.applicantSearch.toLocaleLowerCase())), q.page);
    const items = [];
    for (const a of applications.items) {
        const r = (await tx.execute({ sql: 'SELECT note,version FROM recruitment_applications WHERE reference=?', args: [a.reference] })).rows[0];
        const job = jobs.find(j => j.id === a.jobId)!;
        items.push({ ...a, jobTitle: job.title, company: job.company, note: String(r?.note ?? ''), noteVersion: Number(r?.version ?? 0), interviews: await interviews(tx, a.reference) });
    }
    const events = (await tx.execute({ sql: 'SELECT * FROM recruitment_events WHERE (owner_id=? OR ?=1) AND (?=\'\' OR owner_id=?) ORDER BY created_at DESC,id DESC', args: [user.id, Number(user.role === 'admin'), q.ownerId, q.ownerId] })).rows.map(r => ({ id: String(r.id), targetId: String(r.target_id), jobId: r.job_id ? String(r.job_id) : null, kind: String(r.kind), createdAt: String(r.created_at), details: JSON.parse(String(r.details)) }));
    const orgRows = (await tx.execute({ sql: "SELECT DISTINCT u.id,COALESCE(NULLIF(o.name,''),NULLIF(p.organization,''),u.name) AS name FROM users u LEFT JOIN provider_accounts p ON p.user_id=u.id LEFT JOIN employer_organizations o ON o.user_id=u.id WHERE (u.id=? OR ?=1) AND (u.role IN ('admin','job_provider') OR p.provider_role='job_provider' OR u.id IN (SELECT owner_id FROM job_postings)) ORDER BY name,u.id", args: [user.id, Number(user.role === 'admin')] })).rows;
    return { organization: await organization(tx, owner), organizations: orgRows.map(r => ({ ownerId: String(r.id), name: String(r.name) })), jobs: page(jobs.filter(j => JSON.stringify([j.title, j.company, j.location]).toLocaleLowerCase().includes(q.search.toLocaleLowerCase()) && (q.publication === 'all' || j.publication === q.publication)), q.jobPage), applications: { ...applications, items }, history: page(events, q.historyPage, 20), stats: { jobs: jobs.length, open: jobs.filter(j => j.acceptingApplications).length, drafts: jobs.filter(j => j.publication === 'draft').length, pending: jobs.filter(j => j.publication === 'pending').length, expired: jobs.filter(j => j.publication === 'expired').length, applications: allApps.length, statuses } };
}
