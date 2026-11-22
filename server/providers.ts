import express from 'express';
import crypto from 'node:crypto';
import { getDb, saveDb, hashPassword, type User, type AppDatabase } from './db';
import type { Listing, ProviderRequest } from '../src/types/providers';

const roles = ['job_provider','tour_provider'];
const deny = () => { throw new Error('Access denied'); };
const text = (value: unknown, max=4000, required=false) => {
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Invalid field');
  return value.trim();
};
const number = (value:unknown,min:number,max:number) => {
  if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw new Error('Invalid number');
  return value;
};
const safe = ({passwordHash,salt,...user}:User)=>user;
export function providerApi() {
  const app = express.Router();
  app.use('/api',express.json({limit:'64kb'}));
  const attempts = new Map<string,{n:number,end:number}>();
  app.use('/api', (req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(req.method==='POST'&&(req.get('X-Requested-With')!=='YerevanHub'||(req.get('Origin')&&new URL(req.get('Origin')!).host!==req.get('host')))){res.sendStatus(403);return;}
    const key=(req.ip||'')+req.path,now=Date.now();
    for(const [key,value] of attempts)if(value.end<now)attempts.delete(key);
    const bucket=attempts.get(key)||{n:0,end:now+60000};bucket.n++;attempts.set(key,bucket);
    if(bucket.n>(req.path==='/login'?15:120)){res.status(429).json({error:'Please try again shortly'});return;}next();
  });
  app.use('/api',(req,res,next)=>{
    try {
      const db=getDb();
      db.listings??=[];db.requests??=[];
      const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('yh_session='))?.slice(11);
      const session=db.sessions.find(s=>s.token===token&&Date.parse(s.expiresAt)>Date.now());
      res.locals.actor=db.users.find(u=>u.id===session?.userId&&u.isActive)||null;next();
    }catch(nextError){next(nextError);}
  });
  app.get('/api/providers',(_req,res)=>{
    const db=getDb(),actor:User|null=res.locals.actor;
    const admin=actor?.role==='admin';
    const listings=db.listings!.filter(l=>admin||l.ownerId===actor?.id||(l.active&&l.approved&&db.users.some(u=>u.id===l.ownerId&&u.isActive)));
    const owned=new Set(db.listings!.filter(l=>l.ownerId===actor?.id).map(l=>l.id));
    res.json({user:actor?safe(actor):null,users:admin?db.users.filter(u=>roles.includes(u.role)).map(safe):[],
      listings,requests:db.requests!.filter(r=>admin||owned.has(r.listingId)).map(({fingerprint,requestId,...r})=>r)});
  });
  app.post('/api/login',(req,res,next)=>{
    try {
      const db=getDb(),email=text(req.body.email,254,true).toLowerCase(),password=text(req.body.password,128,true);
      const user=db.users.find(u=>u.email.toLowerCase()===email&&u.isActive);
      const derived=hashPassword(password,user?.salt||'missing-user');
      if(!user||user.passwordHash.length!==derived.length||!crypto.timingSafeEqual(Buffer.from(derived),Buffer.from(user.passwordHash)))return void res.status(401).json({error:'Invalid email or password'});
      const token=crypto.randomBytes(32).toString('hex');
      db.sessions.push({token,userId:user.id,role:user.role,expiresAt:new Date(Date.now()+86400000*7).toISOString()});
      saveDb(db);res.cookie('yh_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:86400000*7,path:'/'}).json({user:safe(user),success:true});
    }catch(e){next(e);}
  });
  app.post('/api/logout',(_req,res)=>{
    const db=getDb(),actor:User|null=res.locals.actor;
    db.sessions=db.sessions.filter(s=>s.userId!==actor?.id);saveDb(db);
    res.clearCookie('yh_session',{path:'/'}).json({success:true});
  });
  app.post('/api/provider-action',(req,res,next)=>{
    try {
      const db=getDb(),actor:User|null=res.locals.actor,admin=actor?.role==='admin';
      const {action,input}=req.body;
      if(action==='provider'){
        if(!admin)deny();
        const id=input.id||crypto.randomUUID();
        const existing=db.users.find(u=>u.id===id);
        if(existing&&!roles.includes(existing.role))deny();
        const role=text(input.role,30,true);if(!roles.includes(role))deny();
        const email=text(input.email,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||db.users.some(u=>u.id!==id&&u.email.toLowerCase()===email))throw new Error('Invalid or duplicate email');
        if(existing&&existing.role!==role&&db.listings!.some(l=>l.ownerId===id))throw new Error('Account with listings must keep its role');
        const password=text(input.password||'',128);
        if((!existing||password)&&password.length<12)throw new Error('Use at least 12 password characters');
        const salt=password?crypto.randomBytes(32).toString('hex'):existing!.salt;
        const user:User={id,email,name:text(input.name,120,true),role:role as User['role'],phone:text(input.phone||'',50),organization:text(input.organization||'',160),
          salt,passwordHash:password?hashPassword(password,salt):existing!.passwordHash,isActive:input.isActive===true,createdAt:existing?.createdAt||new Date().toISOString()};
        db.users=db.users.filter(u=>u.id!==id).concat(user);
        db.sessions=db.sessions.filter(s=>s.userId!==id);
      }else if(action==='listing'){
        if(!actor||(!admin&&!roles.includes(actor.role)))deny();
        const existing=db.listings!.find(l=>l.id===input.id);
        if(existing&&existing.ownerId!==actor.id&&!admin)deny();
        if(existing&&existing.version!==input.version)throw new Error('Listing changed. Reload and retry');
        const kind=existing?.kind||input.kind;
        if(!roles.includes(kind)||(!admin&&actor.role!==kind))deny();
        const owner=existing?.ownerId||(admin?input.ownerId:actor.id);
        if(!db.users.some(u=>u.id===owner&&(u.role===kind||u.role==='admin')))deny();
        const listing:Listing={id:existing?.id||crypto.randomUUID(),ownerId:owner,kind,version:(existing?.version||0)+1,
          title:text(input.title,160,true),description:text(input.description,4000,true),location:text(input.location,200,true),
          schedule:text(input.schedule,200,true),contact:text(input.contact,250,true),category:text(input.category||'',100),
          requirements:text(input.requirements||''),inclusions:text(input.inclusions||''),image:text(input.image||'',1000),
          price:input.price===null?null:number(input.price,0,1000000000),capacity:number(input.capacity,1,10000),
          active:input.active===true,approved:admin?input.approved===true:false};
        if(listing.kind==='tour_provider'&&db.requests!.some(r=>r.listingId===listing.id&&['pending','confirmed'].includes(r.status)&&db.requests!.filter(x=>x.listingId===listing.id&&x.date===r.date&&['pending','confirmed'].includes(x.status)).reduce((s,x)=>s+x.people,0)>listing.capacity))throw new Error('Capacity is below reserved spots');
        if(listing.image&&!/^https:\/\//.test(listing.image))throw new Error('Image must be an HTTPS URL');
        db.listings=db.listings!.filter(l=>l.id!==listing.id).concat(listing);
      }else if(action==='delete'){
        const listing=db.listings!.find(l=>l.id===input.id);
        if(!listing||!actor||(!admin&&(actor.role!==listing.kind||listing.ownerId!==actor.id)))deny();
        if(db.requests!.some(r=>r.listingId===listing.id))throw new Error('Close listings with requests to preserve their history');
        db.listings=db.listings!.filter(l=>l.id!==listing.id);
      }else if(action==='request'){
        const listing=db.listings!.find(l=>l.id===input.listingId&&l.active&&l.approved&&db.users.some(u=>u.id===l.ownerId&&u.isActive));
        if(!listing)throw new Error('Listing unavailable');
        const name=text(input.name,120,true),contact=text(input.contact,250,true),note=text(input.note||'',1500);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)&&!/^\+?[\d\s().-]{6,30}$/.test(contact))throw new Error('Invalid contact');
        const requestId=text(input.requestId,100,true),fingerprint=JSON.stringify({listingId:listing.id,name,contact,note,date:input.date,people:input.people});
        const previous=db.requests!.find(r=>r.requestId===requestId);
        if(previous){if(previous.fingerprint!==fingerprint)throw new Error('Request mismatch');return void res.json({success:true,reference:previous.id});}
        const people=listing.kind==='tour_provider'?number(input.people,1,100):1;
        const date=listing.kind==='tour_provider'?text(input.date,10,true):'';
        if(listing.kind==='tour_provider'){
          if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Yerevan'}))throw new Error('Invalid date');
          const booked=db.requests!.filter(r=>r.listingId===listing.id&&r.date===date&&['pending','confirmed'].includes(r.status)).reduce((s,r)=>s+r.people,0);
          if(booked+people>listing.capacity)throw new Error('Insufficient spots');
        }
        const request:ProviderRequest={id:crypto.randomUUID(),listingId:listing.id,requestId,fingerprint,title:listing.title,name,contact,note,date,people,
          status:listing.kind==='tour_provider'?'pending':'new',createdAt:new Date().toISOString()};
        db.requests!.push(request);saveDb(db);return void res.json({success:true,reference:request.id});
      }else if(action==='status'){
        const request=db.requests!.find(r=>r.id===input.id),listing=db.listings!.find(l=>l.id===request?.listingId);
        if(!request||!listing||!actor||(!admin&&(actor.role!==listing.kind||listing.ownerId!==actor.id)))deny();
        const statuses=listing.kind==='tour_provider'?['pending','confirmed','cancelled']:['new','reviewed','contacted','accepted','rejected'];
        if(!statuses.includes(input.status))throw new Error('Invalid status');
        if(listing.kind==='tour_provider'&&['pending','confirmed'].includes(input.status)){
          const booked=db.requests!.filter(r=>r.id!==request.id&&r.listingId===listing.id&&r.date===request.date&&['pending','confirmed'].includes(r.status)).reduce((s,r)=>s+r.people,0);
          if(booked+request.people>listing.capacity)throw new Error('Insufficient spots');
        }
        request.status=input.status;
      }else throw new Error('Unknown action');
      saveDb(db);res.json({success:true});
    }catch(e){next(e);}
  });
  app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.message==='Access denied'?403:400).json({error:error.message}));
  return app;
}
