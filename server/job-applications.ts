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
export const applicationStatus = z.enum(['received', 'reviewing', 'accepted', 'declined']);
export const applicationInput = z.object({
  requestId: z.uuid(), jobId: z.uuid(), version: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  contact: z.string().trim().max(250).refine(value => isTourPhone(value) || z.email().safeParse(value).success),
  message: z.string().trim().max(3000),
});

export async function applyForJob(tx: Transaction, input: z.infer<typeof applicationInput>) {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const existing = (await tx.execute({sql:'SELECT reference,fingerprint FROM job_applications WHERE request_id=?',args:[input.requestId]})).rows[0];
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new Error('اطلاعات واردشده معتبر نیست.');
    return String(existing.reference);
  }
  const reference = randomUUID();
  const result = await tx.execute({
    sql: `INSERT INTO job_applications(reference,request_id,fingerprint,name,contact,message,submitted_at,job_id)
          SELECT ?,?,?,?,?,?,?,id FROM job_postings WHERE id=? AND version=? AND status='open'`,
    args:[reference,input.requestId,fingerprint,input.name,input.contact,input.message,new Date().toISOString(),input.jobId,input.version],
  });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
  return reference;
}

export async function applicationProgress(tx: Transaction, reference: string) {
  const row = (await tx.execute({sql:'SELECT status FROM job_applications WHERE reference=?',args:[reference]})).rows[0];
  if (!row) throw new Error('اطلاعات واردشده معتبر نیست.');
  return applicationStatus.parse(row.status);
}

export async function reviewApplication(tx: Transaction, actor: User | null, reference: string, previous: JobApplication['status'], next: JobApplication['status']) {
  if (!actor) throw new Error('دسترسی مجاز نیست.');
  const result = await tx.execute({
    sql: `UPDATE job_applications SET status=? WHERE reference=? AND status=?
          AND job_id IN (SELECT id FROM job_postings WHERE owner_id=? OR ?=1)`,
    args:[next,reference,previous,actor.id,Number(actor.role==='admin')],
  });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function readApplications(tx: Transaction, actor: User | null): Promise<JobApplication[]> {
  if (!actor) return [];
  const {rows} = await tx.execute({
    sql: `SELECT a.reference,a.job_id,a.name,a.contact,a.message,a.status,a.submitted_at
          FROM job_postings j JOIN job_applications a ON a.job_id=j.id
          WHERE j.owner_id=? OR ?=1 ORDER BY a.submitted_at DESC,a.reference`,
    args:[actor.id,Number(actor.role==='admin')],
  });
  return rows.map(row => ({ reference:String(row.reference), jobId:String(row.job_id), name:String(row.name),
    contact:String(row.contact), message:String(row.message), status:applicationStatus.parse(row.status), submittedAt:String(row.submitted_at) }));
}
