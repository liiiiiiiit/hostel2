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

test('invalid calendar dates never pass validation or produce NaN prices', () => {
  for (const checkIn of ['invalid', '2026-02-30', '2026-13-01', '2026-1-1']) {
    assert.equal(calculateNights(checkIn, '2027-01-01'), 0);
    assert.equal(validateBookingDates(checkIn, '2027-01-01').valid, false);
    const price = calculateBookingPrice({ checkIn, checkOut: '2027-01-01', quantity: 1, pricePerNight: 100 });
    assert.equal(price.isValidDates, false);
    assert.equal(price.finalAmountToPayOnArrival, 0);
  }
  assert.equal(calculateNights('2028-02-29', '2028-03-01'), 1);
});

test('invalid prices and quantities are rejected rather than generating a charge', () => {
  const input = { checkIn: '2030-01-01', checkOut: '2030-01-02', quantity: 1, pricePerNight: 100 };
  for (const changes of [{ quantity: 1.5 }, { quantity: Infinity }, { pricePerNight: NaN }, { lateCheckInFee: -10 }]) {
    assert.equal(calculateBookingPrice({ ...input, ...changes }).isValidDates, false);
  }
});

test('coupon date comparisons use instants rather than string order', () => {
  const coupon = { code: 'TEST', percent: 10, active: true, usedCount: 0,
    expiresAt: '2030-01-01T12:00:00+04:00' };
  assert.equal(validateCoupon('TEST', 100, coupon, '2030-01-01T09:00:00Z').valid, false);
  assert.equal(validateCoupon('TEST', 100, { ...coupon, expiresAt: 'invalid' }).valid, false);
});

test('date rates override weekend then base; last matching override wins and checkout is excluded',()=>{
  const rules={minimumNights:1,weekendDays:[6,0],weekendPriceAMD:1200,weeklyDiscountPercent:0,monthlyDiscountPercent:0,overrides:[{id:'first',from:'2030-01-05',to:'2030-01-07',priceAMD:1700},{id:'second',from:'2030-01-06',to:'2030-01-07',priceAMD:2000}]};
  const result=calculateBookingPrice({pricePerNight:1000,quantity:2,checkIn:'2030-01-04',checkOut:'2030-01-08',rules});
  assert.equal(result.isValidDates,true);assert.deepEqual(result.nightlyLines?.map(line=>line.unitPriceAMD),[1000,1700,2000,1000]);assert.equal(result.baseAmount,11400);
  assert.deepEqual(result.nightlyLines?.map(line=>line.source),['base','override','override','base']);
  const weekend=calculateBookingPrice({pricePerNight:1000,quantity:1,checkIn:'2030-01-05',checkOut:'2030-01-06',rules:{...rules,overrides:[]}});assert.equal(weekend.baseAmount,1200);
});

test('long-stay and coupon discounts never stack, fees are excluded and AMD rounding is consistent',()=>{
  const rules={minimumNights:3,weekendDays:[],weeklyDiscountPercent:10,monthlyDiscountPercent:20,overrides:[]};
  assert.equal(calculateBookingPrice({pricePerNight:1001,quantity:1,checkIn:'2030-01-01',checkOut:'2030-01-03',rules}).isValidDates,false);
  const weekly=calculateBookingPrice({pricePerNight:1001,quantity:1,checkIn:'2030-01-01',checkOut:'2030-01-08',rules,discountPercent:5,earlyCheckInFee:500});
  assert.equal(weekly.discountSource,'weekly');assert.equal(weekly.discountAmount,701);assert.equal(weekly.finalAmountToPayOnArrival,6806);
  const monthly=calculateBookingPrice({pricePerNight:1001,quantity:1,checkIn:'2030-01-01',checkOut:'2030-01-29',rules,discountPercent:20});assert.equal(monthly.discountSource,'coupon');assert.equal(monthly.discountPercent,20);
  const withoutCoupon=calculateBookingPrice({pricePerNight:1001,quantity:1,checkIn:'2030-01-01',checkOut:'2030-01-29',rules});assert.equal(withoutCoupon.discountSource,'monthly');
});
