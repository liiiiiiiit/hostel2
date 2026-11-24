// Read configuration only; never instantiate Database or run migrations.
import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'dotenv';
const argument=(name:string)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
const app=argument('--app');const config=argument('--env');if(!app||!config)throw Error('Specify actual --app and --env paths discovered from systemd.');
const values={...parse(await readFile(config)),...process.env};const url=values.DATABASE_URL;let database:Record<string,unknown>={configured:!!url};
if(url?.startsWith('file:')){if(/[?#]/.test(url))throw Error('Inspect database URL options manually before relocation.');const requested=path.resolve(app,decodeURIComponent(url.slice(5)));const info=await stat(requested);if(!info.isFile())throw Error('Configured database is not a file.');database={kind:'local-sqlite',requested,actual:await realpath(requested),bytes:info.size};}
else if(url)database={kind:'remote',protocol:url.split(':')[0]};
const media=path.resolve(app,values.MEDIA_DIRECTORY||'data/uploads');
console.log(JSON.stringify({app:await realpath(app),config:await realpath(config),database,media:{backend:values.MEDIA_STORAGE||(values.VERCEL?'blob':'local'),configured:media,actual:await realpath(media).catch(()=>null)},backupDirectory:values.BACKUP_DIRECTORY?path.resolve(app,values.BACKUP_DIRECTORY):null,backupKeyConfigured:!!values.BACKUP_ENCRYPTION_KEY,environment:values.APP_ENV||'(legacy: inspect service NODE_ENV)'},null,2));
