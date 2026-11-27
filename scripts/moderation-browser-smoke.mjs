// Run only inside the disposable HTTPS staging fixture; never against a VPS.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright-core';
import {moderationText} from '../src/i18n/moderation.ts';
export async function verifyModerationUI({request,root,env,adminCookie,proxyPassword}){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||root!=='/opt/hostel2-staging'||env.APP_ENV!=='staging')throw Error('Disposable CI staging required.');
 const origin='https://test.yerevanhub.ir:8443',prefix='QA08 SYNTHETIC '+randomUUID().slice(0,8),ids=[randomUUID(),randomUUID()];
 for(const [i,id] of ids.entries())assert(JSON.parse((await request('/api/app',{cookie:adminCookie,data:{action:'saveJob',args:[{id,version:0,title:prefix+' '+i,company:'SYNTHETIC agency',location:'Yerevan',schedule:'Full time',description:'Fictional content only',contact:'jobs@example.test',salary:100,period:'month',status:'open',approved:false}]}})).text).success);
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1']}),errors=[];
 async function context(lang='en',theme='light'){
  const c=await browser.newContext({ignoreHTTPSErrors:true,httpCredentials:{username:'staging',password:proxyPassword},viewport:{width:1366,height:1000}}),i=adminCookie.indexOf('=');
  await c.addCookies([{name:adminCookie.slice(0,i),value:adminCookie.slice(i+1),domain:'test.yerevanhub.ir',path:'/',secure:true,httpOnly:true}]);
  await c.addInitScript(({lang,theme})=>{localStorage.setItem('yerevanhub_lang',lang);localStorage.setItem('yerevanhub_theme',theme);},{lang,theme});
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/'+lang+'/#/admin');await p.locator('#site-preloader').waitFor({state:'detached'});await p.getByRole('button',{name:moderationText[lang].nav,exact:true}).click();await p.getByTestId('moderation-center').waitFor();return {c,p};
 }
 try{
  const {c,p}=await context(),t=moderationText.en,center=p.getByTestId('moderation-center');
  await center.getByLabel(t.search,{exact:true}).fill(prefix);await center.getByTestId('moderation-job-'+ids[0]).waitFor();
  for(const id of ids)await center.getByTestId('moderation-job-'+id).getByRole('checkbox').check();
  await center.getByLabel(t.apply,{exact:true}).selectOption('published');await center.getByLabel(t.note,{exact:true}).fill('SYNTHETIC bulk publication review');
  async function decision(){const response=p.waitForResponse(r=>r.url()===origin+'/api/app'&&r.request().postDataJSON()?.action==='moderateContent');p.once('dialog',d=>d.accept());await center.getByRole('button',{name:t.apply,exact:true}).click();assert.equal((await(await response).json()).success,true);}
  await decision();await center.getByText(t.empty,{exact:true}).waitFor();
  const live=JSON.parse((await request('/api/app')).text).state.jobs;for(const id of ids)assert(live.some(j=>j.id===id));
  await center.getByLabel(t.status,{exact:true}).selectOption('published');await center.getByTestId('moderation-job-'+ids[0]).waitFor();for(const id of ids)await center.getByTestId('moderation-job-'+id).getByRole('checkbox').check();
  await center.getByLabel(t.apply,{exact:true}).selectOption('suspended');await center.getByLabel(t.note,{exact:true}).fill('SYNTHETIC reason <script>window.qa08Executed=true</script>');await decision();await center.getByText(t.empty,{exact:true}).waitFor();
  const hidden=JSON.parse((await request('/api/app')).text).state.jobs;for(const id of ids)assert(!hidden.some(j=>j.id===id));
  await center.getByLabel(t.status,{exact:true}).selectOption('suspended');const card=center.getByTestId('moderation-job-'+ids[0]);await card.waitFor();await card.getByText(t.history,{exact:true}).click();await card.getByText('SYNTHETIC reason <script>window.qa08Executed=true</script>',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.qa08Executed),undefined);
  await c.close();let layouts=0;
  for(const lang of ['fa','en','ru','hy'])for(const theme of ['light','dark']){
   const x=await context(lang,theme),w=moderationText[lang],view=x.p.getByTestId('moderation-center');await view.getByLabel(w.search,{exact:true}).fill(prefix);await view.getByLabel(w.status,{exact:true}).selectOption('all');await view.getByTestId('moderation-job-'+ids[0]).waitFor();
   for(const width of [320,360,390,430,640,768,820,1024,1366]){await x.p.setViewportSize({width,height:1000});assert.equal(await x.p.locator('html').getAttribute('dir'),lang==='fa'?'rtl':'ltr');assert(await x.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+theme+' '+width);layouts++;}
   await x.c.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS moderation admin queue/filter/preview, confirmed atomic bulk publication/suspension, private escaped history, public visibility and '+layouts+' locale/theme/viewport layouts');
 }finally{await browser.close();}
}
