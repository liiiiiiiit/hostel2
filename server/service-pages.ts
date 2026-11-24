import type { Database } from './database.js';
import type { ClientState } from '../src/types/index.js';
import { getService, searchServices, ServiceError } from './services.js';
/** Resolve deep links independently of the six-card bootstrap preview. */
export async function servicesForPage(database:Database,state:ClientState,rawPath:string):Promise<ClientState>{
 const path=new URL(rawPath,'https://local.invalid').pathname;
 if(path==='/sitemap.xml'){
  const services=await database.sqlTransaction(async tx=>{const first=await searchServices(tx,{page:1,pageSize:48});const all=[...first.items];for(let page=2;(page-1)*48<first.total;page++)all.push(...(await searchServices(tx,{page,pageSize:48})).items);return all;},'read');
  return {...state,services};
 }
 const match=path.match(/^\/(fa|en|ru|hy)\/services\/([^/]+)\/?$/);
 if(!match)return state;
 try{const service=await database.sqlTransaction(tx=>getService(tx,decodeURIComponent(match[2])),'read');return {...state,services:[service]};}
 catch(e){if(e instanceof URIError||e instanceof ServiceError&&e.status===404)return {...state,services:[]};throw e;}
}
