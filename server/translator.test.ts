import test from 'node:test';
import assert from 'node:assert/strict';
import { translateOnServer } from './translator.js';

test('server translation uses a mock provider, validates limits, and never disguises failure as source text',async()=>{
  const input={text:'سلام، رزرو دارم.',source:'fa' as const,target:'hy' as const};
  const translated=await translateOnServer(input,async request=>{assert.deepEqual(request,input);return 'Բարև, ամրագրում ունեմ։';});
  assert.equal(translated.text,'Բարև, ամրագրում ունեմ։');assert.equal(translated.isAiGenerated,true);
  await assert.rejects(()=>translateOnServer({...input,text:'x'.repeat(2001)},async()=>''));
  await assert.rejects(()=>translateOnServer(input,async()=>''));
  await assert.rejects(()=>translateOnServer(input,async()=>input.text));
  await assert.rejects(()=>translateOnServer(input,async()=>{throw new Error('provider details must not leak');}),error=>error instanceof Error&&!error.message.includes('provider details'));
});
