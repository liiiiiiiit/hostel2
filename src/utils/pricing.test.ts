import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNights,
  validateBookingDates,
  calculateBookingPrice,
  validateCoupon,
  analyzeArrivalHour,
  areDatesOverlapping,
} from './pricing';

test('calculateNights correctly counts nights excluding checkout day', () => {
  assert.equal(calculateNights('2026-10-22', '2026-10-25'), 3);
  assert.equal(calculateNights('2026-10-22', '2026-10-23'), 1);
  assert.equal(calculateNights('2026-10-22', '2026-10-22'), 0);
});

test('validateBookingDates enforces checkout strictly after checkin', () => {
  assert.equal(validateBookingDates('2026-10-22', '2026-10-25').valid, true);
  assert.equal(validateBookingDates('2026-10-25', '2026-10-22').valid, false);
  assert.equal(validateBookingDates('2026-10-22', '2026-10-22').valid, false);
});

test('calculateBookingPrice computes base amount, discounts, and excludes extra fees from discount', () => {
  // Scenario: 2 nights at 20,000 AMD/night for 1 room = 40,000 AMD
  // 20% discount = 8,000 AMD discount -> stay after discount = 32,000 AMD
  // Extra fee (late checkin): 2,000 AMD
  // Total to pay at hostel: 34,000 AMD
  const result = calculateBookingPrice({
    pricePerNight: 20000,
    checkIn: '2026-10-22',
    checkOut: '2026-10-24',
    quantity: 1,
    discountPercent: 20,
    lateCheckInFee: 2000,
  });

  assert.equal(result.nights, 2);
  assert.equal(result.baseAmount, 40000);
  assert.equal(result.discountPercent, 20);
  assert.equal(result.discountAmount, 8000);
  assert.equal(result.stayAmountAfterDiscount, 32000);
  assert.equal(result.extraFees, 2000);
  assert.equal(result.finalAmountToPayOnArrival, 34000);
});

test('validateCoupon checks code case, active status, min amount, and usage limit', () => {
  const coupon = {
    code: 'YEREVAN20',
    percent: 20,
    active: true,
    minAmount: 30000,
    maxUses: 10,
    usedCount: 2,
    startsAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
  };

  // Valid usage with lower case and trimming
  const validRes = validateCoupon('  yerevan20  ', 40000, coupon, '2026-10-22T10:00:00Z');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.discountPercent, 20);

  // Fails below minimum stay amount
  const lowAmountRes = validateCoupon('YEREVAN20', 25000, coupon, '2026-10-22T10:00:00Z');
  assert.equal(lowAmountRes.valid, false);

  // Fails when inactive
  const inactiveRes = validateCoupon('YEREVAN20', 40000, { ...coupon, active: false });
  assert.equal(inactiveRes.valid, false);

  // Fails when quota reached
  const quotaRes = validateCoupon('YEREVAN20', 40000, { ...coupon, usedCount: 10 });
  assert.equal(quotaRes.valid, false);

  // Fails when expired
  const expiredRes = validateCoupon('YEREVAN20', 40000, coupon, '2027-01-01T00:00:00Z');
  assert.equal(expiredRes.valid, false);
});

test('analyzeArrivalHour handles midnight 03:00 vs afternoon 15:00 arrival', () => {
  const midnightArrival = analyzeArrivalHour(3);
  assert.equal(midnightArrival.isOvernightArrival, true);
  assert.equal(midnightArrival.recommendation, 'need_previous_night_or_early_checkin');

  const regularArrival = analyzeArrivalHour(15);
  assert.equal(regularArrival.isOvernightArrival, false);
  assert.equal(regularArrival.recommendation, 'regular_evening');
});

test('areDatesOverlapping properly flags colliding date ranges', () => {
  // Booking 1: Oct 20 to Oct 25
  // Booking 2: Oct 24 to Oct 28 -> overlaps on Oct 24
  assert.equal(areDatesOverlapping('2026-10-20', '2026-10-25', '2026-10-24', '2026-10-28'), true);

  // Booking 3: Oct 25 to Oct 30 -> does NOT overlap with Oct 20-25 because Oct 25 is checkout
  assert.equal(areDatesOverlapping('2026-10-20', '2026-10-25', '2026-10-25', '2026-10-30'), false);
});
