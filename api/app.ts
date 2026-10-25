import { createApi } from '../server/api.js';
import { readOnlyPreview } from '../server/preview.js';
import { Database } from '../server/database.js';
import type { Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
let handler: ReturnType<typeof createApi> | undefined;
function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}
export default function endpoint(req: IncomingMessage, res: ServerResponse) {
  if (!process.env.DATABASE_URL) {
    if (req.method === 'GET') { json(res, 200, { state: readOnlyPreview() }); return; }
    json(res, 503, { success: false, error: 'این نسخه فقط برای مشاهده است؛ ثبت رزرو و ورود هنوز فعال نشده‌اند.' }); return;
  }
  try { handler ??= createApi(new Database()); handler(req as Request, res as Response); }
  catch { json(res, 503, { success: false, error: 'سرویس رزرو در دسترس نیست. کمی بعد دوباره تلاش کنید.' }); }
}
