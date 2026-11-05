import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createRequestId } from './request-id';

test('booking IDs remain unique UUIDs when randomUUID is unavailable on HTTP', () => {
  const crypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } as Pick<Crypto, 'getRandomValues'>;
  const ids = Array.from({length:100}, () => createRequestId(crypto));
  assert.equal(new Set(ids).size, 100);
  ids.forEach(id => assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
});

test('native UUID generation remains preferred when available', () => {
  let nativeCalls = 0;
  const result = createRequestId({ randomUUID: () => { nativeCalls++; return '00000000-0000-4000-8000-000000000000'; }, getRandomValues: () => { throw new Error('fallback should not run'); } });
  assert.equal(nativeCalls,1);
  assert.equal(result,'00000000-0000-4000-8000-000000000000');
});
