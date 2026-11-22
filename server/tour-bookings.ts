import { requireProvider } from './provider-accounts.js';
import type { Transaction } from '@libsql/client';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { TourBooking, User } from '../src/types/index.js';
import { isTourPhone } from '../src/utils/tour-contact.js';
import { yerevanToday } from '../src/utils/dates.js';

export const tourBookingTable = `CREATE TABLE IF NOT EXISTS tour_bookings (
  reference TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
  tour_id TEXT NOT NULL, title TEXT NOT NULL, organizer TEXT NOT NULL, price INTEGER,
  name TEXT NOT NULL, contact TEXT NOT NULL, travel_date TEXT NOT NULL, guests INTEGER NOT NULL CHECK(guests>=1),
  notes TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled'))
)`;
export const bookingInput = z.object({
  requestId: z.uuid(), tourId: z.uuid(), tourVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  contact: z.string().trim().max(250).refine(v => z.email().safeParse(v).success || isTourPhone(v)),
  travelDate: z.iso.date(), guests: z.number().int().min(1).max(100), notes: z.string().trim().max(1500),
});
export const tourBookingStatus = z.enum(['pending','confirmed','cancelled']);
export async function bookTour(tx: Transaction, input: z.infer<typeof bookingInput>) {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = (await tx.execute({sql:'SELECT reference,fingerprint FROM tour_bookings WHERE request_id=?',args:[input.requestId]})).rows[0];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error('اطلاعات واردشده معتبر نیست.');
    return String(previous.reference);
  }
  if (input.travelDate < yerevanToday()) throw new Error('اطلاعات واردشده معتبر نیست.');
  const reference = randomUUID();
  const result = await tx.execute({
    sql: `INSERT INTO tour_bookings(reference,request_id,fingerprint,name,contact,travel_date,guests,notes,created_at,status,tour_id,title,organizer,price)
          SELECT ?,?,?,?,?,?,?,?,?,'pending',id,title,organizer,price FROM tour_listings
          WHERE id=? AND version=? AND published=1 AND hidden=0 AND approved=1 AND owner_id IN (SELECT id FROM users WHERE is_active=1) AND capacity >= ? + (SELECT COALESCE(SUM(guests),0) FROM tour_bookings WHERE tour_id=? AND travel_date=? AND status IN ('pending','confirmed'))`,
    args:[reference,input.requestId,fingerprint,input.name,input.contact,input.travelDate,input.guests,input.notes,new Date().toISOString(),input.tourId,input.tourVersion,input.guests,input.tourId,input.travelDate],
  });
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
  return reference;
}

export async function trackTour(tx: Transaction, reference: string) {
  const row = (await tx.execute({sql:'SELECT status FROM tour_bookings WHERE reference=?',args:[reference]})).rows[0];
  if (!row) throw new Error('اطلاعات واردشده معتبر نیست.');
  return tourBookingStatus.parse(row.status);
}

export async function changeTourBooking(tx: Transaction, actor: User | null, reference: string, previous: TourBooking['status'], next: TourBooking['status']) {
  await requireProvider(tx,actor,'tour_provider');
  if(next!=='cancelled'&&(await tx.execute({sql:"SELECT 1 FROM tour_bookings b JOIN tour_listings t ON b.tour_id=t.id WHERE b.reference=? AND t.capacity < b.guests + (SELECT COALESCE(SUM(guests),0) FROM tour_bookings o WHERE o.tour_id=b.tour_id AND o.travel_date=b.travel_date AND o.reference<>b.reference AND o.status IN ('pending','confirmed'))",args:[reference]})).rows.length)throw new Error('ظرفیت کافی نیست.');
  const result = await tx.execute({sql:'UPDATE tour_bookings SET status=? WHERE reference=? AND status=? AND tour_id IN (SELECT id FROM tour_listings WHERE owner_id=? OR ?=1)',args:[next,reference,previous,actor!.id,Number(actor!.role==='admin')]});
  if (!result.rowsAffected) throw new Error('اطلاعات واردشده معتبر نیست.');
}

export async function adminTourBookings(tx: Transaction, actor: User | null): Promise<TourBooking[]> {
  if (!actor||actor.role==='job_provider') return [];
  const {rows} = await tx.execute({sql:'SELECT reference,status,tour_id,title,organizer,price,name,contact,travel_date,guests,notes,created_at FROM tour_bookings WHERE tour_id IN (SELECT id FROM tour_listings WHERE owner_id=? OR ?=1) ORDER BY created_at DESC,reference',args:[actor.id,Number(actor.role==='admin')]});
  return rows.map(row => ({
    reference:String(row.reference),status:tourBookingStatus.parse(row.status),tourId:String(row.tour_id),title:String(row.title),
    organizer:String(row.organizer),price:row.price===null?null:Number(row.price),name:String(row.name),contact:String(row.contact),
    travelDate:String(row.travel_date),guests:Number(row.guests),notes:String(row.notes),createdAt:String(row.created_at),
  }));
}
