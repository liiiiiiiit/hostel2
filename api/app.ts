import { createApi } from '../server/api';
import { readOnlyPreview } from '../server/preview';
import { Database } from '../server/database';
import type { Request, Response } from 'express';
let handler: ReturnType<typeof createApi> | undefined;
export default function endpoint(req: Request, res: Response) {
  if (!process.env.DATABASE_URL) {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (req.method === 'GET') { res.json({ state: readOnlyPreview() }); return; }
    res.status(503).json({ success: false, error: 'این نسخه فقط برای مشاهده است؛ ثبت رزرو و ورود هنوز فعال نشده‌اند.' }); return;
  }
  try { handler ??= createApi(new Database()); handler(req, res); }
  catch { res.status(503).json({ success: false, error: 'سرویس رزرو در دسترس نیست. کمی بعد دوباره تلاش کنید.' }); }
}
