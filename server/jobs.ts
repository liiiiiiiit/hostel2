import { Store } from "./domain.js";
import type { Database } from "./database.js";
import {
  enqueueBookingNotification,
  deliverNotifications,
} from "./notifications.js";
import { deleteStoredImage } from "./media.js";
export async function scheduledWork(
  database: Database,
  {
    deliver = true,
    now = Date.now(),
  }: { deliver?: boolean; now?: number } = {},
) {
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
    const serialized = JSON.stringify(state);
    let removed = 0;
    for (const asset of (
      await tx.execute({
        sql: "SELECT * FROM media_assets WHERE created_at<?",
        args: [new Date(now - 86400000).toISOString()],
      })
    ).rows) {
      if (serialized.includes(String(asset.url))) continue;
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
    return { reminders, expired, removed };
  });
  return {
    ...counts,
    ...(deliver
      ? await deliverNotifications(database)
      : { attempted: 0, sent: 0 }),
  };
}
