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
  published: z.boolean(), hidden: z.boolean(),
});

export async function saveTour(tx: Transaction, actor: User | null, tour: z.infer<typeof tourInput>) {
  if (!actor) throw new Error('دسترسی مجاز نیست.');
  const admin = Number(actor.role === 'admin');
  const values = [tour.title, tour.organizer, tour.destination, tour.departure, tour.schedule, tour.duration,
    tour.description, tour.contact, tour.price, Number(tour.published)];
  const result = tour.version === 0
    ? await tx.execute({
      sql: `INSERT INTO tour_listings(title,organizer,destination,departure,schedule,duration,description,contact,price,published,hidden,id,owner_id,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
      args: [...values, admin && Number(tour.hidden), tour.id, actor.id, new Date().toISOString()],
    })
    : await tx.execute({
      sql: `UPDATE tour_listings SET title=?,organizer=?,destination=?,departure=?,schedule=?,duration=?,description=?,contact=?,price=?,published=?,
            hidden=CASE WHEN ?=1 THEN ? ELSE hidden END,version=version+1 WHERE id=? AND version=? AND (owner_id=? OR ?=1)`,
      args: [...values, admin, Number(tour.hidden), tour.id, tour.version, actor.id, admin],
    });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function deleteTour(tx: Transaction, actor: User | null, id: string, version: number) {
  if (actor?.role !== 'admin') throw new Error('دسترسی مجاز نیست.');
  const result = await tx.execute({ sql: 'DELETE FROM tour_listings WHERE id=? AND version=?', args: [id, version] });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function readTours(tx: Transaction, actor: User | null): Promise<Tour[]> {
  const id = actor?.id ?? '';
  const admin = Number(actor?.role === 'admin');
  const { rows } = await tx.execute({
    sql: `SELECT id,title,organizer,destination,departure,schedule,duration,description,contact,price,published,hidden,version,
      owner_id=? AS owned FROM tour_listings
      WHERE (published=1 AND hidden=0) OR owner_id=? OR ?=1 ORDER BY created_at DESC,id`,
    args: [id, id, admin],
  });
  return rows.map(row => ({
    id: String(row.id), title: String(row.title), organizer: String(row.organizer), destination: String(row.destination),
    departure: String(row.departure), schedule: String(row.schedule), duration: String(row.duration),
    description: String(row.description), contact: String(row.contact), price: row.price === null ? null : Number(row.price),
    published: Boolean(row.published), hidden: Boolean(row.hidden), owned: Boolean(row.owned), version: Number(row.version),
  }));
}
