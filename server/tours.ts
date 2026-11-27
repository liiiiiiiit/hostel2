import {syncModeration,moderationVisible} from './moderation-storage.js';
import {can} from '../src/utils/authorization.js';
import { requireProvider } from './provider-accounts.js';
import type { Transaction } from '@libsql/client';
import { z } from 'zod';
import type { Tour, User } from '../src/types/index.js';

export const tourTable = `CREATE TABLE IF NOT EXISTS tour_listings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, organizer TEXT NOT NULL,
  destination TEXT NOT NULL, departure TEXT NOT NULL, schedule TEXT NOT NULL, duration TEXT NOT NULL,
  description TEXT NOT NULL, contact TEXT NOT NULL, price INTEGER CHECK(price >= 0),
  published INTEGER NOT NULL CHECK(published IN (0,1)), hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
)`;
const field = (max: number) => z.string().trim().min(1).max(max);
export const tourInput = z.object({
  id: z.uuid(), version: z.number().int().nonnegative(), title: field(140), organizer: field(140),
  destination: field(200), departure: field(200), schedule: field(200), duration: field(100),
  description: field(4000), contact: field(250), price: z.number().int().min(0).max(1_000_000_000).nullable(),
  published: z.boolean(), hidden: z.boolean(), approved:z.boolean().optional(), capacity:z.number().int().min(1).max(100000).optional(),
});

export async function saveTour(tx: Transaction, actor: User | null, tour: z.infer<typeof tourInput>) {
  actor=await requireProvider(tx,actor,'tour_provider');
  if (!actor) throw new Error('دسترسی مجاز نیست.');
  const admin = Number(actor.role === 'admin');
  const values = [tour.title, tour.organizer, tour.destination, tour.departure, tour.schedule, tour.duration,
    tour.description, tour.contact, tour.price, Number(tour.published)];
  const previous = tour.version > 0 ? (await tx.execute({
    sql: 'SELECT capacity FROM tour_listings WHERE id=? AND version=? AND (owner_id=? OR ?=1)',
    args: [tour.id,tour.version,actor.id,admin],
  })).rows[0] : undefined;
  if(tour.version > 0 && !previous)throw new Error('اطلاعات واردشده معتبر نیست.');
  // Old clients omit this additive field. Preserve the stored limit on edits.
  const capacity=tour.capacity??Number(previous?.capacity??100000);
  if((await tx.execute({sql:"SELECT 1 FROM tour_bookings WHERE tour_id=? AND status IN ('pending','confirmed') GROUP BY travel_date HAVING SUM(guests)>? LIMIT 1",args:[tour.id,capacity]})).rows.length)throw new Error('ظرفیت کمتر از تعداد رزروهای فعلی است.');
  const result = tour.version === 0
    ? await tx.execute({
      sql: `INSERT INTO tour_listings(title,organizer,destination,departure,schedule,duration,description,contact,price,published,hidden,approved,capacity,id,owner_id,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
      args: [...values, admin && Number(tour.hidden), Number(!!admin&&tour.approved!==false),capacity,tour.id, actor.id, new Date().toISOString()],
    })
    : await tx.execute({
      sql: `UPDATE tour_listings SET title=?,organizer=?,destination=?,departure=?,schedule=?,duration=?,description=?,contact=?,price=?,published=?,
            hidden=CASE WHEN ?=1 THEN ? ELSE hidden END,approved=?,capacity=?,version=version+1 WHERE id=? AND version=? AND (owner_id=? OR ?=1)`,
      args: [...values, admin, Number(tour.hidden), Number(!!admin&&tour.approved!==false),capacity,tour.id, tour.version, actor.id, admin],
    });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
  await syncModeration(tx,'tour',tour.id,actor,{...tour,approved:!!admin&&tour.approved!==false,hidden:!!admin&&tour.hidden});
}

export async function deleteTour(tx: Transaction, actor: User | null, id: string, version: number) {
  actor=await requireProvider(tx,actor,'tour_provider');
  const result = await tx.execute({ sql: 'DELETE FROM tour_listings WHERE id=? AND version=? AND (owner_id=? OR ?=1) AND NOT EXISTS(SELECT 1 FROM tour_bookings WHERE tour_id=?)', args: [id, version,actor!.id,Number(actor!.role==='admin'),id] });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function readTours(tx: Transaction, actor: User | null): Promise<Tour[]> {
  const id = can(actor,'tours.manage')?actor!.id:'';
  const admin = Number(can(actor,'platform.admin'));
  const { rows } = await tx.execute({
    sql: `SELECT id,title,organizer,destination,departure,schedule,duration,description,contact,price,published,hidden,version,approved,capacity,
      (SELECT status FROM content_moderation cm WHERE cm.module='tour' AND cm.content_id=tour_listings.id) AS moderation_status,
      (SELECT note FROM moderation_events me WHERE me.module='tour' AND me.content_id=tour_listings.id AND me.note!='content_saved' AND me.to_status=(SELECT status FROM content_moderation cm WHERE cm.module='tour' AND cm.content_id=tour_listings.id) ORDER BY created_at DESC,id DESC LIMIT 1) AS feedback,
      owner_id=? AS owned FROM tour_listings
      WHERE (${moderationVisible('tour','tour_listings.id')} AND published=1 AND hidden=0 AND approved=1 AND owner_id IN (SELECT id FROM users WHERE is_active=1)) OR owner_id=? OR ?=1 ORDER BY created_at DESC,id`,
    args: [id, id, admin],
  });
  return rows.map(row => ({
    ...(row.owned||admin?{moderationStatus:row.moderation_status as Tour['moderationStatus'],moderationFeedback:String(row.feedback??'')}:{}),
    id: String(row.id), title: String(row.title), organizer: String(row.organizer), destination: String(row.destination),
    departure: String(row.departure), schedule: String(row.schedule), duration: String(row.duration),
    description: String(row.description), contact: String(row.contact), price: row.price === null ? null : Number(row.price),
    published: Boolean(row.published), hidden: Boolean(row.hidden), owned: Boolean(row.owned), version: Number(row.version), approved:Boolean(row.approved), capacity:Number(row.capacity),
  }));
}
