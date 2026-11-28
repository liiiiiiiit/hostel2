import type {IncomingMessage,ServerResponse} from 'node:http';
import {applicationEnvironment} from './environment.js';
/** Defense in depth for both the Express VPS and hosted API adapter. */
export function releaseHeaders(req:IncomingMessage,res:ServerResponse){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 const environment=applicationEnvironment();
 if(environment==='production'){
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; frame-src https://yandex.com https://yandex.ru https://www.google.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  if(process.env.APP_URL?.startsWith('https://'))res.setHeader('Strict-Transport-Security','max-age=31536000');
 }
 if((req.url??'').split('?')[0].startsWith('/api/'))res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
}
