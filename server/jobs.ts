import { Store } from "./domain.js";
import type { Database } from "./database.js";
import {
  enqueueBookingNotification,
  deliverNotifications,
} from "./notifications.js";
import { imageIsReferenced } from './repository.js';
import { tables } from './relational-schema.js';
import { none, where } from './relational-store.js';
import { deleteStoredImage } from "./media.js";
export async function scheduledWork(
  database: Database,
  {
    deliver = true,
    now = Date.now(),
  }: { deliver?: boolean; now?: number } = {},
) {
  const due=where("id IN (SELECT id FROM bookings WHERE (status='expired' AND escalated_at IS NULL) OR (status='pending' AND (expires_at<=? OR (reminder_at IS NULL AND julianday(?) >= (julianday(created_at)+julianday(expires_at))/2))) ORDER BY expires_at LIMIT 200)",new Date(now).toISOString(),new Date(now).toISOString());
  const hosts=where(`kind='hostel' AND id IN (SELECT hostel_id FROM bookings WHERE ${due.sql})`,...(due.args??[]));
  const counts = await database.transaction(async (state, tx) => {
    const store = new Store(state, true);
    let reminders = 0,
      expired = 0;
    const previous = new Map(state.bookings.map((b) => [b.id, b.status]));
    store.expirePendingBookings(now);
    Object.assign(state, store.getState());
    for (const booking of state.bookings) {
      if (booking.status === "expired" && !booking.escalatedAt) {
        booking.escalatedAt = new Date(now).toISOString();
        await enqueueBookingNotification(tx, state, booking, "escalation");
        expired++;
      } else if (
        booking.status === "pending" &&
        !booking.reminderAt &&
        now >=
          Date.parse(booking.createdAt) +
            (Date.parse(booking.expiresAt) - Date.parse(booking.createdAt)) / 2
      ) {
        booking.reminderAt = new Date(now).toISOString();
        await enqueueBookingNotification(tx, state, booking, "reminder");
        reminders++;
      }
    }
    let removed = 0;
    for (const asset of (
      await tx.execute({
        sql: "SELECT * FROM media_assets WHERE created_at<?",
        args: [new Date(now - 86400000).toISOString()],
      })
    ).rows) {
      if (await imageIsReferenced(tx,String(asset.url))) continue;
      await deleteStoredImage({
        backend: String(asset.backend),
        storage_key: String(asset.storage_key),
      });
      await tx.execute({
        sql: "DELETE FROM media_assets WHERE id=?",
        args: [String(asset.id)],
      });
      removed++;if(removed>=2)break;
    }
    await tx.execute({
      sql: "DELETE FROM auth_tokens WHERE expires_at<?",
      args: [now - 7 * 86400000],
    });
    await tx.execute({sql:'DELETE FROM sessions WHERE expires_at<?',args:[now]});
    await tx.execute({sql:'DELETE FROM rate_limits WHERE expires_at<?',args:[now]});
    return { reminders, expired, removed };
  },{scope:{...Object.fromEntries(tables.map(table=>[table.table,none])),
    app_settings:{sql:'1'},coupons:{sql:'1'},
    bookings:due,properties:hosts,
    users:where(`role='admin' OR id IN (SELECT user_id FROM manager_properties WHERE hostel_id IN (SELECT id FROM properties WHERE ${hosts.sql})) OR id IN (SELECT traveler_user_id FROM bookings WHERE ${due.sql})`,...(hosts.args??[]),...(due.args??[])),
  }});
  return {
    ...counts,
    ...(deliver
      ? await deliverNotifications(database)
      : { attempted: 0, sent: 0 }),
  };
}
