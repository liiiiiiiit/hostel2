import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHash } from './navigation';
test('navigation preserves searches, detail identifiers and private links on reload', () => {
  const hash = routeHash('hostel-detail', { id: 'hostel-2', checkIn: '2030-01-01', checkOut: '2030-01-03', guests: 2, city: 'Yerevan' });
  assert.deepEqual(parseRoute(hash), { view: 'hostel-detail', params: { city: 'Yerevan', checkIn: '2030-01-01', checkOut: '2030-01-03', guests: 2, id: 'hostel-2' } });
  assert.deepEqual(parseRoute('#/booking/yvn-trk-private'), { view: 'booking-track', params: { token: 'yvn-trk-private' } });
  assert.equal(parseRoute(routeHash('manager')).view, 'manager');
});
test('malformed links are unavailable and invalid search inputs cannot crash date controls', () => {
  for (const hash of ['#/hostel/%ZZ', '#/unknown', '#/booking/', '#/booking/token/extra']) assert.equal(parseRoute(hash).view, 'not-found');
  const parsed = parseRoute('#/hostels?guests=Infinity&checkIn=2030-02-30&checkOut=nope');
  assert.deepEqual(parsed.params, { guests: 1 });
});
