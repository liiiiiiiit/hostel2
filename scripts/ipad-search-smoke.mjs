import {webkit,devices} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';

const directory=await mkdtemp(path.join(tmpdir(),'yh-ipad-'));
const artifacts=path.resolve(process.env.BROWSER_ARTIFACTS_DIR||'test-artifacts/ipad');
await mkdir(artifacts,{recursive:true});
const socket=createServer();
await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
const origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),DATABASE_URL:`file:${directory}/test.db`,DATABASE_AUTH_TOKEN:'',MEDIA_DIRECTORY:path.join(directory,'uploads'),DEMO_MODE:'true',DISABLE_HMR:'true',SERVE_BUILT_CLIENT:'true',NODE_ENV:'development',APP_URL:origin,ADMIN_EMAIL:'',ADMIN_PASSWORD:'',RESEND_API_KEY:'',NOTIFICATION_FROM:'',TELEGRAM_BOT_TOKEN:'',GEMINI_API_KEY:''}});
let output='',browser;
server.stdout.on('data',chunk=>output+=String(chunk));
server.stderr.on('data',chunk=>output+=String(chunk));
const results=[],errors=[];
const viewports=[{width:768,height:1024},{width:810,height:1080},{width:820,height:1180},{width:834,height:1194},{width:1024,height:768},{width:1080,height:810},{width:1112,height:834},{width:1180,height:820},{width:1194,height:834},{width:1366,height:1024}];
const {defaultBrowserType,...device}=devices['iPad (gen 7)'];

async function inspect(page,label,screenshot=false) {
  const geometry=await page.locator('.home-search-form').evaluate(form=>{
    const bounds=form.getBoundingClientRect();
    const controls=[...form.querySelectorAll('input,select,button[type="submit"]')].map(element=>{
      const rect=element.getBoundingClientRect(),parent=element.parentElement.getBoundingClientRect();
      return {id:element.id||'submit',left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,parentLeft:parent.left,parentRight:parent.right,boxSizing:getComputedStyle(element).boxSizing,direction:getComputedStyle(element).direction};
    });
    const issues=[];
    for(const control of controls) {
      if(control.left<bounds.left-1||control.right>bounds.right+1)issues.push(`${control.id}: outside form`);
      if(control.id!=='submit'&&(control.left<control.parentLeft-1||control.right>control.parentRight+1))issues.push(`${control.id}: outside label`);
      if(control.boxSizing!=='border-box')issues.push(`${control.id}: incorrect box sizing`);
      if(control.id.includes('check')&&control.width<140)issues.push(`${control.id}: date too narrow`);
      if(control.id.includes('check')&&control.direction!=='ltr')issues.push(`${control.id}: ambiguous RTL date order`);
    }
    for(let i=0;i<controls.length;i++)for(const b of controls.slice(i+1)) {
      const a=controls[i];
      const sameRow=a.top<b.bottom-1&&b.top<a.bottom-1;
      if(sameRow&&a.left<b.right-1&&b.left<a.right-1)issues.push(`${a.id}/${b.id}: overlapping borders`);
      else if(sameRow&&Math.max(a.left,b.left)-Math.min(a.right,b.right)<11)issues.push(`${a.id}/${b.id}: insufficient gap`);
    }
    if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1)issues.push('horizontal page overflow');
    return {issues,controls,formWidth:bounds.width,engine:navigator.userAgent};
  });
  results.push({label,...geometry});
  if(screenshot||geometry.issues.length)await page.locator('.search-panel').screenshot({path:path.join(artifacts,label+'.png')});
  console.log('IPAD '+JSON.stringify({label,issues:geometry.issues,formWidth:geometry.formWidth}));
  assert.deepEqual(geometry.issues,[],label);
}

try {
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server startup timed out')),30000);
    server.stdout.on('data',chunk=>{if(String(chunk).includes('server ready')){clearTimeout(timer);resolve();}});
    server.on('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited: ${code}`));});
  });
  browser=await webkit.launch({headless:true});
  for(const language of ['fa','en','ru','hy'])for(const viewport of viewports) {
    const context=await browser.newContext({...device,viewport,colorScheme:'light'});
    await context.addInitScript(lang=>{localStorage.setItem('yerevanhub_lang',lang);localStorage.setItem('yerevanhub_theme','light');},language);
    await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    const page=await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror',error=>errors.push(error.message));
    const loaded=page.waitForResponse(response=>response.url()===origin+'/api/app'&&response.request().method()==='GET'&&response.ok());
    await page.goto(`${origin}/${language}/`,{waitUntil:'domcontentloaded'});
    await loaded;
    await page.locator('.home-search-form').waitFor();
    await page.locator('#site-preloader').waitFor({state:'detached'});
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);});
    for(const theme of ['light','dark']) {
      if(theme==='dark')await page.getByTestId('theme-toggle').click();
      for(const kind of ['hostels','rentals']) {
        await page.locator('.search-panel [role="group"] button').nth(kind==='hostels'?0:1).click();
        await inspect(page,`${language}-${viewport.width}-${theme}-${kind}`,language==='fa'&&[768,1024,1366].includes(viewport.width));
      }
    }
    await page.locator('.search-panel [role="group"] button').first().click();
    await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
    await inspect(page,`${language}-${viewport.width}-large-text`);
    await page.evaluate(()=>{document.documentElement.style.fontSize='';});
    const nextCheckIn=await page.locator('#home-checkout').inputValue();
    await page.locator('#home-checkin').fill(nextCheckIn);
    const nextCheckOut=await page.locator('#home-checkout').inputValue();
    assert.ok(nextCheckOut>nextCheckIn,'Changing arrival must keep departure later');
    await page.locator('#home-guests').selectOption('2');
    await page.locator('.home-search-form button[type="submit"]').click();
    await page.waitForURL(url=>url.pathname===`/${language}/hostels`);
    const url=new URL(page.url());
    assert.equal(url.searchParams.get('checkIn'),nextCheckIn);
    assert.equal(url.searchParams.get('checkOut'),nextCheckOut);
    assert.equal(url.searchParams.get('guests'),'2');
    await context.close();
  }
  assert.deepEqual(errors,[],'Uncaught WebKit errors');
  console.log(`PASS ${results.length} iPad WebKit form layouts and ${viewports.length*4} date/search flows`);
} finally {
  await writeFile(path.join(artifacts,'results.json'),JSON.stringify({results,errors},null,2));
  await writeFile(path.join(artifacts,'server.log'),output);
  if(browser)await browser.close();
  server.kill('SIGTERM');
  await rm(directory,{recursive:true,force:true});
}
