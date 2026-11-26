import { chromium } from 'playwright-core';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp,rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const directory=await mkdtemp('/tmp/yh-provider-browser-');
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin=`http://127.0.0.1:${port}`;
let server,browser,output='';
async function start(){
  output='';server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),DATABASE_URL:`file:${directory}/test.db`,MEDIA_DIRECTORY:directory+'/uploads',NODE_ENV:'development',DATABASE_AUTH_TOKEN:'',APP_URL:origin,DEMO_MODE:'true',SERVE_BUILT_CLIENT:'true',DISABLE_HMR:'true',ADMIN_EMAIL:'',ADMIN_PASSWORD:'',RESEND_API_KEY:'',NOTIFICATION_FROM:'',TELEGRAM_BOT_TOKEN:'',GEMINI_API_KEY:''}});
  server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
  for(let i=0;i<150;i++){if(output.includes('server ready'))return;if(server.exitCode!==null||server.signalCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100))}throw Error('Server startup timed out');
}
async function stop(){if(server&&server.exitCode===null&&server.signalCode===null){server.kill();await new Promise(r=>server.once('exit',r));}}
const errors=[];
async function page(width=1280){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(()=>{localStorage.setItem('yerevanhub_lang','en');localStorage.setItem('yerevanhub_theme','light')});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);return p;
}
async function navigate(p,path){await p.goto(origin+'/en/'+path);await p.locator('#site-preloader').waitFor({state:'detached'});}
async function mutation(p,name,trigger){
  const result=p.waitForResponse(r=>r.url()===origin+'/api/app'&&r.request().method()==='POST'&&r.request().postDataJSON()?.action===name);
  await trigger();const data=await(await result).json();assert.equal(data.success,true,JSON.stringify(data));return data;
}
async function login(p,email,password,destination){
  await navigate(p,'');await p.locator('.header-sign-in-button').click();const dialog=p.getByRole('dialog');
  await dialog.getByLabel('Email address',{exact:true}).fill(email);await dialog.getByLabel('Password',{exact:true}).fill(password);
  await mutation(p,'login',()=>dialog.locator('button[type="submit"]').click());await p.waitForURL(u=>u.hash==='#/'+destination);
}
async function tab(p,name){const b=p.getByTestId('workspace-tab-'+name);await b.waitFor({state:'attached'});if(!await b.isVisible())await p.locator('.dashboard-menu-toggle').click();await b.click();}
try{
  await start();browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const admin=await page(),employer=await page(),organizer=await page(),guest=await page(390);
  await login(admin,'admin@yerevanhub.com','Admin@2026','admin');await tab(admin,'providers');
  const password=randomUUID();
  for(const [name,email,role] of [['Browser Employer','employer@audit.test','job_provider'],['Browser Organizer','organizer@audit.test','tour_provider']]){
    await admin.getByRole('button',{name:'Create account',exact:true}).click();
    await admin.getByLabel('Full name',{exact:true}).fill(name);await admin.getByLabel('Login email',{exact:true}).fill(email);
    await admin.getByLabel('Organization',{exact:true}).fill('Audit team');await admin.getByLabel('New password (12+ characters; leave blank to keep)',{exact:true}).fill(password);
    await admin.getByLabel('Account type',{exact:true}).selectOption(role);
    await mutation(admin,'saveProvider',()=>admin.getByRole('button',{name:'Save',exact:true}).click());
    await admin.getByRole('heading',{name,exact:true}).waitFor();
  }
  await login(employer,'employer@audit.test',password,'employer');
  await employer.getByRole('button',{name:'Post a job',exact:true}).click();
  for(const [label,value] of [['Job title','Browser audited job'],['Employer or company','Audit team'],['City and workplace','Yerevan'],['Employment type and hours','Daily'],['Responsibilities and requirements','Relevant experience'],['How to apply','employer@audit.test']])await employer.getByLabel(label,{exact:true}).fill(value);
  await mutation(employer,'saveRecruitmentJob',()=>employer.getByRole('button',{name:'Save listing',exact:true}).click());
  await employer.getByRole('article').filter({hasText:'Browser audited job'}).getByText('Awaiting admin approval',{exact:true}).waitFor();
  await navigate(guest,'jobs');assert.equal(await guest.getByRole('heading',{name:'Browser audited job'}).count(),0);
  await tab(admin,'jobs');await admin.reload();await tab(admin,'jobs');
  await admin.getByRole('article').filter({hasText:'Browser audited job'}).getByRole('button',{name:'Edit listing',exact:true}).click();
  await admin.getByLabel('Admin publication approval',{exact:true}).check();
  await mutation(admin,'saveRecruitmentJob',()=>admin.getByRole('button',{name:'Save listing',exact:true}).click());
  await navigate(guest,'jobs');const job=guest.locator('article').filter({hasText:'Browser audited job'});
  await job.getByRole('button',{name:'Apply for this job',exact:true}).click();
  await job.locator('input[name="name"]').fill('Browser applicant');await job.locator('input[name="contact"]').fill('applicant@audit.test');await job.locator('textarea').fill('Available immediately');
  await job.locator('input[name="consent"]').check();
  const application=await mutation(guest,'applyForJob',()=>job.locator('form button[type="submit"], form button:not([type])').first().click());
  assert(application.applicationReference);await employer.reload();await employer.locator('article details summary').click();
  await employer.getByRole('heading',{name:'Browser applicant'}).waitFor();
  await mutation(employer,'reviewApplication',()=>employer.locator('article details select').selectOption('reviewing'));
  console.log('PASS admin account creation → unified employer login → job creation → moderation → guest application → scoped provider review');

  await login(organizer,'organizer@audit.test',password,'tour-organizer');await organizer.getByRole('button',{name:'Add tour',exact:true}).click();
  for(const [label,value] of [['Tour name','Browser audited tour'],['Guide or agency','Audit guide'],['Destinations and route','Garni'],['Departure point','Yerevan'],['Dates or recurring days','Daily'],['Tour duration','One day'],['Itinerary and included services','Walking tour'],['Booking contact','organizer@audit.test']])await organizer.getByLabel(label,{exact:true}).fill(value);
  await organizer.getByLabel('Spots per date',{exact:true}).fill('2');await organizer.getByLabel('Publish publicly',{exact:true}).check();
  await mutation(organizer,'saveTour',()=>organizer.getByRole('button',{name:'Save tour',exact:true}).click());
  await navigate(guest,'tours');assert.equal(await guest.getByRole('heading',{name:'Browser audited tour'}).count(),0);
  await admin.reload();await tab(admin,'tours');await admin.locator('article').filter({hasText:'Browser audited tour'}).getByRole('button',{name:'Edit tour',exact:true}).click();
  await admin.getByLabel('Admin publication approval',{exact:true}).check();await mutation(admin,'saveTour',()=>admin.getByRole('button',{name:'Save tour',exact:true}).click());
  await navigate(guest,'tours');const tour=guest.locator('article').filter({hasText:'Browser audited tour'});
  await tour.getByRole('button',{name:'Book this tour',exact:true}).click();await tour.locator('input[name="name"]').fill('Browser passenger');await tour.locator('input[name="contact"]').fill('passenger@audit.test');
  const tomorrow=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Yerevan'});
  await tour.locator('input[type="date"]').fill(tomorrow);await tour.locator('input[type="number"]').fill('2');
  const booking=await mutation(guest,'bookTour',()=>tour.getByRole('button',{name:'Request booking',exact:true}).click());assert(booking.tourReference);
  await organizer.reload();const request=organizer.locator('article').filter({hasText:'Browser passenger'});
  await request.waitFor();await mutation(organizer,'changeTourBooking',()=>request.getByRole('combobox').selectOption('confirmed'));
  await admin.reload();await tab(admin,'tours');await admin.getByRole('heading',{name:/Browser audited tour.*Browser passenger/}).waitFor();
  console.log('PASS unified organizer login → tour creation → moderation → mobile guest booking → provider confirmation → admin oversight');
  await stop();await start();
  await employer.reload();await employer.locator('article details summary').click();assert.equal(await employer.locator('article details select').inputValue(),'reviewing');
  await organizer.reload();assert.equal(await organizer.locator('article').filter({hasText:'Browser passenger'}).getByRole('combobox').inputValue(),'confirmed');
  const reference=await guest.context().request.post(origin+'/api/app',{headers:{'X-Requested-With':'YerevanHub'},data:{action:'trackTour',args:[booking.tourReference]}});assert.equal((await reference.json()).tourStatus,'confirmed');
  console.log('PASS server restart preserves provider sessions, applications, tour confirmations and guest tracking');
  assert.deepEqual(errors,[]);console.log('Provider browser workflows passed');
}finally{if(browser)await browser.close();await stop();await rm(directory,{recursive:true,force:true});}
