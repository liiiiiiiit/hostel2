import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Transaction } from '@libsql/client';
import type { User, Hostel, RentalProperty } from '../src/types/index.js';
import { contentModules, moderationStates, moderationTransitions, type ContentModule, type ModerationItem, type ModerationPage, type ModerationStatus } from '../src/types/moderation.js';
import { requireLivePermission } from './authorization.js';
import { legacyModeration, writeModeration } from './moderation-storage.js';
import { loadState, none, where, stableJSON } from './relational-store.js';
import { tables } from './relational-schema.js';
import { publicationIssues } from '../src/utils/properties.js';
import { hostelSchema, rentalSchema } from './property-schemas.js';
import { jobInput } from './job-postings.js';
import { tourInput } from './tours.js';
import { serviceInput } from './services.js';
import { articleSchema } from './article-schema.js';
export const moderationQuery = z.object({ module: z.enum(['all', ...contentModules]).default('all'), status: z.enum(['all', ...moderationStates]).default('pending_review'), search: z.string().trim().max(120).default(''), language: z.enum(['fa', 'en', 'ru', 'hy']).default('fa'), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
const target = z.object({ module: z.enum(contentModules), id: z.string().min(1).max(500), version: z.number().int().nonnegative(), contentVersion: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const moderationInput = z.object({ targets: z.array(target).min(1).max(30), status: z.enum(moderationStates), note: z.string().trim().max(2000), confirmed: z.literal(true) }).strict().refine(v => new Set(v.targets.map(t => t.module + ':' + t.id)).size === v.targets.length);
const empty = () => Object.fromEntries(tables.map(t => [t.table, none]));
const text = (v: unknown, language = 'fa') => typeof v === 'string' ? v : v && typeof v === 'object' ? String((v as Record<string, unknown>)[language] ?? Object.values(v)[0] ?? '') : '';
async function content(tx: Transaction, module: ContentModule, id: string) {
    if (module === 'hostel' || module === 'rental' || module === 'article') {
        const state = (await loadState(tx, { ...empty(), ...(module === 'article' ? { articles: where('id=?', id) } : { properties: where('kind=? AND id=?', module, id) }) })).state;
        const row = (module === 'hostel' ? state.hostels : module === 'rental' ? state.rentals : state.articles).find(r => r.id === id);
        if (!row)
            throw Error('اطلاعات واردشده معتبر نیست.');
        return row as unknown as Record<string, unknown>;
    }
    const table = { job: 'job_postings', tour: 'tour_listings', service: 'service_listings', review: 'reviews' }[module];
    const row = (await tx.execute({ sql: `SELECT * FROM ${table} WHERE id=?`, args: [id] })).rows[0];
    if (!row)
        throw Error('اطلاعات واردشده معتبر نیست.');
    if (module === 'job') {
        const meta = (await tx.execute({ sql: 'SELECT state,expires_at FROM recruitment_jobs WHERE job_id=?', args: [id] })).rows[0];
        return { ...row, recruitment_state: meta?.state, expires_at: meta?.expires_at };
    }
    return row as Record<string, unknown>;
}
async function item(tx: Transaction, module: ContentModule, id: string, language = 'fa'): Promise<ModerationItem> {
    const row = await content(tx, module, id), meta = (await tx.execute({ sql: 'SELECT * FROM content_moderation WHERE module=? AND content_id=?', args: [module, id] })).rows[0];
    const history = (await tx.execute({ sql: 'SELECT * FROM moderation_events WHERE module=? AND content_id=? ORDER BY created_at DESC,id DESC LIMIT 50', args: [module, id] })).rows.map(r => ({ id: String(r.id), from: String(r.from_status), to: r.to_status as ModerationStatus, note: String(r.note), actorId: r.actor_id ? String(r.actor_id) : null, createdAt: String(r.created_at) }));
    const title = module === 'service' ? text(JSON.parse(String(row.title_json)), language) : text(row.title ?? row.name ?? row.comment, language);
    const summary = module === 'service' ? text(JSON.parse(String(row.description_json)), language) : text(row.description ?? row.content ?? row.summary ?? row.comment, language);
    const images = (module === 'service' ? [row.cover_image, ...JSON.parse(String(row.gallery_json))] : module === 'article' ? [row.featuredImage] : Array.isArray(row.photos) ? row.photos : []).filter((v: unknown): v is string => typeof v === 'string' && (/^(https:\/\/|\/api\/app\?media=)/.test(v))).slice(0, 8);
    return { module, id, title, status: meta?.status as ModerationStatus ?? legacyModeration(module, row), version: Number(meta?.version ?? 0), contentVersion: createHash('sha256').update(stableJSON(row)).digest('hex'), summary: summary.slice(0, 10000), images, history, historyTotal: Number((await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM moderation_events WHERE module=? AND content_id=?', args: [module, id] })).rows[0].n) };
}
const catalog = `SELECT kind AS module,id,COALESCE(slug,'')||' '||COALESCE(city,'')||' '||COALESCE((SELECT group_concat(value,' ') FROM property_translations t WHERE t.kind=properties.kind AND t.property_id=properties.id),'') AS searchable,CASE WHEN listing_status='archived' THEN 'archived' WHEN (kind='hostel' AND is_published=1) OR (kind='rental' AND listing_status='published') THEN 'published' ELSE 'draft' END AS legacy FROM properties
 UNION ALL SELECT 'job',j.id,title||' '||company,CASE WHEN r.state='draft' THEN 'draft' WHEN r.state='rejected' THEN 'rejected' WHEN approved=1 THEN 'published' ELSE 'pending_review' END FROM job_postings j LEFT JOIN recruitment_jobs r ON r.job_id=j.id
 UNION ALL SELECT 'tour',id,title||' '||organizer,CASE WHEN published=0 THEN 'draft' WHEN approved=0 THEN 'pending_review' WHEN published=1 AND hidden=0 THEN 'published' ELSE 'draft' END FROM tour_listings
 UNION ALL SELECT 'service',id,title_json||' '||city,CASE WHEN is_active=1 THEN 'published' ELSE 'draft' END FROM service_listings
 UNION ALL SELECT 'article',id,title,CASE WHEN status='published' THEN 'published' ELSE 'draft' END FROM articles
 UNION ALL SELECT 'review',id,comment,CASE WHEN status='approved' THEN 'published' WHEN status='rejected' THEN 'rejected' ELSE 'pending_review' END FROM reviews`;
export async function moderationPage(tx: Transaction, actor: User | null, q: z.infer<typeof moderationQuery>): Promise<ModerationPage> {
    await requireLivePermission(tx, actor, 'platform.admin');
    // SQLite NOCASE is ASCII-only: use JS Unicode case folding on the bounded
    // lightweight catalog, and load full content/history only for the current page.
    const rows = (await tx.execute(`WITH catalog AS (${catalog}) SELECT c.module,c.id,c.searchable,COALESCE(m.status,c.legacy) AS status FROM catalog c LEFT JOIN content_moderation m ON m.module=c.module AND m.content_id=c.id ORDER BY CASE COALESCE(m.status,c.legacy) WHEN 'pending_review' THEN 0 ELSE 1 END,m.updated_at DESC,c.module,c.id`)).rows.filter(r => (q.module === 'all' || r.module === q.module) && (q.status === 'all' || r.status === q.status) && String(r.searchable).toLocaleLowerCase().includes(q.search.toLocaleLowerCase()));
    const items = [];
    for (const r of rows.slice((q.page - 1) * 20, q.page * 20))
        items.push(await item(tx, r.module as ContentModule, String(r.id), q.language));
    return { items, total: rows.length, page: q.page, pageSize: 20 };
}
async function validatePublication(tx: Transaction, module: ContentModule, id: string) {
    const row = await content(tx, module, id);
    if (module === 'hostel' || module === 'rental') {
        if (module === 'hostel')
            hostelSchema.parse(row);
        else
            rentalSchema.parse(row);
        if (!row.slug || publicationIssues(row as unknown as Hostel | RentalProperty).length)
            throw Error('اطلاعات انتشار ملک کامل نیست.');
    }
    else if (module === 'job')
        jobInput.parse({ ...row, version: row.version, approved: !!row.approved });
    else if (module === 'tour')
        tourInput.parse({ ...row, published: !!row.published, hidden: !!row.hidden, approved: !!row.approved });
    else if (module === 'service') {
        const v = { id, slug: row.slug, categoryId: row.category_id, version: row.version, isActive: true, isFeatured: !!row.is_featured, isVerified: !!row.is_verified, allowBookingRequest: !!row.allow_booking_request, coverImage: row.cover_image, phone: row.phone, whatsapp: row.whatsapp, telegram: row.telegram, instagram: row.instagram, website: row.website, city: row.city, district: row.district, mapUrl: row.map_url, latitude: row.latitude, longitude: row.longitude,
            ...Object.fromEntries(['title', 'short_description', 'description', 'address', 'working_hours', 'price_range', 'gallery', 'languages', 'highlights'].map(k => [{ short_description: 'shortDescription', working_hours: 'workingHours', price_range: 'priceRange', languages: 'languagesSpoken' }[k] ?? k, JSON.parse(String(row[k + '_json']))])) };
        serviceInput.parse(v);
        if (!(await tx.execute({ sql: 'SELECT 1 FROM service_categories WHERE id=? AND is_active=1', args: [String(row.category_id)] })).rows.length)
            throw Error('اطلاعات انتشار ملک کامل نیست.');
    }
    else if (module === 'article')
        articleSchema.parse(row);
}
async function nativeFlags(tx: Transaction, module: ContentModule, id: string, status: ModerationStatus, note: string) {
    const published = status === 'published', approved = status === 'approved' || published;
    const existing = (module === 'hostel' || module === 'rental' || module === 'article') ? await content(tx, module, id) : null;
    const updatedAt = new Date(Math.max(Date.now(), (Date.parse(String(existing?.updatedAt ?? '')) || 0) + 1)).toISOString();
    if (module === 'hostel' || module === 'rental')
        await tx.execute({ sql: "UPDATE properties SET listing_status=?,is_published=CASE WHEN kind='hostel' THEN ? ELSE is_published END,updated_at=? WHERE kind=? AND id=?", args: [published ? 'published' : status === 'archived' ? 'archived' : 'hidden', Number(published), updatedAt, module, id] });
    else if (module === 'job') {
        await tx.execute({ sql: 'UPDATE job_postings SET approved=?,version=version+1 WHERE id=?', args: [Number(approved), id] });
        await tx.execute({ sql: "INSERT INTO recruitment_jobs(job_id,state,published_at) VALUES(?,?,?) ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,moderation_note=?,published_at=CASE WHEN excluded.state='approved' THEN COALESCE(recruitment_jobs.published_at,excluded.published_at) ELSE recruitment_jobs.published_at END", args: [id, approved ? 'approved' : status === 'draft' ? 'draft' : status === 'rejected' ? 'rejected' : 'pending', published ? new Date().toISOString() : null, note] });
    }
    else if (module === 'tour')
        await tx.execute({ sql: 'UPDATE tour_listings SET approved=?,published=?,version=version+1 WHERE id=?', args: [Number(approved), Number(published), id] });
    else if (module === 'service')
        await tx.execute({ sql: 'UPDATE service_listings SET is_active=?,version=version+1,updated_at=? WHERE id=?', args: [Number(published), new Date().toISOString(), id] });
    else if (module === 'article')
        await tx.execute({ sql: 'UPDATE articles SET status=?,updated_at=? WHERE id=?', args: [published ? 'published' : 'draft', updatedAt, id] });
    else
        await tx.execute({ sql: 'UPDATE reviews SET status=? WHERE id=?', args: [published ? 'approved' : status === 'rejected' ? 'rejected' : 'pending', id] });
}
export async function moderateContent(tx: Transaction, actor: User | null, input: unknown) {
    const user = await requireLivePermission(tx, actor, 'platform.admin'), v = moderationInput.parse(input);
    if (['changes_requested', 'rejected', 'suspended', 'archived'].includes(v.status) && !v.note)
        throw Error('اطلاعات واردشده معتبر نیست.');
    // Validate the entire batch first. Any later audit/write failure rolls back all.
    const before = [];
    for (const target of v.targets) {
        const current = await item(tx, target.module, target.id);
        if (current.version !== target.version || current.contentVersion !== target.contentVersion)
            throw Error('اطلاعات یا قیمت تغییر کرده است؛ شرایط جدید را بررسی کنید.');
        if (!moderationTransitions[current.status].includes(v.status))
            throw Error('اطلاعات واردشده معتبر نیست.');
        if (v.status === 'approved' || v.status === 'published')
            await validatePublication(tx, target.module, target.id);
        before.push(current);
    }
    for (const current of before) {
        await nativeFlags(tx, current.module, current.id, v.status, v.note);
        await writeModeration(tx, current.module, current.id, current.status, v.status, user.id, v.note);
    }
    return { success: true };
}
export async function moderationDetail(tx: Transaction, actor: User | null, module: ContentModule, id: string) { await requireLivePermission(tx, actor, 'platform.admin'); return item(tx, module, id); }
export const moderationHistoryQuery = z.object({ module: z.enum(contentModules), id: z.string().min(1).max(500), beforeTime: z.iso.datetime().optional(), beforeId: z.uuid().optional() }).strict().refine(v => !!v.beforeTime === !!v.beforeId);
export async function moderationHistory(tx: Transaction, actor: User | null, q: z.infer<typeof moderationHistoryQuery>) {
    await requireLivePermission(tx, actor, 'platform.admin');
    const cursor = q.beforeTime ? ' AND (created_at<? OR (created_at=? AND id<?))' : '';
    const rows = (await tx.execute({ sql: 'SELECT * FROM moderation_events WHERE module=? AND content_id=?' + cursor + ' ORDER BY created_at DESC,id DESC LIMIT 50', args: [q.module, q.id, ...(q.beforeTime ? [q.beforeTime, q.beforeTime, q.beforeId!] : [])] })).rows;
    return { items: rows.map(r => ({ id: String(r.id), from: String(r.from_status), to: r.to_status as ModerationStatus, note: String(r.note), actorId: r.actor_id ? String(r.actor_id) : null, createdAt: String(r.created_at) })) };
}
