// Disposable HTTPS/Nginx CI fixture only. Never run on a VPS.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {chromium} from 'playwright-core';
import {serviceProviderText} from '../src/i18n/serviceProvider.ts';
import {servicesText} from '../src/i18n/services.ts';
export async function verifyServiceProviderUI({request,root,env,adminCookie,proxyPassword}){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||root!=='/opt/hostel2-staging'||env.APP_ENV!=='staging')throw Error('Disposable CI staging required.');
 const origin='https://test.yerevanhub.ir:8443',password=randomUUID(),email='qa10.'+randomUUID()+'@example.test',t=serviceProviderText.en,st=servicesText.en,errors=[];
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1']});
 async function context(cookie,lang='en',theme='light'){
  const c=await browser.newContext({ignoreHTTPSErrors:true,httpCredentials:{username:'staging',password:proxyPassword},viewport:{width:1366,height:1000}});
  if(cookie){const i=cookie.indexOf('=');await c.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),domain:'test.yerevanhub.ir',path:'/',secure:true,httpOnly:true}]);}
  await c.addInitScript(({lang,theme})=>{localStorage.setItem('yerevanhub_lang',lang);localStorage.setItem('yerevanhub_theme',theme);},{lang,theme});
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));return {c,p};
 }
 async function mutation(p,name,fn){const response=p.waitForResponse(r=>r.url()===origin+'/api/app'&&r.request().postDataJSON()?.action===name);await fn();const result=await(await response).json();assert.equal(result.success,true,result.error);return result;}
 async function open(p,lang='en'){await p.goto(origin+'/'+lang+'/#/service-provider');await p.getByTestId('service-provider-dashboard').waitFor();await p.getByTestId('provider-services').waitFor();}
 try{
  const admin=await context(adminCookie);await admin.p.goto(origin+'/en/#/admin');await admin.p.locator('#site-preloader').waitFor({state:'detached'});
  const nav=admin.p.getByTestId('workspace-tab-service-providers');await nav.click();const accounts=admin.p.getByTestId('service-providers-admin');
  await accounts.getByLabel(t.name,{exact:true}).fill('QA10 SYNTHETIC provider');await accounts.getByLabel(t.email,{exact:true}).fill(email);await accounts.getByLabel(t.password,{exact:true}).fill(password);await accounts.getByLabel(t.businessName,{exact:true}).first().fill('QA10 SYNTHETIC business');
  await mutation(admin.p,'saveServiceProviderAccount',()=>accounts.getByRole('button',{name:t.save,exact:true}).click());await accounts.getByText(email,{exact:true}).first().waitFor();await admin.c.close();
  const login=await request('/api/app',{data:{action:'login',args:[email,password]}}),logged=JSON.parse(login.text);assert.equal(logged.success,true,logged.error);assert.equal(logged.state.currentUser.serviceProviderAuthorized,true);const cookie=login.headers['set-cookie'][0].split(';')[0];
  const owner=await context(cookie),p=owner.p;await open(p);const panel=p.getByTestId('service-provider-dashboard'),list=panel.getByTestId('provider-services');
  await list.getByRole('button',{name:st.add,exact:true}).click();let editor=p.getByTestId('service-editor');
  const slug='qa10-'+randomUUID();
  for(const lang of ['fa','en','ru','hy'])for(const label of [st.titleField,st.shortDescription,st.description,st.address,st.workingHours,st.priceRange])await editor.getByLabel(label+' · '+st[lang],{exact:true}).fill('QA10 SYNTHETIC '+label+' '+lang);
  await editor.getByLabel(st.slug,{exact:true}).fill(slug);
  await editor.getByLabel(st.phone,{exact:true}).fill('+37491123456');await editor.getByLabel(st.mapUrl,{exact:true}).fill('https://yandex.com/maps/');await editor.getByLabel(st.latitude,{exact:true}).fill('40.18');await editor.getByLabel(st.longitude,{exact:true}).fill('44.51');
  assert.equal(await editor.getByLabel(st.verifiedField,{exact:true}).count(),0);assert.equal(await editor.getByLabel(st.featuredField,{exact:true}).count(),0);
  await mutation(p,'saveProviderService',()=>editor.getByRole('button',{name:st.save,exact:true}).click());await list.getByRole('button',{name:st.edit,exact:true}).waitFor();await list.getByRole('button',{name:st.edit,exact:true}).click();editor=p.getByTestId('service-editor');
  const state=JSON.parse((await request('/api/service-provider',{cookie})).text),id=state.listings[0].id;assert.equal(state.listings[0].moderationStatus,'draft');
  const image=await sharp({create:{width:96,height:64,channels:3,background:'#14241a'}}).png().toBuffer(),upload=p.waitForResponse(r=>r.url().includes('/api/service-provider/media?')&&r.request().method()==='POST');
  await editor.getByLabel(st.upload,{exact:true}).setInputFiles({name:'synthetic-business.png',mimeType:'image/png',buffer:image});assert.equal((await upload).status(),201);
  await editor.getByLabel(st.allowRequest,{exact:true}).check();await editor.getByLabel(t.submit,{exact:true}).check();
  await mutation(p,'saveProviderService',()=>editor.getByRole('button',{name:st.save,exact:true}).click());
  assert.equal((await request('/api/services/'+id)).status,404);
  const queue=JSON.parse((await request('/api/admin/moderation?module=service&status=pending_review&search=QA10',{cookie:adminCookie})).text),item=queue.items.find(r=>r.id===id);assert(item);
  const approved=JSON.parse((await request('/api/app',{cookie:adminCookie,data:{action:'moderateContent',args:[{targets:[{module:'service',id,version:item.version,contentVersion:item.contentVersion}],status:'published',note:'SYNTHETIC reviewed business listing',confirmed:true}]}})).text);assert.equal(approved.success,true,approved.error);
  const visitor=await context();await visitor.p.goto(origin+'/en/services/'+slug);await visitor.p.getByLabel(st.name,{exact:true}).fill('QA10 SYNTHETIC customer');await visitor.p.getByLabel(st.contact,{exact:true}).fill('qa10-customer@example.test');await visitor.p.getByLabel(t.consent,{exact:true}).check();
  const receipt=await mutation(visitor.p,'requestService',()=>visitor.p.getByRole('button',{name:st.send,exact:true}).click());assert(receipt.serviceReference);
  await visitor.p.getByRole('button',{name:t.track,exact:true}).click();await visitor.p.getByText(st.new,{exact:true}).waitFor();await visitor.c.close();
  await p.reload();await panel.getByRole('button',{name:t.requests,exact:true}).click();const inquiry=panel.locator('[data-testid^="provider-request-"]').first();await inquiry.waitFor();await mutation(p,'updateProviderServiceRequest',()=>inquiry.getByLabel(t.status,{exact:true}).selectOption('contacted'));
  const progress=JSON.parse((await request('/api/service-requests/'+receipt.serviceReference)).text);assert.equal(progress.status,'contacted');assert(!JSON.stringify(progress).includes('qa10-customer'));
  await panel.getByRole('button',{name:t.profile,exact:true}).click();await panel.getByLabel(t.businessName,{exact:true}).fill('QA10 changed business');await mutation(p,'saveServiceBusiness',()=>panel.getByRole('button',{name:t.save,exact:true}).click());await p.reload();await panel.getByRole('button',{name:t.profile,exact:true}).click();await panel.getByLabel(t.businessName,{exact:true}).waitFor();assert.equal(await panel.getByLabel(t.businessName,{exact:true}).inputValue(),'QA10 changed business');await owner.c.close();
  let layouts=0;
  for(const lang of ['fa','en','ru','hy'])for(const theme of ['light','dark']){
   const v=await context(cookie,lang,theme),w=serviceProviderText[lang];await open(v.p,lang);const view=v.p.getByTestId('service-provider-dashboard');
   for(const tab of ['listings','requests','profile','history']){await view.getByRole('button',{name:w[tab],exact:true}).click();for(const width of [320,360,390,430,640,768,820,1024,1366]){await v.p.setViewportSize({width,height:1000});assert.equal(await v.p.locator('html').getAttribute('dir'),lang==='fa'?'rtl':'ltr');assert(await v.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+theme+' '+tab+' '+width);layouts++;}}
   await v.c.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS service provider administrator account UI, real login, shared four-language listing editor, scoped images, administrator moderation, customer consent and private tracking, request status/profile persistence and '+layouts+' locale/theme/viewport layouts');
 }finally{await browser.close();}
}
