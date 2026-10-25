import { addCalendarDays } from '../src/utils/dates';
import { createPasswordCredential, verifyPassword, type PasswordCredential } from './passwords';
import {
  Hostel,
  RentalProperty,
  Coupon,
  Review,
  Article,
  TravelPhrase,
  User,
  Booking,
  RentalInquiry,
  AuditLog,
  BookingStatus,
  RentalInquiryStatus,
} from '../src/types/index';
import {
  INITIAL_HOSTELS,
  INITIAL_RENTALS,
  INITIAL_COUPONS,
  INITIAL_BOOKINGS,
  INITIAL_REVIEWS,
  INITIAL_RENTAL_INQUIRIES,
  INITIAL_ARTICLES,
  INITIAL_PHRASES,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
} from './seed';
import {
  calculateNights,
  calculateBookingPrice,
  validateCoupon,
  areDatesOverlapping,
  peakBookedQuantity,
  analyzeArrivalHour,
} from '../src/utils/pricing';

const STORAGE_KEY = 'yerevanhub_store_v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Validate fields used by the UI before accepting an older or damaged snapshot.
function validStoredItem(collection: string, value: unknown): boolean {
  if (!isRecord(value)) return false;
  const strings: Record<string, string[]> = {
    users: ['id', 'email', 'name', 'role'], hostels: ['id', 'slug', 'city', 'district'],
    rentals: ['id', 'slug', 'status', 'city', 'neighborhood'], coupons: ['code', 'startsAt', 'expiresAt'],
    bookings: ['id', 'privateToken', 'trackingCode', 'hostelId', 'roomTypeId', 'guestName', 'guestContact', 'checkIn', 'checkOut', 'status', 'expiresAt'],
    reviews: ['id', 'hostelId', 'status', 'comment'], rentalInquiries: ['id', 'privateToken', 'propertyId', 'status'],
    articles: ['id', 'slug', 'title', 'category', 'content', 'status'], phrases: ['id', 'category', 'fa', 'en', 'ru', 'hy'],
    auditLogs: ['id', 'timestamp', 'actorName', 'action', 'details'],
  };
  if (!strings[collection]?.every(key => typeof value[key] === 'string')) return false;
  if (collection === 'hostels') {
    return isRecord(value.name) && isRecord(value.address) && isRecord(value.amenities) && isRecord(value.rules) &&
      Array.isArray(value.photos) && Array.isArray(value.languagesSpoken) && Array.isArray(value.roomTypes) &&
      value.roomTypes.every(room => isRecord(room) && typeof room.id === 'string' && isRecord(room.name) &&
        Number.isSafeInteger(room.totalBedsOrRooms) && Number.isFinite(room.pricePerNightAMD));
  }
  if (collection === 'rentals') return isRecord(value.title) && isRecord(value.amenities) && isRecord(value.utilitiesBreakdown) && Array.isArray(value.photos);
  if (collection === 'articles') return Array.isArray(value.tags) && Array.isArray(value.sources);
  if (collection === 'users') return typeof value.isActive === 'boolean' && ['admin', 'hostel_manager', 'traveler'].includes(value.role as string);
  if (collection === 'bookings') return calculateNights(value.checkIn as string, value.checkOut as string) > 0 && Number.isSafeInteger(value.quantity) && (value.quantity as number) > 0;
  return true;
}

export interface AppStoreState {
  users: User[];
  capacities: import('../src/types/index').CapacityOverride[];
  credentials: Record<string, PasswordCredential>;
  currentUser: User | null;
  hostels: Hostel[];
  rentals: RentalProperty[];
  coupons: Coupon[];
  bookings: Booking[];
  reviews: Review[];
  rentalInquiries: RentalInquiry[];
  articles: Article[];
  phrases: TravelPhrase[];
  auditLogs: AuditLog[];
  settings: {
    emergencyHotline: string;
    telegramSupport: string;
    supportWorkingHoursFa: string;
    immediateTimeoutMinutes: number;
  };
}

export class Store {
  private state: AppStoreState;
  private listeners: (() => void)[] = [];

  constructor(state?: AppStoreState, private detached = false) {
    this.state = state ? structuredClone(state) : this.loadState();
    this.state.capacities ??= [];
  }

  private loadState(): AppStoreState {
    const defaults: AppStoreState = structuredClone({
      capacities: [],
      credentials: {},
      users: INITIAL_USERS,
      currentUser: null,
      hostels: INITIAL_HOSTELS,
      rentals: INITIAL_RENTALS,
      coupons: INITIAL_COUPONS,
      bookings: INITIAL_BOOKINGS,
      reviews: INITIAL_REVIEWS,
      rentalInquiries: INITIAL_RENTAL_INQUIRIES,
      articles: INITIAL_ARTICLES,
      phrases: INITIAL_PHRASES,
      auditLogs: INITIAL_AUDIT_LOGS,
      settings: {
        emergencyHotline: '+374 91 999 000',
        telegramSupport: '@YerevanHubSupport',
        supportWorkingHoursFa: 'پشتیبانی مقیم ایروان: شبانه‌روزی (۲۴/۷) برای ورودهای اضطراری، ساعت پاسخگویی عمومی ۸:۰۰ تا ۲۳:۰۰ به وقت ایروان',
        immediateTimeoutMinutes: 30,
      },
    });
    try {
      const stored = typeof localStorage !== 'undefined' && !this.detached ? localStorage.getItem(STORAGE_KEY) : null;
      if (!stored) return defaults;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
      for (const key of ['users', 'hostels', 'rentals', 'coupons', 'bookings', 'reviews', 'rentalInquiries', 'articles', 'phrases', 'auditLogs'] as const) {
        if (Array.isArray(parsed[key]) && parsed[key].every((item: unknown) => validStoredItem(key, item))) {
          (defaults[key] as unknown[]) = parsed[key];
        }
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        for (const key of Object.keys(defaults.settings) as (keyof AppStoreState['settings'])[]) {
          const value = parsed.settings[key];
          if (typeof value === typeof defaults.settings[key] &&
              (typeof value !== 'number' || (Number.isFinite(value) && value > 0))) {
            Object.assign(defaults.settings, { [key]: value });
          }
        }
      }
      if (parsed.credentials && typeof parsed.credentials === 'object' && !Array.isArray(parsed.credentials)) {
        for (const [id, credential] of Object.entries(parsed.credentials)) {
          const value = credential as PasswordCredential;
          if (value && typeof value.salt === 'string' && value.salt.length > 0 && typeof value.hash === 'string' && /^[a-f0-9]{64}$/.test(value.hash)) defaults.credentials[id] = value;
        }
      }
      defaults.currentUser = defaults.users.find(user => user.id === parsed.currentUser?.id && user.isActive) ?? null;
      return defaults;
    } catch (error) {
      console.warn('Could not read local store, using default seed:', error);
      return defaults;
    }
  }

  private persist() {
    try {
      if (!this.detached && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  // State Getters
  public getState(): AppStoreState {
    return this.state;
  }

  public getCurrentUser(): User | null {
    return this.state.currentUser;
  }

  public getHostels(): Hostel[] {
    return this.state.hostels.filter(h => h.isPublished);
  }

  public getAllHostelsForAdmin(): Hostel[] {
    return this.state.hostels;
  }

  public getHostelByIdOrSlug(idOrSlug: string): Hostel | undefined {
    return this.state.hostels.find(h => h.id === idOrSlug || h.slug === idOrSlug);
  }

  public getHostelAverageRating(hostelId: string): { avg: number; count: number } {
    const revs = this.state.reviews.filter(r => r.hostelId === hostelId && r.status === 'approved');
    if (revs.length === 0) return { avg: 4.8, count: 0 };
    const sum = revs.reduce((a, b) => a + b.rating, 0);
    return { avg: Number((sum / revs.length).toFixed(1)), count: revs.length };
  }

  public getRentals(includeDrafts = false): RentalProperty[] {
    if (includeDrafts) return this.state.rentals;
    return this.state.rentals.filter(r => r.status === 'published');
  }

  public getRentalByIdOrSlug(idOrSlug: string): RentalProperty | undefined {
    return this.state.rentals.find(r => r.id === idOrSlug || r.slug === idOrSlug);
  }

  public getArticles(includeDrafts = false): Article[] {
    if (includeDrafts) return this.state.articles;
    return this.state.articles.filter(a => a.status === 'published');
  }

  public getArticleBySlug(slug: string): Article | undefined {
    return this.state.articles.find(a => a.slug === slug || a.id === slug);
  }

  public getPhrases(category?: string): TravelPhrase[] {
    if (category && category !== 'all') {
      return this.state.phrases.filter(p => p.category === category);
    }
    return this.state.phrases;
  }

  public getBookingByToken(token: string): Booking | undefined {
    return this.state.bookings.find(b => b.privateToken === token);
  }

  public getRentalInquiryByToken(token: string): RentalInquiry | undefined {
    return this.state.rentalInquiries.find(r => r.privateToken === token);
  }

  // --- ACTIONS & MUTATIONS ---

  public logAudit(action: string, targetType: string, targetId: string, details: string) {
    const actor = this.state.currentUser || { id: 'guest', name: 'کاربر مهمان', role: 'traveler' };
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      details,
    };
    this.state.auditLogs.unshift(log);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
  }

  // Auth
  public async login(email: string, password = ''): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.state.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'کاربری با این مشخصات یافت نشد.' };
    }
    if (!user.isActive) {
      return { success: false, error: 'این حساب کاربری غیرفعال شده است.' };
    }

    const credential = this.state.credentials[user.id];
    // Only the shipped demo identities may use their documented demo password.
    const seed = INITIAL_USERS.find(seed => seed.id === user.id && seed.email === user.email && seed.role === user.role);
    const demoPassword = seed?.role === 'admin' ? 'Admin@2026' : seed?.role === 'hostel_manager' ? 'Hostel@2026' : seed ? 'Traveler@2026' : undefined;
    const valid = credential ? await verifyPassword(password, credential) : Boolean(demoPassword && password === demoPassword);
    if (!valid || !user.isActive) return { success: false, error: 'ایمیل یا رمز عبور نادرست است.' };
    this.state.currentUser = user;
    this.logAudit('LOGIN', 'USER', user.id, `ورود موفق کاربر با نقش ${user.role}`);
    this.persist();
    return { success: true, user };
  }

  public logout() {
    if (this.state.currentUser) {
      this.logAudit('LOGOUT', 'USER', this.state.currentUser.id, 'خروج کاربر');
    }
    this.state.currentUser = null;
    this.persist();
  }

  public async registerTraveler(name: string, email: string, phone: string | undefined, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      return { success: false, error: 'نام، ایمیل و رمز عبور (حداقل ۸ کاراکتر) الزامی است.' };
    }
    const credential = await createPasswordCredential(password);
    const cleanEmail = email.trim().toLowerCase();
    if (this.state.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'این ایمیل قبلاً ثبت‌نام شده است.' };
    }

    const newUser: User = {
      id: `user-traveler-${crypto.randomUUID()}`,
      email: cleanEmail,
      name: name.trim(),
      role: 'traveler',
      phone: phone ? phone.trim() : undefined,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    this.state.credentials[newUser.id] = credential;
    this.state.users.push(newUser);
    this.state.currentUser = newUser;
    this.logAudit('REGISTER_TRAVELER', 'USER', newUser.id, `ثبت‌نام مسافر جدید: ${newUser.name}`);
    this.persist();
    return { success: true, user: newUser };
  }

  // Bookings
  public createBooking(data: {
    hostelId: string;
    roomTypeId: string;
    guestName: string;
    contactType: 'phone' | 'email';
    guestContact: string;
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    quantity: number;
    estimatedArrivalTime?: string;
    specialRequests?: string;
    isLowerBunkRequested?: boolean;
    isImmediateArrival?: boolean;
    couponCode?: string;
  }): { success: boolean; booking?: Booking; error?: string } {
    const hostel = this.state.hostels.find(h => h.id === data.hostelId);
    if (!hostel || !hostel.isPublished) return { success: false, error: 'هاستل یافت نشد.' };

    const roomType = hostel.roomTypes.find(rt => rt.id === data.roomTypeId);
    if (!roomType) return { success: false, error: 'نوع اتاق معتبر نیست.' };

    const nights = calculateNights(data.checkIn, data.checkOut);
    if (nights <= 0) return { success: false, error: 'تاریخ خروج باید حداقل یک روز بعد از تاریخ ورود باشد.' };

    if (!Number.isInteger(data.quantity) || data.quantity < 1 ||
        !Number.isInteger(data.guestsCount) || data.guestsCount < 1 ||
        !data.guestName.trim() || !data.guestContact.trim()) {
      return { success: false, error: 'نام، اطلاعات تماس و تعداد مهمانان باید معتبر باشد.' };
    }
    const qty = data.quantity;

    // Check peak capacity in this local store. Production requires a server transaction.
    const activeConfirmed = this.state.bookings.filter(
      b =>
        b.hostelId === data.hostelId &&
        b.roomTypeId === data.roomTypeId &&
        b.status === 'confirmed' &&
        areDatesOverlapping(data.checkIn, data.checkOut, b.checkIn, b.checkOut)
    );
    const currentlyBooked = peakBookedQuantity(data.checkIn, data.checkOut, activeConfirmed);
    const remaining = this.remainingCapacity(hostel.id, roomType.id, data.checkIn, data.checkOut, activeConfirmed);
    if (qty > remaining) {
      return {
        success: false,
        error: `ظرفیت این نوع اتاق برای تاریخ‌های انتخابی تکمیل شده است. (جای خالی: ${remaining})`,
      };
    }

    // Arrival fees & overnight logic
    let earlyArrivalFee = 0;
    let lateArrivalFee = 0;
    let isOvernight = false;

    if (data.estimatedArrivalTime) {
      const match = data.estimatedArrivalTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!match) return { success: false, error: 'ساعت ورود معتبر نیست.' };
      const arrival = analyzeArrivalHour(Number(match[1]));
      isOvernight = arrival.isOvernightArrival;
      if (arrival.isEarlyMorning && hostel.earlyCheckInAvailable) earlyArrivalFee = hostel.earlyCheckInFeeAMD;
      if (isOvernight && hostel.lateArrivalAvailable) lateArrivalFee = hostel.lateArrivalFeeAMD;
    }

    // Validate the coupon before reserving its usage.
    let discountPercent = 0;
    let appliedCoupon: Coupon | null = null;
    if (data.couponCode && data.couponCode.trim()) {
      const c = this.state.coupons.find(cp => cp.code.toUpperCase() === data.couponCode!.trim().toUpperCase());
      const baseStay = roomType.pricePerNightAMD * qty * nights;
      const vResult = validateCoupon(data.couponCode, baseStay, c);
      if (vResult.valid && c) {
        discountPercent = vResult.discountPercent;
        appliedCoupon = c;
      } else {
        return { success: false, error: vResult.message };
      }
    }

    const pricing = calculateBookingPrice({
      pricePerNight: roomType.pricePerNightAMD,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      quantity: qty,
      discountPercent,
      earlyCheckInFee: earlyArrivalFee,
      lateCheckInFee: lateArrivalFee,
    });

    if (!pricing.isValidDates) return { success: false, error: pricing.errorMessage };
    if (appliedCoupon) appliedCoupon.usedCount += 1;
    const bookingId = crypto.randomUUID();
    const trackingCode = `YVN-${bookingId}`;
    const privateToken = `yvn-trk-${crypto.randomUUID()}`;

    const timeoutMin = data.isImmediateArrival ? this.state.settings.immediateTimeoutMinutes : 180;
    const expiresAt = new Date(Date.now() + timeoutMin * 60 * 1000).toISOString();

    const booking: Booking = {
      id: `book-${bookingId}`,
      trackingCode,
      privateToken,
      hostelId: hostel.id,
      hostelName: hostel.name.fa,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name.fa,
      guestName: data.guestName.trim(),
      contactType: data.contactType,
      guestContact: data.guestContact.trim(),
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights,
      guestsCount: Number(data.guestsCount) || qty,
      quantity: qty,
      estimatedArrivalTime: data.estimatedArrivalTime || '14:00',
      specialRequests: data.specialRequests ? data.specialRequests.trim() : undefined,
      isLowerBunkRequested: Boolean(data.isLowerBunkRequested),
      isImmediateArrival: Boolean(data.isImmediateArrival),
      isOvernightArrival: isOvernight,
      earlyCheckInFeeAMD: earlyArrivalFee,
      lateCheckInFeeAMD: lateArrivalFee,
      extraServicesFeeAMD: 0,
      baseAmountAMD: pricing.baseAmount,
      discountPercent: pricing.discountPercent,
      discountAmountAMD: pricing.discountAmount,
      finalAmountAMD: pricing.finalAmountToPayOnArrival,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      status: 'pending',
      travelerUserId: this.state.currentUser?.role === 'traveler' ? this.state.currentUser.id : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt,
    };

    this.state.bookings.unshift(booking);
    this.logAudit('CREATE_BOOKING', 'BOOKING', booking.id, `درخواست رزرو جدید با کد ${trackingCode} در ${hostel.name.fa}`);
    this.persist();

    return { success: true, booking };
  }

  public remainingCapacity(hostelId: string, roomTypeId: string, checkIn: string, checkOut: string, bookings = this.state.bookings.filter(b => b.hostelId === hostelId && b.roomTypeId === roomTypeId && b.status === 'confirmed')) {
    const room = this.state.hostels.find(h => h.id === hostelId)?.roomTypes.find(r => r.id === roomTypeId);
    if (!room || calculateNights(checkIn, checkOut) < 1 || calculateNights(checkIn, checkOut) > 366) return 0;
    let available = Number.MAX_SAFE_INTEGER;
    for (let date = checkIn; date < checkOut; date = addCalendarDays(date, 1)) {
      const capacity = this.state.capacities.find(item => item.hostelId === hostelId && item.roomTypeId === roomTypeId && item.date === date)?.capacity ?? room.totalBedsOrRooms;
      available = Math.min(available, capacity - peakBookedQuantity(date, addCalendarDays(date, 1), bookings));
    }
    return Math.max(0, available);
  }

  public setCapacity(hostelId: string, roomTypeId: string, date: string, capacity: number) {
    if (!this.canManageHostel(hostelId)) throw new Error('دسترسی مجاز نیست.');
    const room = this.state.hostels.find(h => h.id === hostelId)?.roomTypes.find(r => r.id === roomTypeId);
    if (!room || !Number.isSafeInteger(capacity) || capacity < 0 || capacity > room.totalBedsOrRooms || calculateNights(date, addCalendarDays(date, 1)) !== 1) throw new Error('ظرفیت یا تاریخ معتبر نیست.');
    const booked = peakBookedQuantity(date, addCalendarDays(date, 1), this.state.bookings.filter(b => b.hostelId === hostelId && b.roomTypeId === roomTypeId && b.status === 'confirmed'));
    if (capacity < booked) throw new Error('ظرفیت نمی‌تواند کمتر از رزروهای تأییدشده باشد.');
    this.state.capacities = this.state.capacities.filter(item => !(item.hostelId === hostelId && item.roomTypeId === roomTypeId && item.date === date));
    this.state.capacities.push({ hostelId, roomTypeId, date, capacity });
    this.logAudit('SET_CAPACITY', 'HOSTEL', hostelId, `${date}: ${capacity}`);
    this.persist();
  }

  public updateArrivalGuide(hostelId: string, data: Pick<Hostel, 'addressArmenianForTaxi' | 'directionsFa' | 'directionsHy' | 'entrancePhoto' | 'floorAndDoorCode' | 'phone'>) {
    if (!this.canManageHostel(hostelId)) throw new Error('دسترسی مجاز نیست.');
    const hostel = this.state.hostels.find(h => h.id === hostelId);
    if (!hostel) throw new Error('اقامتگاه یافت نشد.');
    Object.assign(hostel, data, { updatedAt: new Date().toISOString() });
    this.logAudit('UPDATE_ARRIVAL_GUIDE', 'HOSTEL', hostelId, 'Arrival guide updated'); this.persist();
  }

  public setVerification(kind: 'hostel' | 'rental', id: string, verified: boolean, note: string) {
    this.requireAdmin();
    const now = new Date().toISOString();
    if (kind === 'hostel') {
      const hostel = this.state.hostels.find(item => item.id === id);
      if (!hostel) throw new Error('اقامتگاه یافت نشد.');
      hostel.verification = { status: verified ? 'verified' : 'unverified', checkedAt: verified ? now : undefined, checkedBy: this.state.currentUser!.name, note };
    } else {
      const rental = this.state.rentals.find(item => item.id === id);
      if (!rental) throw new Error('ملک یافت نشد.');
      rental.verifiedBadge = verified; rental.verifiedExplanation = note; rental.lastCheckedAt = verified ? now : '';
    }
    this.logAudit('VERIFY_PROPERTY', kind, id, verified ? 'verified' : 'unverified'); this.persist();
  }

  public updateBookingStatus(bookingId: string, status: BookingStatus, reason?: string): { success: boolean; error?: string } {
    const booking = this.state.bookings.find(item => item.id === bookingId);
    if (!booking || !this.canManageHostel(booking.hostelId)) return { success: false, error: 'دسترسی مجاز نیست.' };
    return this.transitionBookingStatus(bookingId, status, reason);
  }

  private canManageHostel(hostelId: string): boolean {
    const user = this.state.currentUser;
    return Boolean(user?.isActive && (user.role === 'admin' ||
      (user.role === 'hostel_manager' && user.assignedHostelIds?.includes(hostelId))));
  }

  private requireAdmin() {
    if (!this.state.currentUser?.isActive || this.state.currentUser.role !== 'admin') throw new Error('دسترسی مجاز نیست.');
  }

  private transitionBookingStatus(
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): { success: boolean; error?: string } {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };

    if (booking.status === status) return { success: true };
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'rejected', 'cancelled', 'expired'],
      confirmed: ['cancelled', 'completed', 'no_show'],
      rejected: [], cancelled: [], expired: [], completed: [], no_show: [],
    };
    if (!transitions[booking.status]?.includes(status)) return { success: false, error: 'تغییر وضعیت رزرو مجاز نیست.' };
    if (booking.status === 'pending' && status !== 'expired' && Date.parse(booking.expiresAt) <= Date.now()) {
      this.transitionBookingStatus(booking.id, 'expired');
      return { success: false, error: 'مهلت این درخواست رزرو به پایان رسیده است.' };
    }
    const hostel = this.state.hostels.find(h => h.id === booking.hostelId);
    const roomType = hostel?.roomTypes.find(rt => rt.id === booking.roomTypeId);

    if (status === 'confirmed' && !roomType) return { success: false, error: 'نوع اتاق معتبر نیست.' };
    if (status === 'confirmed' && roomType) {
      // Re-verify peak capacity before confirming
      const activeConfirmed = this.state.bookings.filter(
        b =>
          b.id !== booking.id &&
          b.hostelId === booking.hostelId &&
          b.roomTypeId === booking.roomTypeId &&
          b.status === 'confirmed' &&
          areDatesOverlapping(booking.checkIn, booking.checkOut, b.checkIn, b.checkOut)
      );
      const booked = peakBookedQuantity(booking.checkIn, booking.checkOut, activeConfirmed);
      if (booking.quantity > this.remainingCapacity(booking.hostelId, roomType.id, booking.checkIn, booking.checkOut, activeConfirmed)) {
        return {
          success: false,
          error: 'ظرفیت این نوع اتاق برای تاریخ‌های انتخابی تکمیل است و امکان تأیید وجود ندارد.',
        };
      }
      booking.confirmedAt = new Date().toISOString();
    }

    // Release coupon slot on reject/cancel
    if (status === 'rejected' || status === 'cancelled' || status === 'expired') {
      if (status === 'rejected') booking.rejectionReason = reason;
      if (status === 'cancelled') booking.cancellationReason = reason;

      if (booking.couponCode) {
        const coupon = this.state.coupons.find(c => c.code.toUpperCase() === booking.couponCode!.toUpperCase());
        if (coupon && coupon.usedCount > 0) {
          coupon.usedCount = Math.max(0, coupon.usedCount - 1);
        }
      }
    }

    booking.status = status;
    booking.updatedAt = new Date().toISOString();
    this.logAudit('UPDATE_BOOKING_STATUS', 'BOOKING', booking.id, `تغییر وضعیت رزرو ${booking.trackingCode} به ${status}`);
    this.persist();

    return { success: true };
  }

  public expirePendingBookings() {
    for (const booking of this.state.bookings) {
      if (booking.status === 'pending' && Date.parse(booking.expiresAt) <= Date.now()) {
        this.transitionBookingStatus(booking.id, 'expired');
      }
    }
  }

  public cancelBookingByGuest(token: string, reason: string): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };
    return this.transitionBookingStatus(booking.id, 'cancelled', reason);
  }

  public reportEntranceIssue(token: string, note: string): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };

    if (booking.status !== 'confirmed') return { success: false, error: 'رزرو باید تأیید شده باشد.' };
    booking.entranceIssueReported = true;
    booking.entranceIssueNote = note || 'مسافر اعلام کرد: در محل هستم اما هاستل پاسخگو نیست یا مشکلی در ورود وجود دارد.';
    booking.updatedAt = new Date().toISOString();
    this.logAudit('REPORT_ENTRANCE_ISSUE', 'BOOKING', booking.id, `گزارش مشکل ورود برای رزرو ${booking.trackingCode}`);
    this.persist();

    return { success: true };
  }

  public submitReview(token: string, rating: number, comment: string, scores?: import('../src/types/index').Review['scores']): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };
    if (booking.status !== 'completed') {
      return { success: false, error: 'تنها پس از پایان اقامت و تکمیل سفر می‌توانید نظر خود را ثبت نمایید.' };
    }
    if (booking.reviewId) {
      return { success: false, error: 'شما قبلاً برای این رزرو یک نظر ثبت کرده‌اید.' };
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment.trim()) {
      return { success: false, error: 'امتیاز و متن نظر معتبر نیست.' };
    }

    if (scores && Object.values(scores).some(score => !Number.isInteger(score) || score < 1 || score > 5)) return { success: false, error: 'امتیاز معتبر نیست.' };
    const review: Review = {
      id: `rev-${Date.now()}`,
      bookingId: booking.id,
      hostelId: booking.hostelId,
      hostelName: booking.hostelName,
      guestName: booking.guestName,
      scores,
      rating: scores ? Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / 4 * 10) / 10 : rating,
      comment: comment.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.state.reviews.unshift(review);
    booking.reviewId = review.id;
    this.logAudit('SUBMIT_REVIEW', 'REVIEW', review.id, `ثبت نظر جدید توسط مسافر ${booking.guestName}`);
    this.persist();

    return { success: true };
  }

  // Reviews Moderation (Admin)
  public moderateReview(reviewId: string, status: 'approved' | 'rejected', adminReply?: string) {
    this.requireAdmin();
    const rev = this.state.reviews.find(r => r.id === reviewId);
    if (!rev) return;
    rev.status = status;
    if (adminReply !== undefined) rev.adminReply = adminReply;
    this.logAudit('MODERATE_REVIEW', 'REVIEW', rev.id, `بررسی نظر کاربر: ${status}`);
    this.persist();
  }

  // Immediate Stay Toggle (Hostel Manager)
  public toggleImmediateStay(hostelId: string, enabled: boolean, hours = 6) {
    if (!this.canManageHostel(hostelId)) throw new Error('دسترسی مجاز نیست.');
    const hostel = this.state.hostels.find(h => h.id === hostelId);
    if (!hostel) return;
    hostel.immediateStayEnabled = enabled;
    if (enabled) {
      hostel.immediateStayExpiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    } else {
      hostel.immediateStayExpiresAt = undefined;
    }
    hostel.updatedAt = new Date().toISOString();
    this.logAudit('TOGGLE_IMMEDIATE_STAY', 'HOSTEL', hostel.id, `تغییر وضعیت ورود فوری به ${enabled ? 'فعال' : 'غیرفعال'}`);
    this.persist();
  }

  // Rentals
  public createRentalInquiry(data: {
    propertyId: string;
    guestName: string;
    contact: string;
    requestType: 'rent' | 'visit';
    desiredStartDate?: string;
    desiredDurationText?: string;
    proposedVisitDate?: string;
    residentsCount?: number;
    notes?: string;
  }): { success: boolean; inquiry?: RentalInquiry; error?: string } {
    const rental = this.state.rentals.find(r => r.id === data.propertyId);
    if (!rental || rental.status !== 'published') return { success: false, error: 'ملک یافت نشد.' };
    if (!data.guestName.trim() || !data.contact.trim() ||
        (data.residentsCount !== undefined && (!Number.isInteger(data.residentsCount) || data.residentsCount < 1 || data.residentsCount > rental.maxResidents))) {
      return { success: false, error: 'اطلاعات متقاضی یا تعداد ساکنین معتبر نیست.' };
    }

    const trackingCode = `YVN-RNT-${crypto.randomUUID()}`;
    const privateToken = `rnt-trk-${crypto.randomUUID()}`;

    const inquiry: RentalInquiry = {
      id: `rinq-${crypto.randomUUID()}`,
      trackingCode,
      privateToken,
      propertyId: rental.id,
      propertyTitle: rental.title.fa,
      guestName: data.guestName.trim(),
      contact: data.contact.trim(),
      requestType: data.requestType,
      desiredStartDate: data.desiredStartDate,
      desiredDurationText: data.desiredDurationText,
      proposedVisitDate: data.proposedVisitDate,
      residentsCount: data.residentsCount || 1,
      notes: data.notes ? data.notes.trim() : undefined,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.rentalInquiries.unshift(inquiry);
    this.logAudit('CREATE_RENTAL_INQUIRY', 'RENTAL_INQUIRY', inquiry.id, `ثبت درخواست ${data.requestType === 'visit' ? 'بازدید' : 'اجاره'} ملک ${trackingCode}`);
    this.persist();

    return { success: true, inquiry };
  }

  public updateRentalInquiryStatus(inquiryId: string, status: RentalInquiryStatus, adminNotes?: string) {
    this.requireAdmin();
    const inq = this.state.rentalInquiries.find(i => i.id === inquiryId);
    if (!inq) return;
    inq.status = status;
    if (adminNotes !== undefined) inq.adminNotes = adminNotes;
    inq.updatedAt = new Date().toISOString();
    this.logAudit('UPDATE_RENTAL_INQUIRY', 'RENTAL_INQUIRY', inq.id, `تغییر وضعیت درخواست اجاره به ${status}`);
    this.persist();
  }

  // Admin Rentals Management
  public saveRental(property: RentalProperty) {
    this.requireAdmin();
    const idx = this.state.rentals.findIndex(r => r.id === property.id);
    if (idx >= 0) {
      this.state.rentals[idx] = { ...property, updatedAt: new Date().toISOString(), lastCheckedAt: this.state.rentals[idx].lastCheckedAt };
    } else {
      property.id = `rental-${Date.now()}`;
      property.createdAt = new Date().toISOString();
      property.updatedAt = new Date().toISOString();
      property.lastCheckedAt = new Date().toISOString();
      this.state.rentals.unshift(property);
    }
    this.logAudit('SAVE_RENTAL', 'RENTAL', property.id, `ذخیره ملک ${property.title.fa}`);
    this.persist();
  }

  // Admin Hostels Management
  public saveHostel(hostel: Hostel) {
    this.requireAdmin();
    const idx = this.state.hostels.findIndex(h => h.id === hostel.id);
    if (idx >= 0) {
      this.state.hostels[idx] = { ...hostel, updatedAt: new Date().toISOString() };
    } else {
      hostel.id = `hostel-${Date.now()}`;
      hostel.createdAt = new Date().toISOString();
      hostel.updatedAt = new Date().toISOString();
      this.state.hostels.push(hostel);
    }
    this.logAudit('SAVE_HOSTEL', 'HOSTEL', hostel.id, `ذخیره هاستل ${hostel.name.fa}`);
    this.persist();
  }

  public toggleHostelPublished(id: string) {
    this.requireAdmin();
    const h = this.state.hostels.find(item => item.id === id);
    if (!h) return;
    h.isPublished = !h.isPublished;
    h.updatedAt = new Date().toISOString();
    this.logAudit('TOGGLE_HOSTEL', 'HOSTEL', id, `تغییر وضعیت انتشار هاستل به ${h.isPublished ? 'منتشرشده' : 'پیش‌نویس'}`);
    this.persist();
  }

  public toggleRentalAvailability(id: string) {
    this.requireAdmin();
    const r = this.state.rentals.find(item => item.id === id);
    if (!r) return;
    r.status = r.status === 'published' ? 'hidden' : 'published';
    r.updatedAt = new Date().toISOString();
    this.logAudit('TOGGLE_RENTAL', 'RENTAL', id, `تغییر وضعیت دسترسی ملک به ${r.status === 'published' ? 'منتشرشده' : 'پنهان'}`);
    this.persist();
  }

  // Coupons
  public addCoupon(coupon: Coupon): { success: boolean; error?: string } {
    this.requireAdmin();
    const clean = coupon.code.trim().toUpperCase();
    if (!clean || !Number.isFinite(coupon.percent) || coupon.percent < 0 || coupon.percent > 100 ||
        !Number.isFinite(coupon.minAmountAMD) || coupon.minAmountAMD < 0 ||
        !Number.isInteger(coupon.maxUses) || coupon.maxUses < 0 ||
        !Number.isFinite(Date.parse(coupon.startsAt)) || !Number.isFinite(Date.parse(coupon.expiresAt)) ||
        Date.parse(coupon.expiresAt) <= Date.parse(coupon.startsAt)) {
      return { success: false, error: 'اطلاعات کد تخفیف معتبر نیست.' };
    }
    if (this.state.coupons.some(c => c.code.toUpperCase() === clean)) {
      return { success: false, error: 'این کد تخفیف قبلاً تعریف شده است.' };
    }
    this.state.coupons.unshift({ ...coupon, code: clean });
    this.logAudit('CREATE_COUPON', 'COUPON', clean, `ایجاد کد تخفیف ${clean} با ${coupon.percent}٪`);
    this.persist();
    return { success: true };
  }

  public toggleCoupon(code: string) {
    this.requireAdmin();
    const c = this.state.coupons.find(cp => cp.code.toUpperCase() === code.toUpperCase());
    if (!c) return;
    c.active = !c.active;
    this.logAudit('TOGGLE_COUPON', 'COUPON', code, `تغییر وضعیت کد ${code} به ${c.active ? 'فعال' : 'غیرفعال'}`);
    this.persist();
  }

  public deleteCoupon(code: string) {
    this.requireAdmin();
    this.state.coupons = this.state.coupons.filter(c => c.code.toUpperCase() !== code.toUpperCase());
    this.logAudit('DELETE_COUPON', 'COUPON', code, `حذف کد تخفیف ${code}`);
    this.persist();
  }

  // Articles (Manual one-by-one by Admin)
  public saveArticle(article: Article) {
    this.requireAdmin();
    const idx = this.state.articles.findIndex(a => a.id === article.id);
    if (idx >= 0) {
      this.state.articles[idx] = { ...article, updatedAt: new Date().toISOString() };
    } else {
      article.id = `art-${Date.now()}`;
      article.createdAt = new Date().toISOString();
      article.updatedAt = new Date().toISOString();
      this.state.articles.unshift(article);
    }
    this.logAudit('SAVE_ARTICLE', 'ARTICLE', article.id, `ذخیره دستی مطلب ${article.title} با وضعیت ${article.status}`);
    this.persist();
  }

  public deleteArticle(id: string) {
    this.requireAdmin();
    this.state.articles = this.state.articles.filter(a => a.id !== id);
    this.logAudit('DELETE_ARTICLE', 'ARTICLE', id, 'حذف مقاله');
    this.persist();
  }

  // Managers
  public async createHostelManager(data: { name: string; email: string; initialPassword?: string; phone?: string; assignedHostelIds: string[] }): Promise<{ success: boolean; error?: string }> {
    this.requireAdmin();
    if (!data.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || !data.initialPassword || data.initialPassword.length < 8 ||
        !data.assignedHostelIds.length || data.assignedHostelIds.some(id => !this.state.hostels.some(hostel => hostel.id === id))) {
      return { success: false, error: 'اطلاعات مدیر، هاستل یا رمز عبور معتبر نیست.' };
    }
    const credential = await createPasswordCredential(data.initialPassword);
    const clean = data.email.trim().toLowerCase();
    if (this.state.users.some(u => u.email.toLowerCase() === clean)) {
      return { success: false, error: 'کاربری با این ایمیل وجود دارد.' };
    }

    const newMgr: User = {
      id: `user-manager-${crypto.randomUUID()}`,
      email: clean,
      name: data.name.trim(),
      role: 'hostel_manager',
      phone: data.phone?.trim(),
      assignedHostelIds: data.assignedHostelIds,
      createdAt: new Date().toISOString(),
      mustChangePassword: false,
      isActive: true,
    };
    this.requireAdmin();
    this.state.credentials[newMgr.id] = credential;
    this.state.users.push(newMgr);
    this.logAudit('CREATE_MANAGER', 'USER', newMgr.id, `ایجاد حساب هاستلدار برای ${newMgr.name}`);
    this.persist();
    return { success: true };
  }

  public toggleManagerActive(userId: string) {
    this.requireAdmin();
    const u = this.state.users.find(usr => usr.id === userId);
    if (!u) return;
    if (u.role !== 'hostel_manager') return;
    u.isActive = !u.isActive;
    this.logAudit('TOGGLE_MANAGER_ACTIVE', 'USER', u.id, `تغییر وضعیت حساب ${u.name} به ${u.isActive ? 'فعال' : 'غیرفعال'}`);
    this.persist();
  }

  // Phrases
  public addPhrase(phrase: TravelPhrase) {
    this.requireAdmin();
    phrase.id = `phr-${Date.now()}`;
    this.state.phrases.push(phrase);
    this.persist();
  }
}


