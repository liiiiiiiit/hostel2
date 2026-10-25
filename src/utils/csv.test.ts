import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv';

test('CSV preserves quotes, commas, newlines, Unicode and hash characters', () => {
  assert.equal(toCsv([['Ali, "Guest"', 'line1\nline2', 'Երևան #1', 123]]),
    '"Ali, ""Guest""","line1\nline2","Երևան #1","123"');
});

test('CSV neutralizes spreadsheet formulas in untrusted text but keeps numbers', () => {
  assert.equal(toCsv([['=1+1', '+37491', ' @SUM(A1)', -100]]),
    '"\'=1+1","\'+37491","\' @SUM(A1)","-100"');
});
