import {requirePermission} from '../src/utils/authorization.js';
import type express from 'express';
import type { Database } from './database.js';
import type { User } from '../src/types/index.js';
import type { Transaction } from '@libsql/client';
import { getService, searchServices, serviceCategories, serviceCities, serviceQuery, servicesState, ServiceError } from './services.js';

export function mountServiceRoutes(app:express.Express,database:Database,session:(req:express.Request,tx:Transaction)=>Promise<User|null>){
 app.get('/api/service-categories',async(_req,res,next)=>{try{res.json(await database.sqlTransaction(async tx=>({categories:await serviceCategories(tx),cities:await serviceCities(tx)}),'read'));}catch(e){next(e);}});
 app.get('/api/services',async(req,res,next)=>{try{const query=serviceQuery.parse(req.query);res.json(await database.sqlTransaction(tx=>searchServices(tx,query),'read'));}catch(e){next(e);}});
 app.get('/api/services/:slug',async(req,res,next)=>{try{if(req.params.slug.length>160)throw new ServiceError('missing',404);res.json({service:await database.sqlTransaction(tx=>getService(tx,req.params.slug),'read')});}catch(e){next(e);}});
 for(const route of ['/api/admin/services','/api/admin/service-categories','/api/admin/service-requests'])app.get(route,async(req,res,next)=>{try{
  res.json(await database.sqlTransaction(async tx=>{const actor=await session(req,tx);requirePermission(actor,'services.manage');return servicesState(tx,actor);},'read'));
 }catch(e){next(e);}});
 // Reuse the project's action validation, CSRF protection, durable rate limits and transactions.
 const alias=(action:string,args:(req:express.Request)=>unknown[]) => (req:express.Request,_res:express.Response,next:express.NextFunction)=>{req.body={action,args:args(req)};req.method='POST';req.url='/api/app';next();};
 app.post('/api/services/:id/request',alias('requestService',req=>[{...req.body,serviceId:req.params.id}]));
 app.post('/api/admin/services',alias('saveService',req=>[req.body]));
 app.put('/api/admin/services/:id',alias('saveService',req=>[{...req.body,id:req.params.id}]));
 app.delete('/api/admin/services/:id',alias('deleteService',req=>[req.params.id,Number(req.query.version??req.body?.version)]));
 app.post('/api/admin/service-categories',alias('saveServiceCategory',req=>[req.body]));
 app.put('/api/admin/service-categories/:id',alias('saveServiceCategory',req=>[{...req.body,id:req.params.id}]));
 app.delete('/api/admin/service-categories/:id',alias('deleteServiceCategory',req=>[req.params.id,Number(req.query.version??req.body?.version)]));
 app.patch('/api/admin/service-requests/:id',alias('updateServiceRequest',req=>[req.params.id,req.body?.previous,req.body?.status]));
}
