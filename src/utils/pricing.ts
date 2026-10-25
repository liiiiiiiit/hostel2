/**
 * YEREVANHUB - Pure Booking, Pricing, Discount, and Arrival Logic
 * Decoupled for fast, deterministic unit testing with node:test
 */

export interface PricingInput {
  pricePerNight: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  quantity: number; // beds or rooms
  discountPercent?: number; // 0 to 100
  earlyCheckInFee?: number;
  lateCheckInFee?: number;
  extraServicesFee?: number;
}

export interface PricingResult {
  nights: number;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  stayAmountAfterDiscount: number;
  extraFees: number;
  finalAmountToPayOnArrival: number;
  isValidDates: boolean;
  errorMessage?: string;
}

/**
 * Calculates the number of nights between checkIn and checkOut dates.
 * Check-out date is not counted as a night of stay.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = parseCalendarDate(checkIn);
  const outDate = parseCalendarDate(checkOut);
  if (inDate === null || outDate === null) return 0;
  const diffTime = outDate - inDate;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function parseCalendarDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp;
}

/** Maximum simultaneous occupancy, with checkout releasing capacity that day. */
export function peakBookedQuantity(checkIn: string, checkOut: string, bookings: { checkIn: string; checkOut: string; quantity: number }[]): number {
  const events: { date: string; delta: number }[] = [];
  for (const booking of bookings) {
    if (!areDatesOverlapping(checkIn, checkOut, booking.checkIn, booking.checkOut)) continue;
    events.push({ date: booking.checkIn < checkIn ? checkIn : booking.checkIn, delta: booking.quantity });
    events.push({ date: booking.checkOut > checkOut ? checkOut : booking.checkOut, delta: -booking.quantity });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.delta - b.delta);
  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

/**
 * Validates date ordering. Check-out must be after check-in.
 */
export function validateBookingDates(checkIn: string, checkOut: string): { valid: boolean; error?: string } {
  if (!checkIn || !checkOut) {
    return { valid: false, error: 'تاریخ ورود و خروج الزامی است.' };
  }
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    return { valid: false, error: 'تاریخ خروج باید بعد از تاریخ ورود باشد (حداقل ۱ شب).' };
  }
  return { valid: true };
}

/**
 * Applies percentage discount to accommodation base price only.
 * Extra services and late/early arrival fees are never discounted.
 * All prices rounded to nearest whole Armenian Dram (AMD / ֏).
 */
export function calculateBookingPrice(input: PricingInput): PricingResult {
  const nights = calculateNights(input.checkIn, input.checkOut);
  if (nights <= 0 || !Number.isFinite(input.pricePerNight) || input.pricePerNight < 0 ||
      !Number.isInteger(input.quantity) || input.quantity < 1 ||
      [input.discountPercent, input.earlyCheckInFee, input.lateCheckInFee, input.extraServicesFee]
        .some(value => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    return {
      nights: 0,
      baseAmount: 0,
      discountPercent: 0,
      discountAmount: 0,
      stayAmountAfterDiscount: 0,
      extraFees: 0,
      finalAmountToPayOnArrival: 0,
      isValidDates: false,
      errorMessage: 'تاریخ، تعداد یا مبلغ اقامت معتبر نیست.',
    };
  }

  const quantity = Math.max(1, input.quantity || 1);
  const baseAmount = Math.round(input.pricePerNight * quantity * nights);

  const discountPercent = Math.min(100, Math.max(0, input.discountPercent || 0));
  const discountAmount = Math.round((baseAmount * discountPercent) / 100);
  const stayAmountAfterDiscount = Math.max(0, baseAmount - discountAmount);

  const extraFees = Math.round(
    (input.earlyCheckInFee || 0) +
    (input.lateCheckInFee || 0) +
    (input.extraServicesFee || 0)
  );

  const finalAmountToPayOnArrival = stayAmountAfterDiscount + extraFees;

  return {
    nights,
    baseAmount,
    discountPercent,
    discountAmount,
    stayAmountAfterDiscount,
    extraFees,
    finalAmountToPayOnArrival,
    isValidDates: true,
  };
}

/**
 * Validates a promo coupon against booking parameters.
 */
export interface CouponRule {
  code: string;
  percent: number;
  active: boolean;
  minAmount?: number;
  minAmountAMD?: number;
  maxUses?: number;
  usedCount: number;
  startsAt?: string;
  expiresAt?: string;
}

export function validateCoupon(
  code: string,
  baseAccommodationAmount: number,
  coupon: CouponRule | null | undefined,
  currentDateIso: string = new Date().toISOString()
): { valid: boolean; discountPercent: number; message: string } {
  if (!code || !code.trim()) {
    return { valid: false, discountPercent: 0, message: 'کد تخفیف وارد نشده است.' };
  }

  if (!coupon) {
    return { valid: false, discountPercent: 0, message: 'کد تخفیف نامعتبر است.' };
  }

  const cleanCode = code.trim().toUpperCase();
  if (coupon.code.toUpperCase() !== cleanCode) {
    return { valid: false, discountPercent: 0, message: 'کد تخفیف مطابقت ندارد.' };
  }

  if (!coupon.active) {
    return { valid: false, discountPercent: 0, message: 'این کد تخفیف غیرفعال شده است.' };
  }

  const now = Date.parse(currentDateIso);
  if (!Number.isFinite(now) || !Number.isFinite(baseAccommodationAmount) || baseAccommodationAmount < 0 ||
      !Number.isFinite(coupon.percent) || coupon.percent < 0 || coupon.percent > 100 ||
      (coupon.startsAt && !Number.isFinite(Date.parse(coupon.startsAt))) ||
      (coupon.expiresAt && !Number.isFinite(Date.parse(coupon.expiresAt)))) {
    return { valid: false, discountPercent: 0, message: 'اطلاعات کد تخفیف معتبر نیست.' };
  }

  if (coupon.startsAt && now < Date.parse(coupon.startsAt)) {
    return { valid: false, discountPercent: 0, message: 'مهلت استفاده از این کد هنوز آغاز نشده است.' };
  }

  if (coupon.expiresAt && now >= Date.parse(coupon.expiresAt)) {
    return { valid: false, discountPercent: 0, message: 'مهلت استفاده از این کد تخفیف به پایان رسیده است.' };
  }

  if (coupon.maxUses !== undefined && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountPercent: 0, message: 'سقف استفاده از این کد تخفیف تکمیل شده است.' };
  }

  const minimum = coupon.minAmountAMD ?? coupon.minAmount ?? 0;
  if (minimum > 0 && baseAccommodationAmount < minimum) {
    return {
      valid: false,
      discountPercent: 0,
      message: `حداقل مبلغ اقامت برای این کد ${minimum.toLocaleString()} درام است.`,
    };
  }

  return {
    valid: true,
    discountPercent: coupon.percent,
    message: `کد تخفیف با موفقیت اعمال شد (${coupon.percent}٪ تخفیف اقامت).`,
  };
}

/**
 * Determines overnight arrival logic (e.g. arriving at 03:00 AM in Yerevan).
 * If user arrives at early morning (between 00:00 and 07:00), they must choose:
 * - Option A: Urgent immediate bed usage (starts from yesterday's night, checkout is today 11:00 AM or tomorrow)
 * - Option B: Normal check-in today at 14:00 (with free luggage drop and waiting lounge in morning)
 */
export function analyzeArrivalHour(arrivalHour: number): {
  isOvernightArrival: boolean;
  isEarlyMorning: boolean;
  recommendation: 'need_previous_night_or_early_checkin' | 'standard_checkin' | 'regular_evening';
  explanationFa: string;
} {
  if (arrivalHour >= 0 && arrivalHour < 6) {
    return {
      isOvernightArrival: true,
      isEarlyMorning: true,
      recommendation: 'need_previous_night_or_early_checkin',
      explanationFa: 'ورود در بامداد (بین نیمه‌شب تا ۶ صبح): برای استفاده فوری از تخت خواب، باید رزرو از شب گذشته ثبت شود یا هاستل ورود زودهنگام فوری را تأیید کند. در غیر این صورت تحویل تخت در ساعت ۱۴:۰۰ است و می‌توانید از انبار چمدان و لابی استفاده کنید.',
    };
  } else if (arrivalHour >= 6 && arrivalHour < 12) {
    return {
      isOvernightArrival: false,
      isEarlyMorning: true,
      recommendation: 'standard_checkin',
      explanationFa: 'ورود در صبح زود: تحویل اتاق معمولاً ساعت ۱۴:۰۰ است. می‌توانید چمدان خود را رایگان تحویل دهید و در لابی استراحت کنید تا تخت آماده شود.',
    };
  }

  return {
    isOvernightArrival: false,
    isEarlyMorning: false,
    recommendation: 'regular_evening',
    explanationFa: 'ساعت ورود استاندارد هاستل (از ۱۴:۰۰ به بعد).',
  };
}

/**
 * Checks date range intersection between two bookings.
 */
export function areDatesOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}
