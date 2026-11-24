import {assertRuntimeEnvironment,applicationEnvironment,environmentHtml} from './environment.js';
import { servicesForPage } from './service-pages.js';
import {previewSocketsDisabled} from './vite-preview.js';
import {renderPublicHtml,sitemap,robots} from './public-pages.js';
import {readFile} from 'node:fs/promises';
import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createApi } from './api.js';
import { Database } from './database.js';
assertRuntimeEnvironment();
const production = process.env.NODE_ENV === 'production';
const database = new Database({ demo: !production && process.env.DEMO_MODE !== 'false' });
try { await database.waitUntilReady(); }
catch (error) { await database.close().catch(() => {}); throw error; }
const app = express();
const server = createHttpServer(app);
app.use((_req,res,next)=>{res.set('X-App-Environment',applicationEnvironment());if(applicationEnvironment()==='staging'){res.set({'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"});}next();});
if(applicationEnvironment()==='staging'){app.get('/robots.txt',(_req,res)=>res.type('text').send('User-agent: *\nDisallow: /\n'));app.get('/sitemap.xml',(_req,res)=>res.sendStatus(404));}
app.use(createApi(database));
app.get(['/services','/services/:slug'],(req,res)=>res.redirect(302,'/fa'+req.originalUrl));
const publicData=()=>database.publicState();
const publicHandler=(template:(url:string)=>Promise<string>)=>async(req:express.Request,res:express.Response,next:express.NextFunction)=>{if(!/^\/(fa|en|ru|hy)(\/|$)/.test(req.path)&&!['/sitemap.xml','/robots.txt'].includes(req.path)){next();return;}try{const base=(process.env.APP_URL||req.protocol+'://'+req.get('host')).replace(/\/$/,'');if(req.path==='/robots.txt'){res.type('text').send(robots(base));return;}const state=await servicesForPage(database,await publicData(),req.originalUrl);if(req.path==='/sitemap.xml'){res.type('xml').send(sitemap(state,base));return;}const page=renderPublicHtml(await template(req.originalUrl),state,req.originalUrl,base);res.set({'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}).status(page.status).type('html').send(environmentHtml(page.html));}catch{res.status(503).send('YEREVANHUB unavailable');}};
if (production || process.env.SERVE_BUILT_CLIENT === 'true') {
  app.use(express.static('dist',{index:applicationEnvironment()!=='staging'}));
  app.use(publicHandler(()=>readFile('dist/index.html','utf8')));
  app.get('*', async (_req,res,next)=>{if(applicationEnvironment()!=='staging'){res.sendFile(path.resolve('dist/index.html'));return;}try{res.type('html').send(environmentHtml(await readFile('dist/index.html','utf8')));}catch(e){next(e);}});
} else {
  const { createServer } = await import('vite');
  const disableSockets = previewSocketsDisabled();
  const vite = await createServer({ server: { middlewareMode: true, hmr: !disableSockets, ws: disableSockets ? false : { server }, forwardConsole: false }, appType: 'spa' });
  app.use(publicHandler(async url=>vite.transformIndexHtml(url,await readFile('index.html','utf8'))));
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`YEREVANHUB server ready on port ${port}`));
server.on('error', () => { console.error('Server failed to start. Check the selected port.'); process.exit(1); });
