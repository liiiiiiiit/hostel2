import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadSeeker,uploadSeekerResume} from './jobSeeker';
import {seekerText} from '../i18n/jobSeeker';
test('private seeker client rejects HTML fallback, malformed success payloads and false success envelopes',async t=>{
 const fetchBefore=globalThis.fetch,documentBefore=globalThis.document;
 globalThis.document={documentElement:{lang:'en'}} as Document;t.after(()=>{globalThis.fetch=fetchBefore;globalThis.document=documentBefore;});
 const file=new File(['synthetic'],'resume.pdf',{type:'application/pdf'});
 for(const body of ['<html>SPA fallback</html>','null','{}',JSON.stringify({success:false,error:'Controlled failure'})]){
  globalThis.fetch=async()=>new Response(body,{status:200});await assert.rejects(uploadSeekerResume(file));await assert.rejects(loadSeeker());
 }
 globalThis.fetch=async()=>new Response('{}',{status:503});await assert.rejects(loadSeeker(),new RegExp(seekerText.en.error.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('private seeker client retains same-origin credentials, CSRF header, encoded filename and validates metadata/state',async t=>{
 const fetchBefore=globalThis.fetch,documentBefore=globalThis.document;
 globalThis.document={documentElement:{lang:'fa'}} as Document;t.after(()=>{globalThis.fetch=fetchBefore;globalThis.document=documentBefore;});
 const doc={id:randomUUID(),name:'رزومه.pdf',bytes:600,createdAt:new Date().toISOString()},file=new File(['synthetic'],doc.name,{type:'application/pdf'});
 globalThis.fetch=async(path,init)=>{assert.equal(path,'/api/job-seeker/documents');assert.equal(init?.credentials,'same-origin');assert.equal(init?.headers['X-Requested-With'],'YerevanHub');assert.equal(decodeURIComponent(init?.headers['X-File-Name']),doc.name);assert.equal(init?.body,file);return Response.json(doc,{status:201});};assert.deepEqual(await uploadSeekerResume(file),doc);
 const state={profile:{version:0,fullName:'Synthetic',skills:[],languages:[],experience:[],education:[]},documents:[doc],savedJobs:[],applications:[]};globalThis.fetch=async()=>Response.json(state);assert.deepEqual(await loadSeeker(),state);
 globalThis.fetch=async()=>Response.json({...doc,bytes:2097153});await assert.rejects(uploadSeekerResume(file));
});
