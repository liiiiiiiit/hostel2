import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {Database} from './database.js';
import {createApi} from './api.js';

test('temporary production HTTP VPS session survives authenticated requests and logout', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'yh-http-vps-'));
  const database=new Database({url:`file:${directory}/test.db`,demo:false,adminEmail:'owner@example.test',adminPassword:'test-only-password-123'});
  const saved={NODE_ENV:process.env.NODE_ENV,HTTP_TEST_MODE:process.env.HTTP_TEST_MODE,APP_URL:process.env.APP_URL,VERCEL:process.env.VERCEL};
  let app:ReturnType<typeof createApi>;
  try {
    process.env.NODE_ENV='production';process.env.HTTP_TEST_MODE='true';process.env.APP_URL='http://127.0.0.1';delete process.env.VERCEL;
    app=createApi(database);
  } finally {
    for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  const server=app!.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await database.close();await rm(directory,{recursive:true,force:true});});
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/app`;
  const action=(action:string,args:unknown[],cookie='')=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'YerevanHub',Origin:new URL(url).origin,cookie},body:JSON.stringify({action,args})});
  const login=await action('login',['owner@example.test','test-only-password-123']);
  assert.equal((await login.json()).success,true);
  const header=login.headers.get('set-cookie')!;
  assert.match(header,/^yh_session=/);assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Lax/);assert.doesNotMatch(header,/; Secure/);
  const cookie=header.split(';')[0];
  const account=await(await fetch(url,{headers:{cookie}})).json();
  assert.equal(account.state.currentUser.role,'admin');assert.equal(account.state.demoMode,false);
  const logout=await action('logout',[],cookie);assert.equal((await logout.json()).success,true);assert.match(logout.headers.get('set-cookie')!,/^yh_session=;/);
  assert.equal((await(await fetch(url,{headers:{cookie}})).json()).state.currentUser,null);
});
