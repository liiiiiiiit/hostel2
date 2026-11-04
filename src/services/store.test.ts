import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { ApiStore } from './store';
import type { ClientState, User } from '../types';

function fixture(t: TestContext) {
  const store = new ApiStore();
  const requests: { init: RequestInit; resolve: (response: Response) => void }[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: 'en' } } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => new Promise<Response>(resolve => requests.push({ init, resolve })));
  const state = (currentUser: User | null): ClientState => ({ ...structuredClone(store.getState()), currentUser });
  const user: User = { id: 'traveler', name: 'Guest', email: 'guest@example.test', role: 'traveler', isActive: true, createdAt: new Date().toISOString() };
  const reply = (index: number, data: unknown) => requests[index].resolve(Response.json(data));
  return { store, requests, state, user, reply };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test('polling during login cannot discard the authenticated state', async t => {
  const { store, requests, state, user, reply } = fixture(t);
  const login = store.login(user.email, 'Password-42');
  await tick();
  const poll = store.refresh();
  await tick();
  reply(0, { success: true, user, state: state(user) });
  assert.equal((await login).success, true);
  assert.equal(store.getCurrentUser()?.id, user.id);
  await tick();
  assert.equal(requests[1].init.method, undefined);
  reply(1, { state: state(user) });
  await poll;
});

test('an older anonymous refresh cannot replace a completed login', async t => {
  const { store, state, user, reply } = fixture(t);
  const poll = store.refresh();
  await tick();
  const anonymous = state(null);
  const login = store.login(user.email, 'Password-42');
  await tick();
  reply(1, { success: true, user, state: state(user) });
  await login;
  reply(0, { state: anonymous });
  await poll;
  assert.equal(store.getCurrentUser()?.id, user.id);
});

test('mutations run in order and a failed mutation does not block subsequent writes', async t => {
  const { store, requests, state, user, reply } = fixture(t);
  const login = store.login(user.email, 'Password-42');
  const logout = store.logout();
  await tick();
  assert.equal(requests.length, 1);
  reply(0, { success: false, error: 'Try again' });
  assert.equal((await login).success, false);
  await tick();
  assert.equal(JSON.parse(String(requests[1].init.body)).action, 'logout');
  reply(1, { success: true, state: state(null) });
  assert.equal((await logout).success, true);
});

test('leaving private tracking prevents a late mutation response from restoring its state', async t => {
  const { store, requests, state, reply } = fixture(t);
  const tracked = store.track('private-booking-token');
  await tick();
  reply(0, { state: state(null) });
  await tracked;
  const privateState = state(null);
  privateState.settings.emergencyHotline = 'private-response-marker';
  const mutation = store.action('reportEntranceIssue', ['private-booking-token', 'Please help']);
  await tick();
  const leaving = store.track();
  await tick();
  reply(1, { success: true, state: privateState });
  await mutation;
  assert.notEqual(store.getState().settings.emergencyHotline, 'private-response-marker');
  await tick();
  assert.equal((requests[2].init.headers as Record<string, string>)['X-Booking-Token'], '');
  reply(2, { state: state(null) });
  await leaving;
});
