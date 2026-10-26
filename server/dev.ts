import {renderPublicHtml,sitemap,robots} from './public-pages.js';
import {publicState} from './public-state.js';
import {readFile} from 'node:fs/promises';
import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createApi } from './api.js';
import { Database } from './database.js';
const production = process.env.NODE_ENV === 'production';
const database = new Database({ demo: !production && process.env.DEMO_MODE !== 'false' });
const app = express();
const server = createHttpServer(app);
app.use(createApi(database));
const publicData=()=>database.transaction(async state=>publicState(state,null,database.demo));
const publicHandler=(template:(url:string)=>Promise<string>)=>async(req:express.Request,res:express.Response,next:express.NextFunction)=>{if(!/^\/(fa|en|ru|hy)(\/|$)/.test(req.path)&&!['/sitemap.xml','/robots.txt'].includes(req.path)){next();return;}try{const base=(process.env.APP_URL||req.protocol+'://'+req.get('host')).replace(/\/$/,'');if(req.path==='/robots.txt'){res.type('text').send(robots(base));return;}const state=await publicData();if(req.path==='/sitemap.xml'){res.type('xml').send(sitemap(state,base));return;}const page=renderPublicHtml(await template(req.originalUrl),state,req.originalUrl,base);res.set({'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}).status(page.status).type('html').send(page.html);}catch{res.status(503).send('YEREVANHUB unavailable');}};
if (production) {
  app.use(express.static('dist'));
  app.use(publicHandler(()=>readFile('dist/index.html','utf8')));
  app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true', ws: process.env.DISABLE_HMR === 'true' ? false : { server } }, appType: 'spa' });
  app.use(publicHandler(async url=>vite.transformIndexHtml(url,await readFile('index.html','utf8'))));
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`YEREVANHUB server ready on port ${port}`));
server.on('error', () => { console.error('Server failed to start. Check the selected port.'); process.exit(1); });
