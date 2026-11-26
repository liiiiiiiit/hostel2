import {can} from '../src/utils/authorization.js';
import { requireProvider } from './provider-accounts.js';
import type { Transaction } from '@libsql/client';
import { z } from 'zod';
import type { JobPosting, User } from '../src/types/index.js';

export const jobTable = `CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL,
  location TEXT NOT NULL, schedule TEXT NOT NULL, description TEXT NOT NULL, contact TEXT NOT NULL,
  salary INTEGER CHECK(salary > 0), period TEXT NOT NULL CHECK(period IN ('month','day','hour')),
  status TEXT NOT NULL CHECK(status IN ('open','closed')), version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
)`;
const field = (max: number) => z.string().trim().min(1).max(max);
export const jobInput = z.object({
  id: z.uuid(), version: z.number().int().nonnegative(),
  title: field(120), company: field(120), location: field(160), schedule: field(160),
  description: field(4000), contact: field(250), salary: z.number().int().positive().max(1_000_000_000).nullable(),
  period: z.enum(['month', 'day', 'hour']), status: z.enum(['open', 'closed']), approved:z.boolean().optional(),
});

export async function saveJob(tx: Transaction, actor: User | null, job: z.infer<typeof jobInput>) {
  actor=await requireProvider(tx,actor,'job_provider');
  if (!actor) throw new Error('دسترسی مجاز نیست.');
  const fields = [job.title, job.company, job.location, job.schedule, job.description, job.contact, job.salary, job.period, job.status];
  if (job.version === 0) {
    const result = await tx.execute({
      sql: 'INSERT INTO job_postings(title,company,location,schedule,description,contact,salary,period,status,approved,id,owner_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
      args: [...fields, Number(actor.role==='admin'&&job.approved!==false), job.id, actor.id, new Date().toISOString()],
    });
    if (result.rowsAffected) return;
  } else {
    const result = await tx.execute({
      sql: 'UPDATE job_postings SET title=?, company=?, location=?, schedule=?, description=?, contact=?, salary=?, period=?, status=?, approved=?, version=version+1 WHERE id=? AND version=? AND (owner_id=? OR ?=1)',
      args: [...fields, Number(actor.role==='admin'&&job.approved!==false), job.id, job.version, actor.id, Number(actor.role === 'admin')],
    });
    if (result.rowsAffected) return;
  }
  throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function readJobs(tx: Transaction, actor: User | null): Promise<JobPosting[]> {
  const owner = can(actor,'jobs.manage')?actor!.id:'';
  const admin = Number(can(actor,'platform.admin'));
  const { rows } = await tx.execute({
    sql: `SELECT id,title,company,location,schedule,description,contact,salary,period,status,version,approved,
      (owner_id=? OR ?=1) AS manageable FROM job_postings
      WHERE (status='open' AND approved=1 AND owner_id IN (SELECT id FROM users WHERE is_active=1)) OR owner_id=? OR ?=1 ORDER BY created_at DESC,id`,
    args: [owner, admin, owner, admin],
  });
  return rows.map(row => ({
    id: String(row.id), title: String(row.title), company: String(row.company), location: String(row.location),
    schedule: String(row.schedule), description: String(row.description), contact: String(row.contact),
    salary: row.salary === null ? null : Number(row.salary), period: row.period as JobPosting['period'],
    status: row.status as JobPosting['status'], version: Number(row.version), manageable: Boolean(row.manageable), approved:Boolean(row.approved),
  }));
}

export async function deleteJob(tx:Transaction,actor:User|null,id:string,version:number){
  actor=await requireProvider(tx,actor,'job_provider');
  const result=await tx.execute({sql:'DELETE FROM job_postings WHERE id=? AND version=? AND (owner_id=? OR ?=1) AND NOT EXISTS(SELECT 1 FROM job_applications WHERE job_id=?)',args:[id,version,actor!.id,Number(actor!.role==='admin'),id]});
  if(!result.rowsAffected)throw new Error('برای حفظ درخواست‌ها، آگهی دارای درخواست را ببندید.');
}
