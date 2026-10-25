import type { Transaction } from '@libsql/client';
import type { AppStoreState } from './domain';
import type { Booking } from '../src/types/index';

export async function enqueueBookingNotification(tx: Transaction, state: AppStoreState, booking: Booking) {
  const subject = `YEREVANHUB · ${booking.trackingCode} · ${booking.status}`;
  const path = `/#/booking/${booking.privateToken}`;
  const base = process.env.APP_URL && /^https:\/\//.test(process.env.APP_URL) ? process.env.APP_URL.replace(/\/$/, '') : '';
  const text = `${subject}\n${booking.checkIn} → ${booking.checkOut}\n${booking.finalAmountAMD} AMD\n${base ? base + path : booking.trackingCode}`;
  const recipients = new Set<string>();
  if (booking.contactType === 'email') recipients.add(booking.guestContact);
  const hostel = state.hostels.find(item => item.id === booking.hostelId);
  if (hostel?.email && hostel.verification?.status === 'verified') recipients.add(hostel.email);
  for (const user of state.users) if (user.isActive && (user.role === 'admin' || (user.role === 'hostel_manager' && user.assignedHostelIds?.includes(booking.hostelId)))) recipients.add(user.email);
  for (const recipient of recipients) await tx.execute({ sql: 'INSERT INTO outbox(id,channel,recipient,subject,text,created_at) VALUES(?,?,?,?,?,?)', args: [crypto.randomUUID(), 'email', recipient, subject, text, Date.now()] });
  if (process.env.TELEGRAM_CHAT_ID) await tx.execute({ sql: 'INSERT INTO outbox(id,channel,recipient,subject,text,created_at) VALUES(?,?,?,?,?,?)', args: [crypto.randomUUID(), 'telegram', process.env.TELEGRAM_CHAT_ID, subject, `${subject}\n${booking.hostelName}`, Date.now()] });
}

// Durable outbox: no external network calls while the booking transaction holds a lock.
// The worker is explicitly invoked by an authorized admin or an authenticated scheduler.
export async function deliverNotifications(database: import('./database').Database, send: typeof fetch = fetch) {
  const claimed = await database.transaction(async (_state, tx) => {
    const channels = [process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM ? 'email' : '', process.env.TELEGRAM_BOT_TOKEN ? 'telegram' : ''].filter(Boolean);
    if (!channels.length) return [];
    const rows = await tx.execute({ sql: `SELECT * FROM outbox WHERE channel IN (${channels.map(() => '?').join(',')}) AND status IN ('pending','retry','sending') AND next_attempt <= ? AND attempts < 5 ORDER BY created_at LIMIT 2`, args: [...channels, Date.now()] });
    const configured = rows.rows;
    for (const row of configured) await tx.execute({ sql: "UPDATE outbox SET status='sending', attempts=attempts+1, next_attempt=? WHERE id=?", args: [Date.now() + 5 * 60_000, String(row.id)] });
    return configured;
  });
  let sent = 0;
  await Promise.all(claimed.map(async row => {
    let delivered = false;
    try {
      const response = row.channel === 'email'
        ? await send('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Idempotency-Key': String(row.id) }, body: JSON.stringify({ from: process.env.NOTIFICATION_FROM, to: [row.recipient], subject: row.subject, text: row.text }) })
        : await send(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: row.recipient, text: row.text }) });
      delivered = response.ok && (row.channel === 'email' || (await response.json() as { ok?: boolean }).ok === true);
    } catch { /* Record a generic failure; never store provider responses or credentials. */ }
    await database.transaction(async (_state, tx) => {
      await tx.execute({ sql: 'UPDATE outbox SET status=?, next_attempt=?, last_error=? WHERE id=?', args: [delivered ? 'sent' : Number(row.attempts) + 1 >= 5 ? 'failed' : 'retry', Date.now() + 60_000 * 2 ** Number(row.attempts), delivered ? null : 'Delivery failed; check provider configuration', String(row.id)] });
    });
    if (delivered) sent++;
  }));
  return { attempted: claimed.length, sent };
}
