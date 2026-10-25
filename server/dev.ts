import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createApi } from './api';
import { Database } from './database';
const production = process.env.NODE_ENV === 'production';
const database = new Database({ demo: !production && process.env.DEMO_MODE !== 'false' });
const app = express();
const server = createHttpServer(app);
app.use(createApi(database));
if (production) {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true', ws: process.env.DISABLE_HMR === 'true' ? false : { server } }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`YEREVANHUB server ready on port ${port}`));
server.on('error', () => { console.error('Server failed to start. Check the selected port.'); process.exit(1); });
