import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingTrackingView } from '../views/BookingTrackingView';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_BOOKINGS, INITIAL_HOSTELS } from '../../server/seed';
import type { BookingStatus } from '../types';
function render(status: BookingStatus) {
  const booking={...structuredClone(INITIAL_BOOKINGS[0]),status};
  return renderToStaticMarkup(createElement(LanguageProvider,{children:createElement(BookingTrackingView,{booking,hostel:INITIAL_HOSTELS[0],currentLang:'en',onNavigate:()=>{}})}));
}
test('tracking exposes booking tools for pending and terminal statuses, outside the confirmed status badge', () => {
  for(const status of ['pending','confirmed','rejected','expired','completed','cancelled','no_show'] as const) assert.ok(render(status).includes('data-testid="booking-workflow"'),`${status}: tracking tools are reachable`);
  const confirmed=render('confirmed');
  assert.ok(confirmed.indexOf('data-testid="booking-workflow"')>confirmed.indexOf('Booking Confirmed'));
});
test('rejected and expired reservations expose alternative stays while active reservations do not', () => {
  for(const status of ['rejected','expired'] as const) assert.ok(render(status).includes('data-testid="booking-alternatives"'));
  for(const status of ['pending','confirmed','completed'] as const) assert.ok(!render(status).includes('data-testid="booking-alternatives"'));
});
