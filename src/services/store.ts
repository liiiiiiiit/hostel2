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
} from '../types';
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
} from './mockData';
import {
  calculateNights,
  calculateBookingPrice,
  validateCoupon,
  areDatesOverlapping,
  analyzeArrivalHour,
} from '../utils/pricing';

const STORAGE_KEY = 'yerevanhub_store_v1';

interface AppStoreState {
  users: User[];
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

class Store {
  private state: AppStoreState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppStoreState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not parse local store, using default seed:', e);
    }

    return {
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
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
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
  public login(email: string, password?: string): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.state.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'کاربری با این مشخصات یافت نشد.' };
    }
    if (!user.isActive) {
      return { success: false, error: 'این حساب کاربری غیرفعال شده است.' };
    }

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

  public registerTraveler(name: string, email: string, phone?: string): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.state.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'این ایمیل قبلاً ثبت‌نام شده است.' };
    }

    const newUser: User = {
      id: `user-traveler-${Date.now()}`,
      email: cleanEmail,
      name: name.trim(),
      role: 'traveler',
      phone: phone ? phone.trim() : undefined,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

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
    if (!hostel) return { success: false, error: 'هاستل یافت نشد.' };

    const roomType = hostel.roomTypes.find(rt => rt.id === data.roomTypeId);
    if (!roomType) return { success: false, error: 'نوع اتاق معتبر نیست.' };

    const nights = calculateNights(data.checkIn, data.checkOut);
    if (nights <= 0) return { success: false, error: 'تاریخ خروج باید حداقل یک روز بعد از تاریخ ورود باشد.' };

    const qty = Math.max(1, data.quantity || 1);

    // Atomic capacity check
    const activeConfirmed = this.state.bookings.filter(
      b =>
        b.hostelId === data.hostelId &&
        b.roomTypeId === data.roomTypeId &&
        b.status === 'confirmed' &&
        areDatesOverlapping(data.checkIn, data.checkOut, b.checkIn, b.checkOut)
    );
    const currentlyBooked = activeConfirmed.reduce((sum, b) => sum + b.quantity, 0);
    if (currentlyBooked + qty > roomType.totalBedsOrRooms) {
      return {
        success: false,
        error: `ظرفیت این نوع اتاق برای تاریخ‌های انتخابی تکمیل شده است. (جای خالی: ${Math.max(0, roomType.totalBedsOrRooms - currentlyBooked)})`,
      };
    }

    // Arrival fees & overnight logic
    let earlyArrivalFee = 0;
    let lateArrivalFee = 0;
    let isOvernight = false;

    if (data.estimatedArrivalTime) {
      const match = data.estimatedArrivalTime.match(/(\d{1,2})/);
      if (match) {
        const hour = parseInt(match[1], 10);
        if (analyzeArrivalHour(hour).isOvernightArrival) {
          isOvernight = true;
          if (hostel.lateArrivalAvailable && hostel.lateArrivalFeeAMD) {
            lateArrivalFee = hostel.lateArrivalFeeAMD;
          }
        }
      }
    }

    // Coupon check & atomic reservation
    let discountPercent = 0;
    let appliedCoupon: Coupon | null = null;
    if (data.couponCode && data.couponCode.trim()) {
      const c = this.state.coupons.find(cp => cp.code.toUpperCase() === data.couponCode!.trim().toUpperCase());
      const baseStay = roomType.pricePerNightAMD * qty * nights;
      const vResult = validateCoupon(data.couponCode, baseStay, c);
      if (vResult.valid && c) {
        discountPercent = vResult.discountPercent;
        appliedCoupon = c;
        c.usedCount += 1;
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

    const shortNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `YVN-${shortNum}`;
    const privateToken = `yvn-trk-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const timeoutMin = data.isImmediateArrival ? this.state.settings.immediateTimeoutMinutes : 180;
    const expiresAt = new Date(Date.now() + timeoutMin * 60 * 1000).toISOString();

    const booking: Booking = {
      id: `book-${Date.now()}-${shortNum}`,
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
      estimatedArrivalTime: data.estimatedArrivalTime || '۱۴:۰۰',
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

  public updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): { success: boolean; error?: string } {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };

    const hostel = this.state.hostels.find(h => h.id === booking.hostelId);
    if (!hostel) return { success: false, error: 'هاستل یافت نشد.' };

    const roomType = hostel.roomTypes.find(rt => rt.id === booking.roomTypeId);

    if (status === 'confirmed' && roomType) {
      // Re-verify capacity atomically before confirming
      const activeConfirmed = this.state.bookings.filter(
        b =>
          b.id !== booking.id &&
          b.hostelId === booking.hostelId &&
          b.roomTypeId === booking.roomTypeId &&
          b.status === 'confirmed' &&
          areDatesOverlapping(booking.checkIn, booking.checkOut, b.checkIn, b.checkOut)
      );
      const booked = activeConfirmed.reduce((sum, b) => sum + b.quantity, 0);
      if (booked + booking.quantity > roomType.totalBedsOrRooms) {
        return {
          success: false,
          error: 'ظرفیت این نوع اتاق برای تاریخ‌های انتخابی تکمیل است و امکان تأیید وجود ندارد.',
        };
      }
      booking.confirmedAt = new Date().toISOString();
    }

    // Release coupon slot on reject/cancel
    if (status === 'rejected' || status === 'cancelled') {
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

  public cancelBookingByGuest(token: string, reason: string): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };
    return this.updateBookingStatus(booking.id, 'cancelled', reason);
  }

  public reportEntranceIssue(token: string, note: string): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };

    booking.entranceIssueReported = true;
    booking.entranceIssueNote = note || 'مسافر اعلام کرد: در محل هستم اما هاستل پاسخگو نیست یا مشکلی در ورود وجود دارد.';
    booking.updatedAt = new Date().toISOString();
    this.logAudit('REPORT_ENTRANCE_ISSUE', 'BOOKING', booking.id, `گزارش مشکل ورود برای رزرو ${booking.trackingCode}`);
    this.persist();

    return { success: true };
  }

  public submitReview(token: string, rating: number, comment: string): { success: boolean; error?: string } {
    const booking = this.getBookingByToken(token);
    if (!booking) return { success: false, error: 'رزرو یافت نشد.' };
    if (booking.status !== 'completed') {
      return { success: false, error: 'تنها پس از پایان اقامت و تکمیل سفر می‌توانید نظر خود را ثبت نمایید.' };
    }
    if (booking.reviewId) {
      return { success: false, error: 'شما قبلاً برای این رزرو یک نظر ثبت کرده‌اید.' };
    }

    const review: Review = {
      id: `rev-${Date.now()}`,
      bookingId: booking.id,
      hostelId: booking.hostelId,
      hostelName: booking.hostelName,
      guestName: booking.guestName,
      rating: Math.max(1, Math.min(5, rating)),
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
    const rev = this.state.reviews.find(r => r.id === reviewId);
    if (!rev) return;
    rev.status = status;
    if (adminReply !== undefined) rev.adminReply = adminReply;
    this.logAudit('MODERATE_REVIEW', 'REVIEW', rev.id, `بررسی نظر کاربر: ${status}`);
    this.persist();
  }

  // Immediate Stay Toggle (Hostel Manager)
  public toggleImmediateStay(hostelId: string, enabled: boolean, hours = 6) {
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
    if (!rental) return { success: false, error: 'ملک یافت نشد.' };

    const shortNum = Math.floor(100 + Math.random() * 900);
    const trackingCode = `YVN-RNT-${shortNum}`;
    const privateToken = `rnt-trk-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const inquiry: RentalInquiry = {
      id: `rinq-${Date.now()}`,
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
    const idx = this.state.rentals.findIndex(r => r.id === property.id);
    if (idx >= 0) {
      this.state.rentals[idx] = { ...property, updatedAt: new Date().toISOString(), lastCheckedAt: new Date().toISOString() };
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

  // Coupons
  public addCoupon(coupon: Coupon): { success: boolean; error?: string } {
    const clean = coupon.code.trim().toUpperCase();
    if (this.state.coupons.some(c => c.code.toUpperCase() === clean)) {
      return { success: false, error: 'این کد تخفیف قبلاً تعریف شده است.' };
    }
    this.state.coupons.unshift({ ...coupon, code: clean });
    this.logAudit('CREATE_COUPON', 'COUPON', clean, `ایجاد کد تخفیف ${clean} با ${coupon.percent}٪`);
    this.persist();
    return { success: true };
  }

  public toggleCoupon(code: string) {
    const c = this.state.coupons.find(cp => cp.code.toUpperCase() === code.toUpperCase());
    if (!c) return;
    c.active = !c.active;
    this.logAudit('TOGGLE_COUPON', 'COUPON', code, `تغییر وضعیت کد ${code} به ${c.active ? 'فعال' : 'غیرفعال'}`);
    this.persist();
  }

  // Articles (Manual one-by-one by Admin)
  public saveArticle(article: Article) {
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
    this.state.articles = this.state.articles.filter(a => a.id !== id);
    this.logAudit('DELETE_ARTICLE', 'ARTICLE', id, 'حذف مقاله');
    this.persist();
  }

  // Managers
  public createHostelManager(data: { name: string; email: string; initialPassword?: string; phone?: string; assignedHostelIds: string[] }): { success: boolean; error?: string } {
    const clean = data.email.trim().toLowerCase();
    if (this.state.users.some(u => u.email.toLowerCase() === clean)) {
      return { success: false, error: 'کاربری با این ایمیل وجود دارد.' };
    }

    const newMgr: User = {
      id: `user-manager-${Date.now()}`,
      email: clean,
      name: data.name.trim(),
      role: 'hostel_manager',
      phone: data.phone?.trim(),
      assignedHostelIds: data.assignedHostelIds,
      createdAt: new Date().toISOString(),
      mustChangePassword: true,
      isActive: true,
    };
    this.state.users.push(newMgr);
    this.logAudit('CREATE_MANAGER', 'USER', newMgr.id, `ایجاد حساب هاستلدار برای ${newMgr.name}`);
    this.persist();
    return { success: true };
  }

  public toggleManagerActive(userId: string) {
    const u = this.state.users.find(usr => usr.id === userId);
    if (!u) return;
    u.isActive = !u.isActive;
    this.logAudit('TOGGLE_MANAGER_ACTIVE', 'USER', u.id, `تغییر وضعیت حساب ${u.name} به ${u.isActive ? 'فعال' : 'غیرفعال'}`);
    this.persist();
  }

  // Phrases
  public addPhrase(phrase: TravelPhrase) {
    phrase.id = `phr-${Date.now()}`;
    this.state.phrases.push(phrase);
    this.persist();
  }
}

export const appStore = new Store();
