import {recruitmentEvent} from './recruitment-storage.js';
import express from 'express';
import { z } from 'zod';
import type { Transaction } from '@libsql/client';
import type { Database } from './database.js';
import type { User } from '../src/types/index.js';
import { requireLivePermission } from './authorization.js';
import { MAX_RESUME_BYTES, seekerState, uploadResume } from './job-seekers.js';
export function mountJobSeekerRoutes(app: express.Express, database: Database, session: (req: express.Request, tx: Transaction) => Promise<User | null>) {
    app.get('/api/job-seeker', async (req, res, next) => { try {
        res.json(await database.sqlTransaction(async (tx) => seekerState(tx, await session(req, tx)), 'read'));
    }
    catch (e) {
        next(e);
    } });
    app.post('/api/job-seeker/documents', express.raw({ type: () => true, limit: MAX_RESUME_BYTES }), async (req, res, next) => {
        try {
            if (req.headers['x-requested-with'] !== 'YerevanHub' || req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
                res.sendStatus(403);
                return;
            }
            // Independently committed limits cannot be reset by rejected uploads.
            const allowed = await database.sqlTransaction(async (tx) => { const user = await requireLivePermission(tx, await session(req, tx), 'account.self'), key = 'resume:' + user.id, now = Date.now(); await tx.execute({ sql: 'DELETE FROM rate_limits WHERE key=? AND expires_at<=?', args: [key, now] }); await tx.execute({ sql: 'INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', args: [key, now + 60000] }); return Number((await tx.execute({ sql: 'SELECT count FROM rate_limits WHERE key=?', args: [key] })).rows[0].count) <= 5; });
            if (!allowed) {
                res.set('Retry-After', '60').sendStatus(429);
                return;
            }
            if (!Buffer.isBuffer(req.body)) {
                res.sendStatus(415);
                return;
            }
            let name: string;
            try {
                name = decodeURIComponent(String(req.headers['x-file-name'] ?? ''));
            }
            catch {
                throw Error('اطلاعات واردشده معتبر نیست.');
            }
            res.status(201).json(await database.sqlTransaction(async (tx) => uploadResume(tx, await session(req, tx), req.body, name, req.headers['content-type'] ?? '')));
        }
        catch (e) {
            next(e);
        }
    });
    for (const [path, owner] of [['/api/job-seeker/documents/:id', true], ['/api/job-applications/:id/resume', false]] as const)
        app.get(path, async (req, res, next) => {
            try {
                const id = z.uuid().parse(req.params.id);
                const row = await database.sqlTransaction(async (tx) => { const actor = await requireLivePermission(tx, await session(req, tx), owner ? 'account.self' : 'jobs.manage'); const result=(await tx.execute(owner ? { sql: 'SELECT name,content FROM job_seeker_documents WHERE id=? AND user_id=?', args: [id, actor.id] } : { sql: 'SELECT d.name,d.content,j.owner_id,j.id AS job_id FROM job_seeker_documents d JOIN account_job_applications l ON l.document_id=d.id AND l.user_id=d.user_id JOIN job_postings j ON j.id=l.job_id WHERE l.reference=? AND l.withdrawn_at IS NULL AND (j.owner_id=? OR ?=1)', args: [id, actor.id, Number(actor.role === 'admin')] })).rows[0];if(result&&!owner)await recruitmentEvent(tx,String(result.owner_id),actor.id,String(result.job_id),id,'cv_download_authorized');return result; }, owner?'read':'write');
                if (!row) {
                    res.sendStatus(404);
                    return;
                }
                res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(String(row.name)).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}`, 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "sandbox; default-src 'none'", 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' }).send(Buffer.from(row.content as ArrayBuffer));
            }
            catch (e) {
                next(e);
            }
        });
}
