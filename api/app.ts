import {renderPublicHtml,sitemap,robots} from '../server/public-pages.js';
import {readFile} from 'node:fs/promises';
import { createApi } from '../server/api.js';
import { readOnlyPreview } from '../server/preview.js';
import { Database } from '../server/database.js';
import type { Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
let database:Database|undefined;
let handler: ReturnType<typeof createApi> | undefined;
function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}
export default async function endpoint(req: IncomingMessage, res: ServerResponse) {
  const incoming=new URL(req.url??'/','https://local.invalid');const rewritten=(req as IncomingMessage&{query?:Record<string,unknown>}).query?.publicPath;const publicPath=incoming.searchParams.get('publicPath')??(typeof rewritten==='string'?rewritten:null)??(/^\/(fa|en|ru|hy)(\/|$)/.test(incoming.pathname)||['/sitemap.xml','/robots.txt'].includes(incoming.pathname)?incoming.pathname+incoming.search:null);
  if(publicPath){try{const base=(process.env.APP_URL||'https://'+req.headers.host).replace(/\/$/,'');if(publicPath==='/robots.txt'){res.setHeader('Content-Type','text/plain');res.end(robots(base));return;}const state=process.env.DATABASE_URL?await(database??=new Database()).publicState():readOnlyPreview();if(publicPath==='/sitemap.xml'){res.setHeader('Content-Type','application/xml');res.end(sitemap(state,base));return;}const page=renderPublicHtml(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),state,publicPath,base);res.statusCode=page.status;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');res.end(page.html);return;}catch{json(res,503,{error:'YEREVANHUB unavailable'});return;}}
  if (!process.env.DATABASE_URL) {
    if (req.method === 'GET') { json(res, 200, { state: readOnlyPreview() }); return; }
    json(res, 503, { success: false, error: 'این نسخه فقط برای مشاهده است؛ ثبت رزرو و ورود هنوز فعال نشده‌اند.' }); return;
  }
  try { handler ??= createApi(database??=new Database()); handler(req as Request, res as Response); }
  catch { json(res, 503, { success: false, error: 'سرویس رزرو در دسترس نیست. کمی بعد دوباره تلاش کنید.' }); }
}
