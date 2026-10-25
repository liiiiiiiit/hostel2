import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
} });
const { Store } = await import('./store');

beforeEach(() => storage.clear());

function fixture() {
  const store = new Store();
  store.getState().bookings = [];
  const hostel = store.getHostels()[0];
  const room = hostel.roomTypes[0];
  room.totalBedsOrRooms = 2;
  const data = { hostelId: hostel.id, roomTypeId: room.id, guestName: 'Test Guest', contactType: 'email' as const,
    guestContact: 'test@example.com', checkIn: '2030-01-01', checkOut: '2030-01-03', guestsCount: 1, quantity: 1 };
  return { store, hostel, room, data };
}

async function admin(store: InstanceType<typeof Store>) {
  assert.equal((await store.login('admin@yerevanhub.com', 'Admin@2026')).success, true);
}

test('fresh stores do not mutate imported seed data', () => {
  const first = new Store();
  first.getState().hostels[0].name.en = 'Changed';
  assert.notEqual(new Store().getState().hostels[0].name.en, 'Changed');
});

test('partial or invalid persisted state recovers defaults and drops inactive sessions', () => {
  storage.set('yerevanhub_store_v1', 'null');
  assert.ok(new Store().getHostels().length);
  storage.set('yerevanhub_store_v1', JSON.stringify({ hostels: [{}] }));
  assert.ok(new Store().getHostels().length);
  storage.set('yerevanhub_store_v1', JSON.stringify({ hostels: [], settings: { immediateTimeoutMinutes: -1 } }));
  const store = new Store();
  assert.deepEqual(store.getHostels(), []);
  assert.ok(store.getState().users.length);
  assert.equal(store.getState().settings.immediateTimeoutMinutes, 30);
  const state = store.getState();
  state.users[0].isActive = false;
  state.currentUser = state.users[0];
  storage.set('yerevanhub_store_v1', JSON.stringify(state));
  assert.equal(new Store().getCurrentUser(), null);
});

test('demo login rejects wrong and missing passwords and inactive users', async () => {
  const { store } = fixture();
  assert.equal((await store.login('admin@yerevanhub.com', 'wrong')).success, false);
  assert.equal((await store.login('admin@yerevanhub.com')).success, false);
  assert.equal(store.getCurrentUser(), null);
  await admin(store);
  store.logout();
  store.getState().users[0].isActive = false;
  assert.equal((await store.login('admin@yerevanhub.com', 'Admin@2026')).success, false);
});

test('registration persists a password verifier, validates input and supports login after reload', async () => {
  const store = new Store();
  assert.equal((await store.registerTraveler('', 'bad', undefined, '')).success, false);
  const result = await store.registerTraveler('Alice', ' ALICE@example.com ', undefined, 'unique-password');
  assert.equal(result.success, true);
  assert.ok(!storage.get('yerevanhub_store_v1')!.includes('unique-password'));
  store.logout();
  const restored = new Store();
  assert.equal((await restored.login('alice@example.com', 'wrong')).success, false);
  assert.equal((await restored.login('alice@example.com', 'unique-password')).success, true);
  assert.equal((await restored.registerTraveler('Again', 'alice@example.com', undefined, 'another-password')).success, false);
});

test('admin-created managers use their initial password and cannot manage another hostel', async () => {
  const { store, data } = fixture();
  await admin(store);
  assert.equal((await store.createHostelManager({ name: 'Host', email: 'host@example.com', initialPassword: 'host-password', assignedHostelIds: [data.hostelId] })).success, true);
  const own = store.createBooking(data).booking!;
  const otherHostel = store.getHostels()[1];
  const other = store.createBooking({ ...data, hostelId: otherHostel.id, roomTypeId: otherHostel.roomTypes[0].id }).booking!;
  store.logout();
  assert.equal((await store.login('host@example.com', 'bad')).success, false);
  assert.equal((await store.login('host@example.com', 'host-password')).success, true);
  assert.equal(store.updateBookingStatus(own.id, 'confirmed').success, true);
  assert.equal(store.updateBookingStatus(other.id, 'confirmed').success, false);
  assert.throws(() => store.toggleHostelPublished(data.hostelId));
});

test('booking rejects malformed dates, quantities, contacts and unpublished hostels', () => {
  const { store, hostel, data } = fixture();
  for (const checkIn of ['garbage', '2030-02-30', '2030-1-1']) {
    assert.equal(store.createBooking({ ...data, checkIn }).success, false);
  }
  for (const quantity of [NaN, Infinity, 0, -1, 1.5]) assert.equal(store.createBooking({ ...data, quantity }).success, false);
  assert.equal(store.createBooking({ ...data, guestName: ' ' }).success, false);
  assert.equal(store.createBooking({ ...data, estimatedArrivalTime: '99:00' }).success, false);
  hostel.isPublished = false;
  assert.equal(store.createBooking(data).success, false);
  assert.equal(store.getState().bookings.length, 0);
});

test('capacity uses simultaneous occupancy for creation and confirmation', async () => {
  const { store, data } = fixture();
  await admin(store);
  for (const [checkIn, checkOut] of [['2030-01-01', '2030-01-02'], ['2030-01-02', '2030-01-03']]) {
    const booking = store.createBooking({ ...data, checkIn, checkOut }).booking!;
    assert.equal(store.updateBookingStatus(booking.id, 'confirmed').success, true);
  }
  const spanning = store.createBooking(data);
  assert.equal(spanning.success, true);
  assert.equal(store.updateBookingStatus(spanning.booking!.id, 'confirmed').success, true);
  assert.equal(store.createBooking(data).success, false);
});

test('confirmation rechecks capacity when multiple requests were pending', async () => {
  const { store, room, data } = fixture();
  room.totalBedsOrRooms = 1;
  const first = store.createBooking(data).booking!;
  const second = store.createBooking(data).booking!;
  await admin(store);
  assert.equal(store.updateBookingStatus(first.id, 'confirmed').success, true);
  assert.equal(store.updateBookingStatus(second.id, 'confirmed').success, false);
  assert.equal(second.status, 'pending');
});

test('coupons enforce AMD minimum and release usage exactly once on cancellation or expiry', async () => {
  const { store, room, data } = fixture();
  const coupon = { code: 'TEST', percent: 20, active: true, usedCount: 0, maxUses: 10,
    minAmountAMD: room.pricePerNightAMD * 3, startsAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', description: '' };
  store.getState().coupons = [coupon];
  assert.equal(store.createBooking({ ...data, couponCode: 'TEST' }).success, false);
  coupon.minAmountAMD = 0;
  const one = store.createBooking({ ...data, couponCode: 'TEST' }).booking!;
  const two = store.createBooking({ ...data, couponCode: 'TEST' }).booking!;
  assert.equal(coupon.usedCount, 2);
  assert.equal(store.cancelBookingByGuest(one.privateToken, '').success, true);
  assert.equal(store.cancelBookingByGuest(one.privateToken, '').success, true);
  assert.equal(coupon.usedCount, 1);
  await admin(store);
  assert.equal(store.updateBookingStatus(one.id, 'confirmed').success, false);
  two.expiresAt = '2020-01-01T00:00:00Z';
  assert.equal(store.updateBookingStatus(two.id, 'confirmed').success, false);
  assert.equal(two.status, 'expired');
  assert.equal(coupon.usedCount, 0);
});

test('saved booking charges the same early and overnight fees as the quote', () => {
  const { store, hostel, data } = fixture();
  hostel.earlyCheckInAvailable = true;
  hostel.earlyCheckInFeeAMD = 2000;
  hostel.lateArrivalAvailable = true;
  hostel.lateArrivalFeeAMD = 1000;
  const booking = store.createBooking({ ...data, estimatedArrivalTime: '03:00' }).booking!;
  assert.equal(booking.earlyCheckInFeeAMD, 2000);
  assert.equal(booking.lateCheckInFeeAMD, 1000);
  assert.equal(booking.finalAmountAMD, booking.baseAmountAMD + 3000);
});

test('private tracking requires the exact token and review rejects invalid ratings', async () => {
  const { store, data } = fixture();
  const booking = store.createBooking(data).booking!;
  assert.equal(store.getBookingByToken('invalid'), undefined);
  assert.equal(store.getRentalInquiryByToken('invalid'), undefined);
  assert.equal(store.updateBookingStatus(booking.id, 'confirmed').success, false);
  await admin(store);
  store.updateBookingStatus(booking.id, 'confirmed');
  store.updateBookingStatus(booking.id, 'completed');
  assert.equal(store.cancelBookingByGuest(booking.privateToken, '').success, false);
  assert.equal(store.submitReview(booking.privateToken, NaN, 'Review').success, false);
  assert.equal(store.submitReview(booking.privateToken, 4, '').success, false);
  assert.equal(store.submitReview(booking.privateToken, 4, 'Good stay').success, true);
  assert.equal(store.submitReview(booking.privateToken, 4, 'Again').success, false);
});

test('rental publication toggle affects public listings and hidden listings reject inquiries', async () => {
  const store = new Store();
  const rental = store.getRentals()[0];
  await admin(store);
  store.toggleRentalAvailability(rental.id);
  assert.equal(store.getRentals().some(item => item.id === rental.id), false);
  assert.equal(store.createRentalInquiry({ propertyId: rental.id, guestName: 'Guest', contact: 'test@example.com', requestType: 'visit' }).success, false);
  store.toggleRentalAvailability(rental.id);
  assert.equal(store.getRentals().some(item => item.id === rental.id), true);
});
