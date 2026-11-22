import express from 'express';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('admin-created roles isolate listings, requests, moderation and capacity',async()=>{
  const cwd=process.cwd(),dir=mkdtempSync(join(tmpdir(),'provider-test-'));process.chdir(dir);
  const {providerApi}=await import('./providers');
  const server=express().use(providerApi()).listen(0);await new Promise<void>(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+ (server.address() as any).port;
  function client(){let cookie='';return async(path:string,body?:any)=>{
    const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json','X-Requested-With':'YerevanHub'},body:body?JSON.stringify(body):undefined});
    if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie')!.split(';')[0];return {status:res.status,...await res.json()};
  };}
  const admin=client(),job=client(),tour=client(),other=client(),visitor=client();
  const act=(c:any,action:string,input:any)=>c('provider-action',{action,input});
  try{
    assert.equal((await admin('login',{email:'admin@yerevanhub.com',password:'wrong'})).status,401);
    assert.equal((await admin('login',{email:'admin@yerevanhub.com',password:'Admin@2026'})).success,true);
    for(const [email,role] of [['job@test.am','job_provider'],['tour@test.am','tour_provider'],['other@test.am','job_provider']]){
      assert.equal((await act(admin,'provider',{email,role,name:email,password:'ProviderTest123!',phone:'',organization:'Team',isActive:true})).success,true);
    }
    await job('login',{email:'job@test.am',password:'ProviderTest123!'});await tour('login',{email:'tour@test.am',password:'ProviderTest123!'});await other('login',{email:'other@test.am',password:'ProviderTest123!'});
    const listing={kind:'job_provider',title:'Reception',description:'Work',location:'Yerevan',schedule:'Evenings',contact:'team@test.am',price:10000,capacity:2,active:true};
    assert.equal((await act(job,'listing',listing)).success,true);
    assert.equal((await visitor('providers')).listings.length,0);
    let l=(await job('providers')).listings[0];
    assert.equal((await act(other,'listing',{...l,title:'Stolen'})).status,403);
    assert.equal((await act(tour,'listing',listing)).status,403);
    await act(admin,'listing',{...l,approved:true});
    l=(await visitor('providers')).listings[0];
    const request={listingId:l.id,requestId:crypto.randomUUID(),name:'Applicant',contact:'guest@test.am',note:'Experience',people:1,date:''};
    const submitted=await act(visitor,'request',request);
    assert.ok(submitted.reference);assert.equal((await act(visitor,'request',request)).reference,submitted.reference);
    assert.equal((await job('providers')).requests.length,1);assert.equal((await other('providers')).requests.length,0);
    assert.equal((await visitor('providers')).requests.length,0);
    assert.equal((await act(other,'status',{id:submitted.reference,status:'accepted'})).status,403);
    assert.equal((await act(job,'status',{id:submitted.reference,status:'contacted'})).success,true);
    await act(tour,'listing',{...listing,kind:'tour_provider',title:'Sevan'});
    let tl=(await tour('providers')).listings.find((x:any)=>x.kind==='tour_provider');await act(admin,'listing',{...tl,approved:true});
    const tr={...request,listingId:tl.id,requestId:crypto.randomUUID(),people:2,date:'2030-01-01'};
    const booked=await act(visitor,'request',tr);assert.ok(booked.reference);
    assert.equal((await act(visitor,'request',{...tr,requestId:crypto.randomUUID()})).status,400);
    assert.equal((await tour('providers')).requests.length,1);
    assert.equal((await act(tour,'status',{id:booked.reference,status:'confirmed'})).success,true);
    const provider=(await admin('providers')).users.find((u:any)=>u.email==='tour@test.am');
    await act(admin,'provider',{...provider,password:'',isActive:false});
    assert.equal((await tour('providers')).user,null);
    assert.equal((await admin('providers')).requests.length,2);
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
});
