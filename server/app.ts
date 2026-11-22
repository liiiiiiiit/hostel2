import 'dotenv/config';
import express from 'express';
import { createServer } from 'vite';
import path from 'node:path';
import { providerApi } from './providers';
const app = express();
app.use(providerApi());
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (_req,res)=>res.sendFile(path.resolve('dist/index.html')));
} else {
  const vite = await createServer({server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}
app.listen(Number(process.env.PORT || 3000),'0.0.0.0');
