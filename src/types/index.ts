import type {CancellationRule,CommissionRule,OptionalService,UnitBlock,BookingChange,BookingEvent,SupportThread,FinanceEntry} from './operations.js';
export type AppLanguage = 'fa' | 'en' | 'ru' | 'hy';

export type UserRole = 'admin' | 'hostel_manager' | 'traveler';

export interface User {
  emailVerifiedAt?:string;
  language?:AppLanguage;
  emailNotifications?:boolean;
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  assignedHostelIds?: string[];
  mustChangePassword?: boolean;
  isActive: boolean;
  createdAt: string;
}

export type ListingStatus = 'draft' | 'published' | 'hidden' | 'archived';
export interface PropertyImage {
  id: string;
  url: string;
  alt: Record<AppLanguage, string>;
  roomTypeId?: string;
}
export interface RoomPricingRules {
  minimumNights: number;
  weekendDays: number[];
  weekendPriceAMD?: number;
  overrides: { id:string; from:string; to:string; priceAMD:number }[];
  weeklyDiscountPercent: number;
  monthlyDiscountPercent: number;
}
export interface RoomType {
  pricingRules?: RoomPricingRules;
  id: string;
  name: Record<AppLanguage, string>;
  type: 'dorm_mixed' | 'dorm_female' | 'dorm_male' | 'private';
  bookingUnit?: 'bed' | 'room';
  maxGuestsPerUnit?: number;
  physicalUnits?: { id: string; label: string }[];
  totalBedsOrRooms: number;
  pricePerNightAMD: number;
  hasCurtain?: boolean;
  hasBedsidePlug?: boolean;
  hasPersonalLocker?: boolean;
  requiresOwnLock?: boolean;
  description: Record<AppLanguage, string>;
}

export interface CapacityOverride { hostelId: string; roomTypeId: string; date: string; capacity: number }
export interface AvailabilityDay extends CapacityOverride { booked: number; available: number }
export interface Verification { status: 'unverified' | 'verified'; checkedAt?: string; checkedBy?: string; note?: string }
export interface Hostel {
  optionalServices?:OptionalService[];
  cancellationRule?:CancellationRule;
  commissionRule?:CommissionRule;
  responseMinutes?:number;
  listingStatus?: ListingStatus;
  description?: Record<AppLanguage, string>;
  media?: PropertyImage[];
  factsConfirmed?: boolean;
  sampleContent?: boolean;
  coordinatesProvided?: boolean;
  id: string;
  slug: string;
  name: Record<AppLanguage, string>;
  city: string;
  district: string;
  address: Record<AppLanguage, string>;
  addressArmenianForTaxi: string;
  coordinates: { lat: number; lng: number };
  locationVerification?: Verification;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  email: string;
  photos: string[];
  entrancePhoto?: string;
  directionsFa: string;
  directionsHy: string;
  directionsEn?: string;directionsRu?: string;
  floorAndDoorCode?: string;
  verification?: Verification;
  nearMetro?: boolean;
  monthlyStayAvailable?: boolean;
  minPricePerNightAMD: number;
  reception24h: boolean;
  receptionOpenTime?: string;
  receptionCloseTime?: string;
  checkInStandardTime: string;
  checkOutStandardTime: string;
  earlyCheckInAvailable: boolean;
  earlyCheckInFeeAMD: number;
  lateArrivalAvailable: boolean;
  lateArrivalFeeAMD: number;
  immediateStayEnabled: boolean;
  immediateStayExpiresAt?: string;
  freeLuggageStorage: boolean;
  waitingLoungeAvailable: boolean;
  languagesSpoken: AppLanguage[];
  amenities: {
    wifi: boolean;
    lockers: boolean;
    requiresPersonalPadlock: boolean;
    kitchen: boolean;
    hotWater24h: boolean;
    linenIncluded: boolean;
    elevator: boolean;
    stairsCount?: number;
    airConditioning: boolean;
    breakfastAvailable: boolean;
    breakfastPriceAMD?: number;
    laundry: boolean;
    coworking: boolean;
  };
  rules: {
    quietHours: string;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    cancellationPolicy: string;
    cancellationPolicyLocalized?: Record<AppLanguage, string>;
    acceptedPaymentMethodsOnArrival: string[];
  };
  roomTypes: RoomType[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'completed'
  | 'no_show';

export interface Booking {
  searchContext?:{city?:string;district?:string;type?:string;budget?:number;amenities?:string[]};
  versionToken?:string;
  source?:'website'|'walk_in'|'telephone'|'external';
  assignedUnitIds?:string[];checkedInAt?:string;checkedOutAt?:string;history?:BookingEvent[];
  cancellationChargeAMD?:number;
  actualArrivalDate?:string;arrivalMode?:'previous_night'|'standard'|'early_check_in';
  reminderAt?:string;escalatedAt?:string;
  selectedServiceIds?:string[];
  commissionRule?:CommissionRule;

  idempotencyKey?: string;
  requestFingerprint?: string;
  language?: AppLanguage;
  agreement?: {
    discountPercent?:number;checkInTime?:string;checkOutTime?:string;cancellationRule?:CancellationRule;optionalServices?:{id:string;name:Record<AppLanguage,string>;amountAMD:number;unit?:'stay'|'night'|'guest_night';unitPriceAMD?:number}[]; currency: 'AMD'; bookingUnit: 'bed' | 'room'; guestsPerUnit: number;
    nightlyPriceAMD: number; nightlyLines?: {date:string;unitPriceAMD:number;quantity:number;totalAMD:number;source:'base'|'weekend'|'override'}[]; discountSource?:'none'|'coupon'|'weekly'|'monthly'; cancellationPolicy: string;
    cancellationPolicyLocalized?: Record<AppLanguage,string>;
    paymentMethodsOnArrival: string[]; acceptedAt: string;
    breakdown: { accommodationAMD:number; discountAMD:number; earlyArrivalAMD:number; lateArrivalAMD:number; optionalServicesAMD:number; totalAMD:number };
  };
  id: string;
  trackingCode: string;
  privateToken: string;
  hostelId: string;
  hostelName: string;
  roomTypeId: string;
  roomTypeName: string;
  guestName: string;
  contactType: 'phone' | 'email';
  guestContact: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  quantity: number;
  estimatedArrivalTime?: string;
  specialRequests?: string;
  isLowerBunkRequested?: boolean;
  isImmediateArrival: boolean;
  isOvernightArrival: boolean;
  earlyCheckInFeeAMD: number;
  lateCheckInFeeAMD: number;
  extraServicesFeeAMD: number;
  baseAmountAMD: number;
  discountPercent: number;
  discountAmountAMD: number;
  finalAmountAMD: number;
  couponCode?: string;
  status: BookingStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  entranceIssueReported?: boolean;
  entranceIssueNote?: string;
  reviewId?: string;
  travelerUserId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface RentalProperty {
  description?: Record<AppLanguage, string>;
  media?: PropertyImage[];
  factsConfirmed?: boolean;
  sampleContent?: boolean;
  id: string;
  slug: string;
  title: Record<AppLanguage, string>;
  propertyType: 'apartment' | 'house' | 'studio' | 'villa';
  rentalType: 'both' | 'short_term' | 'long_term';
  city: string;
  neighborhood: string;
  approximateLocationLabel: string;
  addressPublic: string;
  addressExactInternal: string;
  photos: string[];
  areaSqm: number;
  floor: number;
  totalFloors: number;
  hasElevator: boolean;
  bedroomsCount: number;
  bedsCount: number;
  bathroomsCount: number;
  maxResidents: number;
  isFurnished: boolean;
  pricePerNightAMD?: number;
  pricePerMonthAMD?: number;
  minStayNights?: number;
  minStayMonths?: number;
  refundableDepositAMD: number;
  depositTerms: string;
  commissionType: 'none_direct' | 'standard_commission';
  commissionAmountText: string;
  cleaningFeeAMD: number;
  utilitiesBreakdown: {
    electricity: 'tenant' | 'included' | 'meter_reading';
    water: 'tenant' | 'included';
    gas: 'tenant' | 'included' | 'meter_reading';
    internet: 'included' | 'tenant';
    buildingMaintenance: 'included' | 'tenant';
  };
  amenities: {
    wifi: boolean;
    ac: boolean;
    centralHeating: boolean;
    washingMachine: boolean;
    dishwasher: boolean;
    balcony: boolean;
    parking: boolean;
    petFriendly: boolean;
  };
  verifiedBadge: boolean;
  verifiedExplanation: string;
  providerType: 'direct_owner' | 'authorized_agent';
  landlordInternalNotes: string;
  status: 'published' | 'draft' | 'hidden' | 'archived';
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type RentalInquiryStatus =
  | 'pending_review'
  | 'coordinating'
  | 'proposed_terms'
  | 'agreed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface RentalInquiry {
  id: string;
  trackingCode: string;
  privateToken: string;
  propertyId: string;
  propertyTitle: string;
  guestName: string;
  contact: string;
  requestType: 'rent' | 'visit';
  desiredStartDate?: string;
  desiredDurationText?: string;
  proposedVisitDate?: string;
  residentsCount?: number;
  notes?: string;
  status: RentalInquiryStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  code: string;
  percent: number;
  minAmountAMD: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  startsAt: string;
  expiresAt: string;
  description: string;
}

export interface Review {
  id: string;
  bookingId: string;
  hostelId: string;
  hostelName: string;
  guestName: string;
  scores?: { cleanliness: number; safety: number; staff: number; location: number };
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: string;
  createdAt: string;
}

export interface Article {
  translations?:Partial<Record<AppLanguage,{title:string;summary:string;content:string}>>;
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  featuredImage: string;
  content: string;
  author: string;
  language: AppLanguage;
  status: 'draft' | 'published';
  lastVerifiedDate: string;
  sources: string[];
  isSampleDraft?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TravelPhrase {
  id: string;
  category: 'taxi' | 'hostel' | 'rent' | 'shopping' | 'dining' | 'emergency';
  categoryLabelFa: string;
  fa: string;
  en: string;
  ru: string;
  hy: string;
  phoneticHy: string;
  note?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

export interface ClientState {
  unitBlocks?:UnitBlock[];bookingChanges?:BookingChange[];supportThreads?:SupportThread[];financeEntries?:FinanceEntry[];savedPlaces?:string[];
  users: User[]; currentUser: User | null; hostels: Hostel[]; rentals: RentalProperty[];
  coupons: Coupon[]; bookings: Booking[]; rentalInquiries: RentalInquiry[]; reviews: Review[];
  articles: Article[]; phrases: TravelPhrase[]; auditLogs: AuditLog[]; capacities: CapacityOverride[];
  previewMode?: boolean;
  availability: AvailabilityDay[]; demoMode: boolean;
  settings: { emergencyHotline: string; telegramSupport: string; supportHours?:Record<AppLanguage,string>;supportWorkingHoursFa: string; immediateTimeoutMinutes: number };
}
export interface ActionResult { proposal?:BookingChange;thread?:SupportThread; success: boolean; error?: string; user?: User; booking?: Booking; inquiry?: RentalInquiry; coupon?: Coupon; }
