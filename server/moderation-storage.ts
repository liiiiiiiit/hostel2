import { moderationTransitions } from '../src/types/moderation.js';
import type { Client, Transaction } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import type { ContentModule, ModerationStatus } from '../src/types/moderation.js';
import type { User } from '../src/types/index.js';
export const moderationSQL = [
    `CREATE TABLE IF NOT EXISTS content_moderation(module TEXT NOT NULL CHECK(module IN ('hostel','rental','job','tour','service','article','review')),content_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','pending_review','changes_requested','approved','published','rejected','suspended','archived')),version INTEGER NOT NULL CHECK(version>0),updated_at TEXT NOT NULL,PRIMARY KEY(module,content_id))`,
    `CREATE TABLE IF NOT EXISTS moderation_events(id TEXT PRIMARY KEY,module TEXT NOT NULL,content_id TEXT NOT NULL,from_status TEXT NOT NULL CHECK(from_status IN ('','draft','pending_review','changes_requested','approved','published','rejected','suspended','archived')),to_status TEXT NOT NULL CHECK(to_status IN ('draft','pending_review','changes_requested','approved','published','rejected','suspended','archived')),note TEXT NOT NULL CHECK(length(note)<=2000),actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS content_moderation_queue ON content_moderation(status,module,updated_at)`,
    `CREATE INDEX IF NOT EXISTS moderation_events_content ON moderation_events(module,content_id,created_at,id)`,
];
export async function moderationReady(db: Client | Transaction) {
    const tables = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r => String(r.name)));
    if (!tables.has('module_migrations'))
        return false;
    for (const [table, columns] of Object.entries({ content_moderation: ['module', 'content_id', 'status', 'version', 'updated_at'], moderation_events: ['id', 'module', 'content_id', 'from_status', 'to_status', 'note', 'actor_id', 'created_at'] })) {
        if (!tables.has(table))
            return false;
        const actual = new Set((await db.execute('PRAGMA table_info(' + table + ')')).rows.map(r => String(r.name)));
        if (columns.some(c => !actual.has(c)))
            return false;
    }
    const indexes = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r => String(r.name)));
    return indexes.has('content_moderation_queue') && indexes.has('moderation_events_content') && !!(await db.execute("SELECT name FROM module_migrations WHERE name='content-moderation-v1'")).rows.length;
}
export async function migrateModeration(db: Client) {
    const tx = await db.transaction('write');
    try {
        for (const sql of moderationSQL)
            await tx.execute(sql);
        await tx.execute("INSERT OR IGNORE INTO module_migrations VALUES('content-moderation-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
        if (!await moderationReady(tx))
            throw Error('Moderation schema is incomplete.');
        await tx.commit();
    }
    catch (e) {
        await tx.rollback();
        throw e;
    }
    finally {
        tx.close();
    }
}
// Missing metadata deliberately preserves historical publication flags. New actions
// write metadata; a non-published decision always wins over legacy flags.
export const moderationVisible = (module: ContentModule, idSQL: string) => `NOT EXISTS(SELECT 1 FROM content_moderation cm WHERE cm.module='${module}' AND cm.content_id=${idSQL} AND cm.status!='published')`;
export async function assertModerationVisible(tx: Transaction, module: ContentModule, id: string) { if ((await tx.execute({ sql: "SELECT 1 FROM content_moderation WHERE module=? AND content_id=? AND status!='published'", args: [module, id] })).rows.length)
    throw Error('اطلاعات واردشده معتبر نیست.'); }
export async function writeModeration(tx: Transaction, module: ContentModule, id: string, previous: ModerationStatus | string, next: ModerationStatus, actorId: string | null, note: string) {
    await tx.execute({ sql: 'INSERT INTO content_moderation VALUES(?,?,?,1,?) ON CONFLICT(module,content_id) DO UPDATE SET status=excluded.status,version=content_moderation.version+1,updated_at=excluded.updated_at', args: [module, id, next, new Date().toISOString()] });
    await tx.execute({ sql: 'INSERT INTO moderation_events VALUES(?,?,?,?,?,?,?,?)', args: [randomUUID(), module, id, previous, next, note, actorId, new Date().toISOString()] });
}
export function legacyModeration(module: ContentModule, row: Record<string, unknown>): ModerationStatus {
    if (module === 'hostel')
        return row.isPublished || row.is_published ? 'published' : (row.listingStatus ?? row.listing_status) === 'archived' ? 'archived' : 'draft';
    if (module === 'rental')
        return (row.status ?? row.listingStatus ?? row.listing_status) === 'published' ? 'published' : (row.status ?? row.listingStatus ?? row.listing_status) === 'archived' ? 'archived' : 'draft';
    if (module === 'job')
        return row.recruitment_state === 'draft' ? 'draft' : row.recruitment_state === 'rejected' ? 'rejected' : row.approved ? 'published' : 'pending_review';
    if (module === 'tour')
        return !row.published ? 'draft' : row.approved ? (row.published && !row.hidden ? 'published' : 'draft') : 'pending_review';
    if (module === 'service')
        return row.isActive || row.is_active ? 'published' : 'draft';
    if (module === 'review')
        return row.status === 'approved' ? 'published' : row.status === 'rejected' ? 'rejected' : 'pending_review';
    return row.status === 'published' ? 'published' : 'draft';
}
export async function syncModeration(tx: Transaction, module: ContentModule, id: string, actor: User | null, row: Record<string, unknown>, note = 'content_saved') {
    const old = (await tx.execute({ sql: 'SELECT status FROM content_moderation WHERE module=? AND content_id=?', args: [module, id] })).rows[0];
    let next = legacyModeration(module, row);
    // Legacy editors cannot silently undo explicit sanctions, including admin editors.
    if (old && ['suspended', 'archived'].includes(String(old.status))) {
        next = old.status as ModerationStatus;
        if (module === 'hostel' || module === 'rental')
            await tx.execute({ sql: "UPDATE properties SET is_published=0,listing_status=? WHERE kind=? AND id=?", args: [next === 'archived' ? 'archived' : 'hidden', module, id] });
        else if (module === 'job')
            await tx.execute({ sql: 'UPDATE job_postings SET approved=0 WHERE id=?', args: [id] });
        else if (module === 'tour')
            await tx.execute({ sql: 'UPDATE tour_listings SET approved=0,published=0 WHERE id=?', args: [id] });
        else if (module === 'service')
            await tx.execute({ sql: 'UPDATE service_listings SET is_active=0 WHERE id=?', args: [id] });
        else if (module === 'article')
            await tx.execute({ sql: "UPDATE articles SET status='draft' WHERE id=?", args: [id] });
        else
            await tx.execute({ sql: "UPDATE reviews SET status='pending' WHERE id=?", args: [id] });
    }
    if (actor && actor.role !== 'admin' && next === 'published') {
        next = 'pending_review';
        if (module === 'hostel' || module === 'rental')
            await tx.execute({ sql: "UPDATE properties SET is_published=0,listing_status='hidden' WHERE kind=? AND id=?", args: [module, id] });
    }
    if (old && old.status !== next && !moderationTransitions[old.status as ModerationStatus].includes(next))
        throw Error('اطلاعات واردشده معتبر نیست.');
    await writeModeration(tx, module, id, String(old?.status ?? ''), next, actor?.id ?? null, note);
}
// Compare business content separately from operational inventory and verification.
export function moderationComparable(value: unknown): string {
    const ignored = new Set(['createdAt', 'updatedAt', 'verification', 'locationVerification', 'verifiedBadge', 'verifiedExplanation', 'lastCheckedAt', 'ratingAverage', 'reviewCount', 'physicalUnits', 'totalBedsOrRooms', 'immediateStayEnabled', 'immediateStayExpiresAt', 'floorAndDoorCode', 'commissionRule', 'landlordInternalNotes']);
    return JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().filter(k => !ignored.has(k)).map(k => [k, v[k]])) : v);
}
