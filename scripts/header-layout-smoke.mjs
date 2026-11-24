import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const directory=await mkdtemp(path.join(tmpdir(),'yh-header-'));
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin=`http://127.0.0.1:${port}`;let browser,output='',cases=0;const errors=[];
const server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),DATABASE_URL:`file:${directory}/test.db`,DATABASE_AUTH_TOKEN:'',DEMO_MODE:'true',NODE_ENV:'development',APP_URL:origin,SERVE_BUILT_CLIENT:'true',DISABLE_HMR:'true',ADMIN_EMAIL:'',ADMIN_PASSWORD:'',GEMINI_API_KEY:'',RESEND_API_KEY:'',TELEGRAM_BOT_TOKEN:''}});
server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
try{
 for(let i=0;!output.includes('server ready');i++){if(i===150||server.exitCode!==null)throw Error(output||'Startup timed out');await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 for(const language of ['fa','en','ru','hy'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.addInitScript(({language,theme,origin})=>{if(location.origin!==origin)return;localStorage.setItem('yerevanhub_lang',language);localStorage.setItem('yerevanhub_theme',theme);},{language,theme,origin});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${origin}/${language}/services`);await p.locator('#site-preloader').waitFor({state:'detached'});
  for(const width of [320,390,639,640,768,820,980,1023,1024,1280,1366,1439,1440,1600]){
   await p.setViewportSize({width,height:900});const header=p.locator('.header-inner'),menu=p.locator('.header-menu-toggle');
   assert(await header.isVisible());const r=await header.evaluate(el=>{const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};return{header:box(el),menu:box(el.querySelector('.header-menu-toggle')),brand:box(el.querySelector('.header-brand')),controls:box(el.querySelector('.header-controls')),direction:getComputedStyle(el).direction,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   assert.equal(r.overflow,false,`${language}/${theme}/${width}: overflow`);
   if(width<1440){assert(await menu.isVisible());assert(r.menu.width>=43,`${language}/${width}: touch target`);if(width>=640){const gap=language==='fa'?r.header.right-r.menu.right:r.menu.left-r.header.left;assert(gap>=20&&gap<=28,`${language}/${theme}/${width}: menu is ${gap}px from its intended outer edge`);const between=language==='fa'?r.menu.left-r.brand.right:r.brand.left-r.menu.right;assert(between>=12,`${language}/${width}: menu overlaps brand`);}if(width<640){assert(language==='fa'?r.menu.left>r.brand.right:r.menu.right<r.brand.left,`${language}/${width}: mobile order changed`);}
    await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');assert(await p.locator('#mobile-navigation').isVisible());await p.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert(await menu.evaluate(el=>el===document.activeElement));
   }else{assert(!await menu.isVisible());assert(await p.locator('.desktop-navigation').isVisible());}
   cases++;
  }
  if(theme==='light'&&['fa','en'].includes(language)){await mkdir('test-artifacts/header',{recursive:true});for(const width of [980,1366]){await p.setViewportSize({width,height:900});await p.screenshot({path:`test-artifacts/header/${language}-desktop-${width}.png`});}}
  await context.close();
 }
 // Chrome's desktop-site layout on a phone may use a 980px CSS viewport.
 const phone=await browser.newContext({viewport:{width:980,height:740},screen:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true});
 await phone.addInitScript(origin=>{if(location.origin!==origin)return;localStorage.setItem('yerevanhub_lang','fa');localStorage.setItem('yerevanhub_theme','dark');},origin);
 await phone.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const touchPage=await phone.newPage();touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto(origin+'/fa/services');await touchPage.locator('#site-preloader').waitFor({state:'detached'});
 const cssWidth=await touchPage.evaluate(()=>innerWidth),button=touchPage.locator('.header-menu-toggle'),rect=await button.boundingBox();assert.equal(cssWidth,980);assert(rect);assert(Math.abs(cssWidth-rect.x-rect.width-24)<=1,'Phone desktop-site menu must be at the right edge');
 await mkdir('test-artifacts/header',{recursive:true});await touchPage.screenshot({path:'test-artifacts/header/fa-phone-desktop-980.png'});await button.tap();assert.equal(await button.getAttribute('aria-expanded'),'true');assert(await touchPage.locator('#mobile-navigation').isVisible());await button.tap();assert.equal(await button.getAttribute('aria-expanded'),'false');await phone.close();
 console.log('PASS phone desktop-site emulation: 980px CSS viewport, RTL edge placement and touch menu interaction');
 assert.deepEqual(errors,[]);console.log(`PASS ${cases} header layouts: four languages, two themes, fourteen widths; tablet/desktop edge alignment, mobile order, menu opening/Escape/focus and wide-screen navigation`);
}finally{if(browser)await browser.close();if(server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}await rm(directory,{recursive:true,force:true});}
