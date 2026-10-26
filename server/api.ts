import express from 'express';
import { localizeError } from './locale.js';
import { optimizeImage, storeImage, deleteStoredImage, readStoredImage, MAX_IMAGE_BYTES } from './media.js';
import { hostelSchema, rentalSchema } from './property-schemas.js';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Database } from './database.js';
import { Store } from './domain.js';
import { verifyPassword } from './passwords.js';
import { publicState } from './public-state.js';
import { enqueueBookingNotification, deliverNotifications } from './notifications.js';
import type { ActionResult, User } from '../src/types/index.js';
import { addCalendarDays, yerevanToday } from '../src/utils/dates.js';
import { calculateNights } from '../src/utils/pricing.js';

const text = z.string().trim().min(1).max(500);
const optionalText = z.string().max(5000).optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const positive = z.number().int().min(1).max(100);
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
const status = z.enum(['pending','confirmed','rejected','cancelled','expired','completed','no_show']);
const scores = z.object({ cleanliness: z.number().int().min(1).max(5), safety: z.number().int().min(1).max(5), staff: z.number().int().min(1).max(5), location: z.number().int().min(1).max(5) });
const localized = z.object({ fa: z.string(), en: z.string(), ru: z.string(), hy: z.string() });
const entity = z.object({ id: text }).passthrough();
const coordinates = z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) });

const schemas = {
  login: z.tuple([email, password]), logout: z.tuple([]),
  registerTraveler: z.tuple([text, email, optionalText.nullable(), password]),
  createBooking: z.tuple([z.object({ acceptedTerms:z.literal(true), expectedHostelUpdatedAt:z.string().min(1).max(100), idempotencyKey:z.uuid(), language:z.enum(['fa','en','ru','hy']).optional(), hostelId: text, roomTypeId: text, guestName: text, contactType: z.enum(['phone','email']), guestContact: text, checkIn: date, checkOut: date, guestsCount: positive, quantity: positive, estimatedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), specialRequests: optionalText, isLowerBunkRequested: z.boolean().optional(), isImmediateArrival: z.boolean().optional(), couponCode: optionalText }).refine(value => calculateNights(value.checkIn, value.checkOut) >= 1 && calculateNights(value.checkIn, value.checkOut) <= 90 && value.checkIn >= yerevanToday() && value.checkOut <= addCalendarDays(yerevanToday(),89), 'Invalid stay dates').refine(value => value.contactType !== 'email' || z.email().safeParse(value.guestContact).success, 'Invalid contact')]),
  updateBookingStatus: z.tuple([text, status, optionalText]),
  cancelBookingByGuest: z.tuple([text, z.string().max(1000)]), reportEntranceIssue: z.tuple([text, z.string().max(2000)]),
  submitReview: z.tuple([text, z.number().int().min(1).max(5), z.string().trim().min(1).max(3000), scores.optional()]),
  createRentalInquiry: z.tuple([z.object({ propertyId: text, guestName: text, contact: text, requestType: z.enum(['rent','visit']), desiredStartDate: date.optional(), desiredDurationText: optionalText, proposedVisitDate: optionalText, residentsCount: positive, notes: optionalText })]),
  setCapacity: z.tuple([text, text, date, z.number().int().min(0).max(100)]),
  setVerification: z.tuple([z.enum(['hostel','rental']), text, z.boolean(), z.string().max(1000)]),
  checkCoupon: z.tuple([text, z.number().min(0)]),
  saveHostel: z.tuple([hostelSchema]), saveRental: z.tuple([rentalSchema]), setHostelStatus: z.tuple([text, z.enum(['draft','published','hidden','archived'])]), setRentalStatus: z.tuple([text, z.enum(['draft','published','hidden','archived'])]), toggleHostelPublished: z.tuple([text]), toggleRentalAvailability: z.tuple([text]),
  createHostelManager: z.tuple([z.object({ name: text, email, initialPassword: password, phone: optionalText, assignedHostelIds: z.array(text).min(1) })]),
  toggleManagerActive: z.tuple([text]),
  addCoupon: z.tuple([z.object({ code: text, percent: z.number().min(0).max(100), minAmountAMD: z.number().min(0), maxUses: z.number().int().min(0), usedCount: z.literal(0), active: z.boolean(), startsAt: text, expiresAt: text, description: z.string().max(1000) })]),
  toggleCoupon: z.tuple([text]), deleteCoupon: z.tuple([text]),
  moderateReview: z.tuple([text, z.enum(['approved','rejected']), optionalText]),
  updateRentalInquiryStatus: z.tuple([text, z.enum(['pending_review','coordinating','proposed_terms','agreed','rejected','cancelled','completed']), optionalText]),
  saveArticle: z.tuple([entity.extend({ title: text, slug: text, content: z.string().max(100000), tags: z.array(z.string()), sources: z.array(z.string()), status: z.enum(['draft','published']) }).passthrough()]),
  deleteArticle: z.tuple([text]), notificationStatus: z.tuple([]), sendNotifications: z.tuple([]),
  updateHostelLocation: z.tuple([text, coordinates.extend({ verified: z.boolean(), note: z.string().trim().max(1000).optional() })]),
  updateArrivalGuide: z.tuple([text, z.object({ addressArmenianForTaxi: z.string().max(1000), directionsFa: z.string().max(5000), directionsHy: z.string().max(5000), entrancePhoto: z.union([z.literal(''),z.string().url()]), floorAndDoorCode: z.string().max(500), phone: z.string().max(100) })]),
};
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const parseCookies = (value = '') => Object.fromEntries(value.split(';').filter(part => part.includes('=')).map(part => { const split = part.indexOf('='); return [part.slice(0, split).trim(), part.slice(split + 1)]; }));

export function createApi(database: Database) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL) app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb' }));
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookieName = production ? '__Host-yh_session' : 'yh_session';
  app.use(['/api','/api/app'], (_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); next(); });
  const paths = ['/api', '/api/app'];
  const session = async (req: express.Request, state: import('./domain.js').AppStoreState, tx: import('@libsql/client').Transaction): Promise<User | null> => {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (!token) return null;
    const result = await tx.execute({ sql: 'SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?', args: [digest(token), Date.now()] });
    return state.users.find(user => user.id === result.rows[0]?.user_id && user.isActive) ?? null;
  };
  app.get(paths, async (req, res, next) => {
    if (!req.query.media) { next(); return; }
    if (typeof req.query.media !== 'string' || !/^[a-f0-9-]{36}$/.test(req.query.media)) { res.sendStatus(404); return; }
    try {
      const asset = await database.transaction(async (_state, tx) => (await tx.execute({ sql:'SELECT * FROM media_assets WHERE id=?', args:[String(req.query.media)] })).rows[0]);
      if (!asset || asset.backend !== 'local') { res.sendStatus(404); return; }
      res.type('webp').set('Cache-Control','public, max-age=86400').send(await readStoredImage(String(asset.storage_key)));
    } catch { res.sendStatus(404); }
  });
  app.post(paths, express.raw({ type:['image/jpeg','image/png','image/webp'], limit:MAX_IMAGE_BYTES }), async (req, res, next) => {
    if (!req.query.upload && !req.query.deleteMedia) { next(); return; }
    try {
      if (req.headers['x-requested-with'] !== 'YerevanHub' || req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { res.sendStatus(403); return; }
      const actor = await database.transaction(async(state,tx) => {
        const user = await session(req,state,tx);
        if (user?.role !== 'admin') throw new Error('دسترسی مجاز نیست.');
        const bucket = `media:${user.id}:${Math.floor(Date.now()/60000)}`;
        await tx.execute({sql:'INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',args:[bucket,Date.now()+60000]});
        const rate = await tx.execute({sql:'SELECT count FROM rate_limits WHERE key=?',args:[bucket]});
        if (Number(rate.rows[0].count) > 30) throw new Error('تعداد درخواست زیاد است؛ یک دقیقه صبر کنید.');
        return user;
      });
      if (req.query.deleteMedia) {
        const id = z.uuid().parse(req.query.deleteMedia);
        await database.transaction(async(state,tx) => {
          if ((await session(req,state,tx))?.role !== 'admin') throw new Error('دسترسی مجاز نیست.');
          if ([...state.hostels,...state.rentals].some(item=>item.media?.some(image=>image.id===id))) throw new Error('ابتدا تصویر را از ملک جدا و تغییرات را ذخیره کنید.');
          const asset = (await tx.execute({sql:'SELECT * FROM media_assets WHERE id=?',args:[id]})).rows[0];
          if (asset) {
            await deleteStoredImage({backend:String(asset.backend),storage_key:String(asset.storage_key)});
            await tx.execute({sql:'DELETE FROM media_assets WHERE id=?',args:[id]});
          }
        });
        res.json({success:true}); return;
      }
      if (!Buffer.isBuffer(req.body)) throw new Error('فایل تصویر معتبر ارسال کنید.');
      const bytes = await optimizeImage(req.body,String(req.headers['content-type']).split(';')[0]);
      const id = crypto.randomUUID();
      const stored = await storeImage(id,bytes);
      try {
        await database.transaction(async(state,tx)=> {
          if ((await session(req,state,tx))?.role !== 'admin') throw new Error('دسترسی مجاز نیست.');
          await tx.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,stored.url,stored.key,stored.backend,bytes.length,actor.id,new Date().toISOString()]});
        });
      } catch(error) { await deleteStoredImage({backend:stored.backend,storage_key:stored.key}); throw error; }
      res.json({success:true,image:{id,url:stored.url,alt:{fa:'',en:'',ru:'',hy:''}}});
    } catch(error) { next(error); }
  });
  app.get(paths, async (req, res, next) => {
    try {
      if (req.query.worker === 'notifications') {
        if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.status(401).json({ error: 'Unauthorized' }); return; }
        res.json(await deliverNotifications(database)); return;
      }
      const data = await database.transaction(async (state, tx) => {
        const actor = await session(req, state, tx);
        const store = new Store(state, true); store.getState().currentUser = actor;
        const before = new Map(state.bookings.map(b => [b.id, b.status]));
        store.expirePendingBookings(); Object.assign(state, store.getState());
        for (const booking of state.bookings) if (before.get(booking.id) !== booking.status) await enqueueBookingNotification(tx, state, booking);
        return publicState(state, actor, database.demo, String(req.headers['x-booking-token'] ?? ''), String(req.headers['x-inquiry-token'] ?? ''));
      });
      res.json({ state: data });
    } catch (error) { next(error); }
  });
  app.post(paths, async (req, res, next) => {
    try {
      const origin = req.headers.origin;
      if (req.headers['x-requested-with'] !== 'YerevanHub' || (origin && new URL(origin).host !== req.headers.host)) { res.status(403).json({ success: false, error: 'Origin not allowed' }); return; }
      const envelope = z.object({ action: z.enum(Object.keys(schemas) as [keyof typeof schemas, ...Array<keyof typeof schemas>]), args: z.array(z.unknown()) }).parse(req.body);
      const args = schemas[envelope.action].parse(envelope.args) as unknown[];
      const result = await database.transaction(async (state, tx) => {
        const now = Date.now();
        const bucket = digest(`${req.ip ?? req.socket.remoteAddress ?? 'unknown'}:${envelope.action}`);
        await tx.execute({ sql: 'DELETE FROM rate_limits WHERE expires_at<?', args: [now] });
        await tx.execute({ sql: 'INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', args: [bucket, now + 60_000] });
        const rate = await tx.execute({ sql: 'SELECT count FROM rate_limits WHERE key=?', args: [bucket] });
        const max = ['login','registerTraveler'].includes(envelope.action) ? 10 : ['createBooking','createRentalInquiry'].includes(envelope.action) ? 5 : 60;
        if (Number(rate.rows[0].count) > max) return { success: false, error: 'تعداد درخواست زیاد است؛ یک دقیقه صبر کنید.', rateLimited: true };
        let actor = await session(req, state, tx);
        const store = new Store(state, true); store.getState().currentUser = actor;
        const before = new Map(state.bookings.map(b => [b.id, b.status]));
        store.expirePendingBookings();
        let actionResult: ActionResult = { success: true };
        if (envelope.action === 'login') {
          const [address, passwordValue] = args as [string, string];
          const user = state.users.find(user => user.email === address && user.isActive);
          // A dummy hash derivation makes nonexistent accounts take the same path.
          const credential = user && state.credentials[user.id];
          const valid = await verifyPassword(passwordValue, credential || { salt: 'unregistered-account', hash: '0'.repeat(64) });
          if (!user || !valid) actionResult = { success: false, error: 'ایمیل یا رمز عبور نادرست است.' };
          else { actor = user; store.getState().currentUser = user; actionResult = { success: true, user }; }
        } else if (envelope.action === 'logout') {
          actor = null; store.getState().currentUser = null;
          const token = parseCookies(req.headers.cookie)[cookieName];
          if (token) await tx.execute({ sql: 'DELETE FROM sessions WHERE token_hash=?', args: [digest(token)] });
          res.cookie(cookieName, '', { httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 0 });
        } else if (envelope.action === 'checkCoupon') {
          const { validateCoupon } = await import('../src/utils/pricing.js');
          const coupon = state.coupons.find(c => c.code.toUpperCase() === String(args[0]).trim().toUpperCase());
          const checked = validateCoupon(String(args[0]), Number(args[1]), coupon);
          actionResult = { success: checked.valid, error: checked.valid ? undefined : checked.message, coupon: checked.valid ? coupon : undefined };
        } else if (envelope.action === 'sendNotifications') {
          if (actor?.role !== 'admin') { res.status(403); return { success: false, error: 'دسترسی مجاز نیست.' }; }
          return { success: true, runWorker: true };
        } else if (envelope.action === 'notificationStatus') {
          if (actor?.role !== 'admin') { res.status(403); return { success: false, error: 'دسترسی مجاز نیست.' }; }
          const rows = await tx.execute('SELECT status, COUNT(*) AS count FROM outbox GROUP BY status');
          return { success: true, notifications: rows.rows, configured: { email: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM), telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) } };
        } else {
          if (envelope.action === 'submitReview') {
            const booking = store.getBookingByToken(String(args[0]));
            if (!booking || booking.checkOut > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yerevan' })) return { success: false, error: 'پس از پایان اقامت می‌توانید نظر بدهید.' };
          }
          // The schema allowlist is the only surface exposed to callers; no arbitrary method/state mutation.
          const method = store[envelope.action as keyof Store];
          if (typeof method !== 'function') throw new Error('Unsupported action');
          const returned = await (method as (...values: unknown[]) => unknown).apply(store, args);
          if (returned && typeof returned === 'object') actionResult = returned as ActionResult;
          if (envelope.action === 'registerTraveler' && actionResult.success) actor = actionResult.user ?? null;
        }
        if (['login','registerTraveler'].includes(envelope.action) && actionResult.success && actor) {
          const token = randomBytes(32).toString('hex');
          const previous = parseCookies(req.headers.cookie)[cookieName];
          if (previous) await tx.execute({ sql: 'DELETE FROM sessions WHERE token_hash=?', args: [digest(previous)] });
          await tx.execute({ sql: 'DELETE FROM sessions WHERE expires_at<?', args: [now] });
          await tx.execute({ sql: 'INSERT INTO sessions VALUES(?,?,?)', args: [digest(token), actor.id, now + 7 * 86400000] });
          res.cookie(cookieName, token, { httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 7 * 86400000 });
        }
        if(actionResult.error)actionResult.error=localizeError(actionResult.error,req.headers['x-app-language']);
        Object.assign(state, store.getState());
        if (envelope.action === 'toggleManagerActive') {
          const user = state.users.find(user => user.id === args[0]);
          if (user && !user.isActive) await tx.execute({ sql: 'DELETE FROM sessions WHERE user_id=?', args: [user.id] });
        }
        const changed = state.bookings.filter(booking => before.get(booking.id) !== booking.status);
        for (const booking of changed) await enqueueBookingNotification(tx, state, booking);
        const bookingToken = actionResult.booking?.privateToken ?? String(req.headers['x-booking-token'] ?? '');
        const inquiryToken = actionResult.inquiry?.privateToken ?? String(req.headers['x-inquiry-token'] ?? '');
        if (actionResult.booking) { const {requestFingerprint:_fingerprint,idempotencyKey:_key,...safe}=actionResult.booking; actionResult={...actionResult,booking:safe}; }
        return { ...actionResult, dispatch: changed.length > 0 && !database.demo, state: publicState(state, actor, database.demo, bookingToken, inquiryToken) };
      });
      if ('runWorker' in result) { res.json({ success: true, ...await deliverNotifications(database) }); return; }
      if ('dispatch' in result && result.dispatch) {
        // Failure to deliver never rolls back an accepted booking; retries remain in the durable outbox.
        try { await deliverNotifications(database); } catch { /* Scheduler/admin can retry. */ }
      }
      res.status('rateLimited' in result ? 429 : res.statusCode).json(result);
    } catch (error) { next(error); }
  });
  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') { res.status(413).json({success:false,error:localizeError('حجم فایل بیش از حد مجاز است.',req.headers['x-app-language'])}); return; }
    if (error instanceof z.ZodError) { res.status(400).json({ success: false, error: localizeError('اطلاعات واردشده معتبر نیست.',req.headers['x-app-language']) }); return; }
    if (error instanceof Error && /[\u0600-\u06ff]/.test(error.message) && !error.message.includes('SQL')) { res.status(error.message === 'دسترسی مجاز نیست.' ? 403 : 400).json({ success: false, error: localizeError(error.message,req.headers['x-app-language']) }); return; }
    const forbidden = error instanceof Error && error.message === 'دسترسی مجاز نیست.';
    res.status(forbidden ? 403 : 500).json({ success: false, error: forbidden ? 'دسترسی مجاز نیست.' : 'سرویس در دسترس نیست. تنظیمات سرور را بررسی کنید.' });
  });
  return app;
}
