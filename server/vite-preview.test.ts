import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {previewSocketsDisabled, previewSocketPlugin} from './vite-preview.js';

test('cloud previews disable sockets with an explicit local override', () => {
  assert.equal(previewSocketsDisabled({}), false);
  assert.equal(previewSocketsDisabled({DISABLE_HMR:'true'}), true);
  assert.equal(previewSocketsDisabled({K_SERVICE:'preview'}), true);
  assert.equal(previewSocketsDisabled({K_SERVICE:'preview',DISABLE_HMR:'false'}), false);
});

test('socket-free preview preserves installed Vite client helpers without initiating its transport', async () => {
  const entry = new URL('../node_modules/vite/dist/client/client.mjs', import.meta.url);
  const code = await readFile(entry, 'utf8');
  const hook = previewSocketPlugin(true).transform as (code:string,id:string)=> {code:string}|undefined;
  const transformed = hook(code, entry.pathname)!;
  assert.ok(transformed.code.includes('function createHotContext'));
  assert.ok(transformed.code.includes('function updateStyle'));
  assert.ok(!transformed.code.includes('transport.connect(createHMRHandler(handleMessage));'));
  assert.equal(hook(code, '/src/main.tsx'), undefined);
  const localHook = previewSocketPlugin(false).transform as typeof hook;
  assert.equal(localHook(code,entry.pathname), undefined);
  assert.throws(()=>hook('changed upstream client',entry.pathname), /compatibility/);
});
