// Imported by the disposable HTTPS staging fixture only. Never a VPS test.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {chromium} from 'playwright-core';
import {rentalOwnerText} from '../src/i18n/rentalOwner.ts';
import {propertyText} from '../src/i18n/properties.ts';
export async function verifyRentalOwnerUI({request,root,env,adminCookie,proxyPassword}){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||root!=='/opt/hostel2-staging'||env.APP_ENV!=='staging')throw Error('Disposable CI staging required.');
 const origin='https://test.yerevanhub.ir:8443',password=randomUUID(),email='qa09.'+randomUUID()+'@example.test',t=rentalOwnerText.en,pt=propertyText('en');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1']}),errors=[];
 async function context(cookie,lang='en',theme='light'){
  const c=await browser.newContext({ignoreHTTPSErrors:true,httpCredentials:{username:'staging',password:proxyPassword},viewport:{width:1366,height:1000}});
  if(cookie){const i=cookie.indexOf('=');await c.addCookies([{name:cookie.slice(0,i),value:cookie.slice(i+1),domain:'test.yerevanhub.ir',path:'/',secure:true,httpOnly:true}]);}
  await c.addInitScript(({lang,theme})=>{localStorage.setItem('yerevanhub_lang',lang);localStorage.setItem('yerevanhub_theme',theme);},{lang,theme});
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));return {c,p};
 }
 async function mutation(p,action,fn){const response=p.waitForResponse(r=>r.url()===origin+'/api/app'&&r.request().postDataJSON()?.action===action);await fn();const result=await(await response).json();assert.equal(result.success,true,result.error);return result;}
 async function open(p,lang='en'){await p.goto(origin+'/'+lang+'/#/rental-owner');await p.getByTestId('rental-owner-dashboard').waitFor();await p.getByTestId('rental-owner-dashboard').getByRole('button',{name:rentalOwnerText[lang].refresh,exact:true}).waitFor();}
 try{
  const admin=await context(adminCookie);await admin.p.goto(origin+'/en/#/admin');await admin.p.locator('#site-preloader').waitFor({state:'detached'});
  await admin.p.getByRole('button',{name:t.admin,exact:true}).click();const accounts=admin.p.getByTestId('rental-owners-admin');await accounts.getByLabel(t.name,{exact:true}).fill('QA09 SYNTHETIC owner');await accounts.getByLabel(t.email,{exact:true}).fill(email);await accounts.getByLabel(t.password,{exact:true}).fill(password);
  await mutation(admin.p,'saveRentalOwnerAccount',()=>accounts.getByRole('button',{name:t.save,exact:true}).click());await accounts.getByText(email,{exact:true}).first().waitFor();await admin.c.close();
  // Real application authentication; password exists only in this process.
  const login=await request('/api/app',{data:{action:'login',args:[email,password]}});const logged=JSON.parse(login.text);assert.equal(logged.success,true,logged.error);assert.equal(logged.state.currentUser.rentalOwnerAuthorized,true);const cookie=login.headers['set-cookie'][0].split(';')[0];
  const owner=await context(cookie),p=owner.p;await open(p);const panel=p.getByTestId('rental-owner-dashboard');await panel.getByRole('button',{name:pt('add'),exact:true}).click();const editor=p.getByTestId('property-editor');
  const langs={fa:'فارسی',en:'English',ru:'Русский',hy:'Հայերեն'};for(const [lang,name] of Object.entries(langs)){await editor.getByLabel(pt('name')+' · '+name,{exact:true}).fill('QA09 SYNTHETIC rental '+lang);await editor.getByLabel(pt('description')+' · '+name,{exact:true}).fill('Fictional isolated QA property '+lang);}
  await editor.getByLabel(pt('slug'),{exact:true}).fill('qa09-'+randomUUID());await editor.getByLabel(pt('city'),{exact:true}).fill('Yerevan');await editor.getByLabel(pt('district'),{exact:true}).fill('Kentron');await editor.getByLabel(pt('approximate'),{exact:true}).fill('Kentron area');await editor.getByLabel(pt('address'),{exact:true}).fill('Approximate location only');await editor.getByLabel(pt('internalAddress'),{exact:true}).fill('QA09 PRIVATE EXACT ADDRESS');assert.equal(await editor.getByLabel(pt('notes'),{exact:true}).count(),0);
  const draft=await mutation(p,'saveOwnerRental',()=>editor.getByRole('button',{name:pt('save'),exact:true}).click());const id=draft.rental.id;await editor.getByRole('status').waitFor();
  await editor.getByRole('button',{name:'2. '+pt('details'),exact:true}).click();await editor.getByLabel(pt('propertyType'),{exact:true}).selectOption('room');
  for(const [label,value] of [['area','50'],['floor','2'],['floors','4'],['bedrooms','1'],['beds','2'],['bathrooms','1'],['occupancy','2'],['price','22000'],['minNights','2'],['depositTerms','Refundable after inspection']])await editor.getByLabel(pt(label),{exact:true}).fill(value);
  await editor.getByRole('button',{name:'3. '+pt('images'),exact:true}).click();const image=await sharp({create:{width:96,height:64,channels:3,background:'#14241a'}}).png().toBuffer();const upload=p.waitForResponse(r=>r.url().includes('/api/rental-owner/media?')&&r.request().method()==='POST');await editor.getByLabel(pt('upload'),{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:image});assert.equal((await upload).status(),201);
  for(const name of Object.values(langs))await editor.getByLabel(pt('alt')+' · '+name,{exact:true}).fill('SYNTHETIC room');
  await editor.getByRole('button',{name:'4. '+pt('review'),exact:true}).click();await editor.getByLabel(pt('reviewed'),{exact:true}).check();await editor.getByLabel(pt('publish'),{exact:true}).selectOption('published');await mutation(p,'saveOwnerRental',()=>editor.getByRole('button',{name:t.submit,exact:true}).click());
  assert(!JSON.parse((await request('/api/app')).text).state.rentals.some(r=>r.id===id));
  // Use the actual moderation API, including its authoritative revision token.
  const queue=JSON.parse((await request('/api/admin/moderation?module=rental&status=pending_review&search=QA09',{cookie:adminCookie})).text);const item=queue.items.find(r=>r.id===id);assert(item);
  const approved=JSON.parse((await request('/api/app',{cookie:adminCookie,data:{action:'moderateContent',args:[{targets:[{module:'rental',id,version:item.version,contentVersion:item.contentVersion}],status:'published',note:'SYNTHETIC reviewed',confirmed:true}]}})).text);assert.equal(approved.success,true,approved.error);
  const visitor=await context();await visitor.p.goto(origin+'/en/#/rental/'+id);await visitor.p.locator('#rental-name').fill('QA09 SYNTHETIC tenant');await visitor.p.locator('#rental-contact').fill('tenant@example.test');await visitor.p.getByRole('button',{name:'Rental',exact:true}).click();await visitor.p.locator('#rental-start-date').fill(new Date(Date.now()+172800000).toISOString().slice(0,10));await visitor.p.locator('#rental-duration').fill('3 months');await visitor.p.getByLabel(t.consent,{exact:true}).check();const receipt=await mutation(visitor.p,'createRentalInquiry',()=>visitor.p.getByRole('button',{name:'Send inquiry',exact:true}).click());assert(receipt.inquiry.privateToken);assert(!(await visitor.p.content()).includes('QA09 PRIVATE EXACT ADDRESS'));await visitor.c.close();
  await p.reload();await panel.getByRole('button',{name:t.inquiries,exact:true}).click();const inquiry=panel.getByTestId('owner-inquiry-'+receipt.inquiry.id);await inquiry.waitFor();await mutation(p,'updateOwnerInquiry',()=>inquiry.getByLabel(t.status,{exact:true}).selectOption('coordinating'));
  await panel.getByRole('button',{name:t.profile,exact:true}).click();await panel.getByLabel(t.organization,{exact:true}).fill('QA09 organization');await mutation(p,'saveOwnerProfile',()=>panel.getByRole('button',{name:t.save,exact:true}).click());await p.reload();await panel.getByRole('button',{name:t.profile,exact:true}).click();assert.equal(await panel.getByLabel(t.organization,{exact:true}).inputValue(),'QA09 organization');await owner.c.close();
  let layouts=0;
  for(const lang of ['fa','en','ru','hy'])for(const theme of ['light','dark']){
   const v=await context(cookie,lang,theme),w=rentalOwnerText[lang];await open(v.p,lang);const view=v.p.getByTestId('rental-owner-dashboard');await view.getByTestId('owner-rental-'+id).waitFor();
   for(const tab of ['properties','inquiries','profile','history']){await view.getByRole('button',{name:w[tab],exact:true}).click();for(const width of [320,360,390,430,640,768,820,1024,1366]){await v.p.setViewportSize({width,height:1000});assert.equal(await v.p.locator('html').getAttribute('dir'),lang==='fa'?'rtl':'ltr');assert(await v.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+theme+' '+tab+' '+width);layouts++;}}
   await v.c.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS rental owner admin account UI, real login, shared multilingual rental draft/editor/private address, scoped image upload, admin moderation, public consented inquiry, owner status/profile persistence and '+layouts+' locale/theme/viewport layouts');
 }finally{await browser.close();}
}
