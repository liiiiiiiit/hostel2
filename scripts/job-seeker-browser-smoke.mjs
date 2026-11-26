// Runs only against the disposable CI staging server created by staging-smoke.mjs.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright-core';
import {seekerText} from '../src/i18n/jobSeeker.ts';
import {applicationText} from '../src/i18n/jobApplications.ts';
import {syntheticResume} from '../server/resume-fixtures.ts';
export async function verifyJobSeekerUI({request,adminCookie,proxyPassword}){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true')throw Error('Disposable CI staging required.');
 const origin='https://test.yerevanhub.ir:8443',email='qa06.'+randomUUID()+'@example.test',password=randomUUID();
 const registered=await request('/api/app',{data:{action:'registerTraveler',args:['QA06 Synthetic Seeker',email,'',password]}});const registration=JSON.parse(registered.text);assert.equal(registration.success,true,registration.error);
 // Obtain only the newly registered account's cookie, without another rate-limited login.
 // The actual register response is retained below; no production host is contacted.
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1']});
 const errors=[];let cookie=registered.headers['set-cookie'][0].split(';')[0];
 const jobId=randomUUID();assert.equal(JSON.parse((await request('/api/app',{cookie:adminCookie,data:{action:'saveJob',args:[{id:jobId,version:0,title:'QA06 Browser opportunity',company:'SYNTHETIC company',location:'Yerevan',schedule:'Full time',description:'Fictional QA listing',contact:'jobs@example.test',salary:200000,period:'month',status:'open'}]}})).text).success,true);
 async function context(lang='en',theme='light'){
  const c=await browser.newContext({ignoreHTTPSErrors:true,httpCredentials:{username:'staging',password:proxyPassword},viewport:{width:1366,height:1000}});
  if(cookie){const i=cookie.indexOf('=');await c.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),domain:'test.yerevanhub.ir',path:'/',secure:true,httpOnly:true}]);}
  await c.addInitScript(({lang,theme})=>{localStorage.setItem('yerevanhub_lang',lang);localStorage.setItem('yerevanhub_theme',theme);},{lang,theme});
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));return {c,p};
 }
 async function mutate(p,action,fn){const response=p.waitForResponse(r=>r.url()===origin+'/api/app'&&r.request().postDataJSON()?.action===action);await fn();const result=await(await response).json();assert.equal(result.success,true,result.error);return result;}
 try{
  // Shared login is covered by the provider/RBAC browser suites; registration
  // here exercises the same identity without exhausting their shared IP budget.
  const view=await context(),p=view.p,t=seekerText.en;
  await p.goto(origin+'/en/#/job-seeker');await p.getByRole('heading',{name:t.panel,exact:true}).waitFor();
  await p.getByLabel(t.headline,{exact:true}).fill('QA06 Customer service');await p.getByLabel(t.skills,{exact:true}).fill('Hospitality, Teamwork');await p.getByLabel(t.languages+' en',{exact:true}).selectOption('fluent');
  await p.getByRole('button',{name:t.add+' · '+t.experience,exact:true}).click();await p.getByLabel(t.title,{exact:true}).fill('SYNTHETIC Receptionist');await p.getByLabel(t.organization,{exact:true}).fill('Fictional hostel');
  await mutate(p,'saveSeekerProfile',()=>p.getByRole('button',{name:t.save,exact:true}).click());await p.getByRole('status').filter({hasText:t.savedOk}).waitFor();
  await p.getByRole('button',{name:t.documents,exact:true}).click();await p.getByLabel(t.resume,{exact:true}).setInputFiles({name:'synthetic-resume.pdf',mimeType:'application/pdf',buffer:syntheticResume('QA06 SYNTHETIC resume')});const uploaded=p.waitForResponse(r=>r.url().endsWith('/api/job-seeker/documents')&&r.request().method()==='POST');await p.getByRole('button',{name:t.upload,exact:true}).click();assert.equal((await uploaded).status(),201);await p.getByText('synthetic-resume.pdf',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:t.jobs,exact:true}).click();await p.getByLabel(t.search,{exact:true}).fill('QA06 Browser opportunity');const job=p.locator('article').filter({hasText:'QA06 Browser opportunity'});await mutate(p,'saveSeekerJob',()=>job.getByRole('button',{name:t.save,exact:true}).click());
  let release;const delayed=new Promise(r=>{release=r;});await p.route('**/api/job-seeker',async route=>{await delayed;await route.continue();});
  await job.getByRole('button',{name:applicationText.en.apply,exact:true}).click();assert.equal(await job.locator('input[name="name"]').isDisabled(),true);release();await job.locator('input[name="name"]').fill('QA06 Applicant override');await p.unroute('**/api/job-seeker');await job.getByLabel(t.shareProfile,{exact:true}).check();await job.getByLabel(t.resume,{exact:true}).selectOption({label:'synthetic-resume.pdf'});await job.getByLabel(t.consent,{exact:true}).check();const applied=await mutate(p,'applyForJob',()=>job.getByRole('button',{name:applicationText.en.send,exact:true}).click());
  const reviewed=JSON.parse((await request('/api/app',{cookie:adminCookie})).text).state.jobApplications.find(x=>x.reference===applied.applicationReference);assert.equal(reviewed.name,'QA06 Applicant override');
  await p.getByRole('button',{name:t.history,exact:true}).click();await p.getByText(applied.applicationReference,{exact:true}).waitFor();assert.equal((await request('/api/job-applications/'+applied.applicationReference+'/resume',{cookie:adminCookie})).status,200);
  await mutate(p,'withdrawJobApplication',()=>p.getByRole('button',{name:t.withdraw,exact:true}).click());await p.getByText(applicationText.en.withdrawn,{exact:true}).waitFor();assert.equal((await request('/api/job-applications/'+applied.applicationReference+'/resume',{cookie:adminCookie})).status,404);
  await p.reload();await p.getByRole('heading',{name:t.panel,exact:true}).waitFor();await p.getByLabel(t.headline,{exact:true}).waitFor();assert.equal(await p.getByLabel(t.headline,{exact:true}).inputValue(),'QA06 Customer service');await view.c.close();
  let layouts=0;
  for(const lang of ['fa','en','ru','hy'])for(const theme of ['light','dark']){const v=await context(lang,theme),w=seekerText[lang];await v.p.goto(origin+'/'+lang+'/#/job-seeker');await v.p.getByRole('heading',{name:w.panel,exact:true}).waitFor();for(const width of [320,360,390,430,640,768,820,1024,1366]){await v.p.setViewportSize({width,height:1000});assert.equal(await v.p.locator('html').getAttribute('dir'),lang==='fa'?'rtl':'ltr');assert(await v.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+theme+' '+width);layouts++;}for(const tab of ['jobs','saved','history','documents','privacy']){await v.p.getByRole('button',{name:w[tab],exact:true}).click();await v.p.setViewportSize({width:360,height:1000});assert(await v.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+tab);layouts++;}await v.c.close();}
  assert.deepEqual(errors,[]);console.log('PASS job seeker existing account identity, delayed prefill protection, profile/experience/skills, private PDF upload, saved job, consented account application, authorized download, withdrawal/revocation, refresh persistence and '+layouts+' locale/theme/viewport layouts');
 }finally{await browser.close();}
}
