import test from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarDays, yerevanToday } from './dates';

test('booking defaults use the Yerevan day at UTC midnight boundaries', () => {
  assert.equal(yerevanToday(new Date('2030-01-01T21:00:00Z')), '2030-01-02');
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addCalendarDays('2030-12-31', 1), '2031-01-01');
});
