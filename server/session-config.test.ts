import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionCookiePolicy} from './session-config.js';

test('production cookies stay HTTPS-only unless HTTP testing is explicitly configured', () => {
  assert.deepEqual(sessionCookiePolicy({NODE_ENV:'production'}), {secure:true,name:'__Host-yh_session'});
  assert.deepEqual(sessionCookiePolicy({NODE_ENV:'production',APP_URL:'http://192.0.2.1'}), {secure:true,name:'__Host-yh_session'});
  assert.deepEqual(sessionCookiePolicy({NODE_ENV:'production',HTTP_TEST_MODE:'true',APP_URL:'http://192.0.2.1'}), {secure:false,name:'yh_session'});
  assert.deepEqual(sessionCookiePolicy({NODE_ENV:'development'}), {secure:false,name:'yh_session'});
  for(const env of [
    {HTTP_TEST_MODE:'true'},
    {HTTP_TEST_MODE:'true',APP_URL:'https://example.test'},
    {HTTP_TEST_MODE:'true',APP_URL:'http://user:pass@example.test'},
    {HTTP_TEST_MODE:'true',APP_URL:'http://example.test',VERCEL:'1'},
  ]) assert.throws(()=>sessionCookiePolicy(env), /HTTP_TEST_MODE/);
});
