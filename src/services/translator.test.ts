import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText } from './translator.js';
test('offline phrases work without a network; free text does not get replaced by an unrelated substring',async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let called=0;
  globalThis.fetch=async()=>{called++;return new Response(JSON.stringify({success:false,error:'Translation not configured'}),{status:503,headers:{'Content-Type':'application/json'}});};
  assert.equal((await translateText('Hello','en','fa','en')).text,'سلام');assert.equal(called,0);
  await assert.rejects(()=>translateText('Hello, I need a room tomorrow','en','hy','en'),/not configured/);assert.equal(called,1);
  await assert.rejects(()=>translateText('x'.repeat(2001),'en','hy','en'),/2,000/);assert.equal(called,1);
});
