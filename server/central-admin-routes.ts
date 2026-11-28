import type express from 'express';
import type {Database} from './database.js';
import type {Transaction} from '@libsql/client';
import type {User} from '../src/types/index.js';
import {adminQuery,adminRecords} from './central-admin-registry.js';
import {adminSummary,adminCases,caseQuery} from './central-admin.js';
import {adminHealth} from './central-admin-health.js';
export function mountCentralAdmin(app:express.Express,database:Database,session:(req:express.Request,tx:Transaction)=>Promise<User|null>){
 for(const kind of ['records','summary','cases','health'] as const)app.get('/api/admin/central/'+kind,async(req,res,next)=>{try{const query=kind==='records'?adminQuery.parse(req.query):kind==='cases'?caseQuery.parse(req.query):null;res.set('Cache-Control','no-store');res.json(await database.sqlTransaction(async tx=>{const actor=await session(req,tx);if(kind==='records')return adminRecords(tx,actor,query as ReturnType<typeof adminQuery.parse>);if(kind==='cases')return adminCases(tx,actor,query as ReturnType<typeof caseQuery.parse>);if(kind==='health')return adminHealth(tx,actor);return adminSummary(tx,actor);},'read'));}catch(e){next(e);}});
}
