import {publicJobEligibility,effectiveApplicationStatus,transitions,recruitmentEvent,cancelProposedInterviews} from './recruitment-storage.js';
import {requireLivePermission} from './authorization.js';
import {readSeekerProfile,sharedProfile,documentMetadata} from './job-seekers.js';
import {can} from '../src/utils/authorization.js';
import { requireProvider } from './provider-accounts.js';
import { createHash, randomUUID } from 'node:crypto';
import type { Transaction } from '@libsql/client';
import { z } from 'zod';
import type { JobApplication, User } from '../src/types/index.js';
import { isTourPhone } from '../src/utils/tour-contact.js';

export const applicationTable = `CREATE TABLE IF NOT EXISTS job_applications (
  reference TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_postings(id),
  request_id TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL,
  message TEXT NOT NULL, submitted_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received'
  CHECK(status IN ('received','reviewing','accepted','declined'))
)`;
export const applicationReviewStatus = z.enum(['received', 'reviewing', 'accepted', 'declined']);
export const applicationStatus = z.enum(['received','reviewing','shortlisted','interview_scheduled','accepted','declined','withdrawn']);
export const applicationInput = z.object({
  requestId: z.uuid(), jobId: z.uuid(), version: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  contact: z.string().trim().max(250).refine(value => isTourPhone(value) || z.email().safeParse(value).success),
  message: z.string().trim().max(3000),
  consent:z.literal(true).optional(),shareProfile:z.boolean().optional(),documentId:z.uuid().optional(),accountRequired:z.literal(true).optional(),
});

export async function applyForJob(tx: Transaction, input: z.infer<typeof applicationInput>,actor:User|null=null) {
  actor=actor?await requireLivePermission(tx,actor,'account.self'):null;
  if((actor&&!input.consent)||(!actor&&(input.accountRequired||input.shareProfile||input.documentId)))throw Error('دسترسی مجاز نیست.');
  const fingerprint = createHash('sha256').update(JSON.stringify(actor?{...input,applicantUserId:actor.id}:input)).digest('hex');
  const existing = (await tx.execute({sql:'SELECT reference,fingerprint FROM job_applications WHERE request_id=?',args:[input.requestId]})).rows[0];
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new Error('اطلاعات واردشده معتبر نیست.');
    return String(existing.reference);
  }
  if(actor&&(await tx.execute({sql:'SELECT reference FROM account_job_applications WHERE user_id=? AND job_id=? AND withdrawn_at IS NULL',args:[actor.id,input.jobId]})).rows.length)throw Error('برای این آگهی قبلاً درخواست داده‌اید.');
  let snapshot:string|null=null;
  if(actor&&input.shareProfile){const profile=await readSeekerProfile(tx,actor);if(!profile.version)throw Error('ابتدا پروفایل کاری خود را ذخیره کنید.');snapshot=JSON.stringify(sharedProfile(profile));}
  if(input.documentId&&!(await tx.execute({sql:'SELECT id FROM job_seeker_documents WHERE id=? AND user_id=?',args:[input.documentId,actor!.id]})).rows.length)throw Error('دسترسی مجاز نیست.');
  const reference = randomUUID();
  const result = await tx.execute({
    sql: `INSERT INTO job_applications(reference,request_id,fingerprint,name,contact,message,submitted_at,job_id)
          SELECT ?,?,?,?,?,?,?,id FROM job_postings j WHERE id=? AND version=? AND ${publicJobEligibility('j')}`,
    args:[reference,input.requestId,fingerprint,input.name,input.contact,input.message,new Date().toISOString(),input.jobId,input.version],
  });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
  if(actor)await tx.execute({sql:'INSERT INTO account_job_applications(reference,job_id,user_id,document_id,profile_snapshot_json,consent_at,job_title,company) SELECT ?,id,?,?,?,?,title,company FROM job_postings WHERE id=?',args:[reference,actor.id,input.documentId??null,snapshot,new Date().toISOString(),input.jobId]});
  const job=(await tx.execute({sql:'SELECT owner_id FROM job_postings WHERE id=?',args:[input.jobId]})).rows[0];await recruitmentEvent(tx,String(job.owner_id),actor?.id??null,input.jobId,reference,'application_received');
  return reference;
}

export async function applicationProgress(tx: Transaction, reference: string) {
  const row = (await tx.execute({sql:`SELECT ${effectiveApplicationStatus()} AS status FROM job_applications a LEFT JOIN account_job_applications l ON l.reference=a.reference LEFT JOIN recruitment_applications r ON r.reference=a.reference WHERE a.reference=?`,args:[reference]})).rows[0];
  if (!row) throw new Error('اطلاعات واردشده معتبر نیست.');
  return applicationStatus.parse(row.status);
}

export async function reviewApplication(tx: Transaction, actor: User | null, reference: string, previous: JobApplication['status'], next: JobApplication['status']) {
  applicationStatus.parse(previous);applicationStatus.parse(next);
  actor=await requireProvider(tx,actor,'job_provider');
  const row=(await tx.execute({sql:`SELECT a.status,j.owner_id,a.job_id,${effectiveApplicationStatus()} AS effective FROM job_applications a JOIN job_postings j ON j.id=a.job_id LEFT JOIN account_job_applications l ON l.reference=a.reference LEFT JOIN recruitment_applications r ON r.reference=a.reference WHERE a.reference=? AND (j.owner_id=? OR ?=1)`,args:[reference,actor!.id,Number(actor!.role==='admin')]})).rows[0];
  if(!row||row.effective!==previous)throw Error('اطلاعات واردشده معتبر نیست.');
  if(previous===next)return;
  if(!transitions[previous].includes(next))throw Error('اطلاعات واردشده معتبر نیست.');
  if(next==='interview_scheduled'&&!(await tx.execute({sql:"SELECT id FROM recruitment_interviews WHERE reference=? AND state='proposed'",args:[reference]})).rows.length)throw Error('اطلاعات واردشده معتبر نیست.');
  const stage=['shortlisted','interview_scheduled'].includes(next)?next:null;
  const baseStatus=applicationReviewStatus.parse(stage?'reviewing':next);
  await tx.execute({sql:'UPDATE job_applications SET status=? WHERE reference=?',args:[baseStatus,reference]});
  await tx.execute({sql:'INSERT INTO recruitment_applications(reference,stage) VALUES(?,?) ON CONFLICT(reference) DO UPDATE SET stage=excluded.stage,version=version+1',args:[reference,stage]});
  if(next!=='interview_scheduled')await cancelProposedInterviews(tx,reference,String(row.owner_id),actor!.id,String(row.job_id),'pipeline_changed');
  await recruitmentEvent(tx,String(row.owner_id),actor!.id,String(row.job_id),reference,'application_status_changed',{previous,next});
}

export async function readApplications(tx: Transaction, actor: User | null): Promise<JobApplication[]> {
  if (!can(actor,'jobs.manage')) return [];
  actor=await requireProvider(tx,actor,'job_provider');
  const {rows} = await tx.execute({
    sql: `SELECT a.reference,a.job_id,a.name,a.contact,a.message,${effectiveApplicationStatus()} AS status,a.submitted_at,l.profile_snapshot_json,d.id,d.name AS document_name,d.byte_size,d.created_at
          FROM job_postings j JOIN job_applications a ON a.job_id=j.id LEFT JOIN account_job_applications l ON l.reference=a.reference LEFT JOIN recruitment_applications r ON r.reference=a.reference LEFT JOIN job_seeker_documents d ON d.id=l.document_id AND d.user_id=l.user_id AND l.withdrawn_at IS NULL
          WHERE j.owner_id=? OR ?=1 ORDER BY a.submitted_at DESC,a.reference`,
    args:[actor!.id,Number(actor!.role==='admin')],
  });
  return rows.map(row => ({ reference:String(row.reference), jobId:String(row.job_id), name:String(row.name),
    contact:String(row.contact), message:String(row.message), status:applicationStatus.parse(row.status), submittedAt:String(row.submitted_at),...(row.status!=='withdrawn'&&row.profile_snapshot_json?{sharedProfile:JSON.parse(String(row.profile_snapshot_json))}:{}),...(row.id?{resume:documentMetadata({...row,name:row.document_name})}:{}) }));
}
