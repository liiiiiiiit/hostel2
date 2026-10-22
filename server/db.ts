import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'admin' | 'hostel_manager' | 'traveler';
  phone?: string;
  assignedHostelIds?: string[];
  createdAt: string;
  mustChangePassword?: boolean;
  isActive: boolean;
}

export interface Session {
  token: string;
  userId: string;
  role: 'admin' | 'hostel_manager' | 'traveler';
  expiresAt: string;
}

export interface RoomType {
  id: string;
  name: { fa: string; en: string; ru: string; hy: string };
  type: 'dorm_mixed' | 'dorm_female' | 'dorm_male' | 'private';
  totalBedsOrRooms: number;
  pricePerNightAMD: number;
  hasCurtain?: boolean;
  hasBedsidePlug?: boolean;
  hasPersonalLocker?: boolean;
  requiresOwnLock?: boolean;
  description: { fa: string; en: string; ru: string; hy: string };
}

export interface Hostel {
  id: string;
  slug: string;
  name: { fa: string; en: string; ru: string; hy: string };
  city: string;
  district: string;
  address: { fa: string; en: string; ru: string; hy: string };
  addressArmenianForTaxi: string; // Armenian text specifically formatted for taxi drivers
  coordinates: { lat: number; lng: number };
  phone: string;
  whatsapp?: string;
  telegram?: string;
  email: string;
  photos: string[];
  entrancePhoto?: string;
  directionsFa: string;
  directionsHy: string;
  floorAndDoorCode?: string; // Revealed only to confirmed guests in arrival pass
  minPricePerNightAMD: number;
  reception24h: boolean;
  receptionOpenTime?: string;
  receptionCloseTime?: string;
  checkInStandardTime: string; // e.g. "14:00"
  checkOutStandardTime: string; // e.g. "11:00"
  earlyCheckInAvailable: boolean;
  earlyCheckInFeeAMD: number;
  lateArrivalAvailable: boolean;
  lateArrivalFeeAMD: number;
  immediateStayEnabled: boolean; // "ورود فوری همین حالا"
  immediateStayExpiresAt?: string;
  freeLuggageStorage: boolean;
  waitingLoungeAvailable: boolean;
  languagesSpoken: ('fa' | 'en' | 'ru' | 'hy')[];
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
    acceptedPaymentMethodsOnArrival: string[];
  };
  roomTypes: RoomType[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  trackingCode: string; // e.g. YVN-4821
  privateToken: string; // UUID secure link
  hostelId: string;
  hostelName: string;
  roomTypeId: string;
  roomTypeName: string;
  guestName: string;
  contactType: 'phone' | 'email';
  guestContact: string; // phone or email
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guestsCount: number;
  quantity: number;
  estimatedArrivalTime?: string;
  specialRequests?: string;
  isLowerBunkRequested?: boolean; // Preferred request (not guaranteed)
  isImmediateArrival: boolean; // "تازه رسیده‌ام"
  isOvernightArrival: boolean;
  earlyCheckInFeeAMD: number;
  lateCheckInFeeAMD: number;
  extraServicesFeeAMD: number;
  baseAmountAMD: number;
  discountPercent: number;
  discountAmountAMD: number;
  finalAmountAMD: number;
  couponCode?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired' | 'completed' | 'no_show';
  rejectionReason?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  entranceIssueReported?: boolean;
  entranceIssueNote?: string;
  reviewId?: string;
  travelerUserId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // For auto-expiration of pending urgent requests
}

export interface RentalProperty {
  id: string;
  slug: string;
  title: { fa: string; en: string; ru: string; hy: string };
  propertyType: 'apartment' | 'house' | 'studio' | 'villa';
  rentalType: 'both' | 'short_term' | 'long_term';
  city: string;
  neighborhood: string;
  approximateLocationLabel: string;
  addressPublic: string;
  addressExactInternal: string; // Shown to admin and shared only after coordination
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
  verifiedExplanation: string; // "بازرسی حضوری توسط کارشناس YEREVANHUB در سپتامبر ۲۰۲۶"
  providerType: 'direct_owner' | 'authorized_agent';
  landlordInternalNotes: string; // Internal admin contact details for landlord
  status: 'published' | 'draft' | 'hidden' | 'archived';
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

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
  desiredDurationText?: string; // e.g. "۶ ماه" or "۵ شب"
  proposedVisitDate?: string;
  residentsCount?: number;
  notes?: string;
  status: 'pending_review' | 'coordinating' | 'proposed_terms' | 'agreed' | 'rejected' | 'cancelled' | 'completed';
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
  rating: number; // 1 to 5
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  featuredImage: string;
  content: string; // Markdown/HTML formatted text
  author: string;
  language: 'fa' | 'en' | 'ru' | 'hy';
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

export interface AppDatabase {
  users: User[];
  sessions: Session[];
  hostels: Hostel[];
  bookings: Booking[];
  rentals: RentalProperty[];
  rentalInquiries: RentalInquiry[];
  coupons: Coupon[];
  reviews: Review[];
  articles: Article[];
  phrases: TravelPhrase[];
  auditLogs: AuditLog[];
  settings: {
    immediateRequestTimeoutMinutes: number;
    allowTravelerRegistration: boolean;
    emergencyHotline: string;
    telegramSupport: string;
    supportWorkingHoursFa: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'yerevanhub.json');

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export function generateShortCode(prefix = 'YVN'): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

let inMemoryDb: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (inMemoryDb) return inMemoryDb;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(data);
      return inMemoryDb!;
    } catch (e) {
      console.error('Error reading db file, falling back to seed data:', e);
    }
  }

  inMemoryDb = createSeedDatabase();
  saveDb(inMemoryDb);
  return inMemoryDb;
}

export function saveDb(db: AppDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp-${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
  inMemoryDb = db;
}

export function logAudit(
  actor: { id: string; name: string; role: string },
  action: string,
  targetType: string,
  targetId: string,
  details: string
): void {
  const db = getDb();
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    details,
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDb(db);
}

function createSeedDatabase(): AppDatabase {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const managerSalt = crypto.randomBytes(16).toString('hex');
  const travelerSalt = crypto.randomBytes(16).toString('hex');

  const users: User[] = [
    {
      id: 'user-admin-1',
      email: 'admin@yerevanhub.com',
      passwordHash: hashPassword('Admin@2026', adminSalt),
      salt: adminSalt,
      name: 'مدیریت کل YEREVANHUB',
      role: 'admin',
      phone: '+374 91 000000',
      createdAt: '2026-01-01T00:00:00Z',
      isActive: true,
    },
    {
      id: 'user-manager-1',
      email: 'manager.kentron@yerevanhub.com',
      passwordHash: hashPassword('Hostel@2026', managerSalt),
      salt: managerSalt,
      name: 'آرمن سارکیسیان (هاستل مرکزی)',
      role: 'hostel_manager',
      phone: '+374 93 111222',
      assignedHostelIds: ['hostel-1'],
      createdAt: '2026-01-10T00:00:00Z',
      isActive: true,
    },
    {
      id: 'user-manager-2',
      email: 'manager.cascade@yerevanhub.com',
      passwordHash: hashPassword('Hostel@2026', managerSalt),
      salt: managerSalt,
      name: 'آنا هاوانسیان (هاستل کاسکاد)',
      role: 'hostel_manager',
      phone: '+374 94 333444',
      assignedHostelIds: ['hostel-2'],
      createdAt: '2026-01-15T00:00:00Z',
      isActive: true,
    },
    {
      id: 'user-manager-3',
      email: 'manager.nomad@yerevanhub.com',
      passwordHash: hashPassword('Hostel@2026', managerSalt),
      salt: managerSalt,
      name: 'داویت گریگوریان (نومد هاب)',
      role: 'hostel_manager',
      phone: '+374 95 555666',
      assignedHostelIds: ['hostel-3'],
      createdAt: '2026-02-01T00:00:00Z',
      isActive: true,
    },
    {
      id: 'user-manager-4',
      email: 'manager.gyumri@yerevanhub.com',
      passwordHash: hashPassword('Hostel@2026', managerSalt),
      salt: managerSalt,
      name: 'گاریک پطروسیان (گیومری هریتیج)',
      role: 'hostel_manager',
      phone: '+374 98 777888',
      assignedHostelIds: ['hostel-4'],
      createdAt: '2026-02-15T00:00:00Z',
      isActive: true,
    },
    {
      id: 'user-traveler-1',
      email: 'traveler@example.com',
      passwordHash: hashPassword('Traveler@2026', travelerSalt),
      salt: travelerSalt,
      name: 'سهراب مرادی',
      role: 'traveler',
      phone: '+98 912 345 6789',
      createdAt: '2026-03-01T00:00:00Z',
      isActive: true,
    },
  ];

  const hostels: Hostel[] = [
    {
      id: 'hostel-1',
      slug: 'yerevan-central-eco-hostel',
      name: {
        fa: 'هاستل مرکزی اکو ایروان',
        en: 'Yerevan Central Eco Hostel',
        ru: 'Центральный Эко Хостел Ереван',
        hy: 'Երևան Կենտրոն Էկո Հոսթել',
      },
      city: 'Yerevan',
      district: 'Kentron',
      address: {
        fa: 'ایروان، ناحیه کنترون، خیابان نعلبندیان، کوچه ۲، پلاک ۱۴ (۳۰۰ متری میدان جمهوری)',
        en: '14 Nalbandyan St, Lane 2, Kentron, Yerevan (300m from Republic Square)',
        ru: 'Ереван, Кентрон, ул. Налбандяна, тупик 2, дом 14',
        hy: 'Երևան, Կենտրոն, Նալբանդյան փող., նրբ. 2, շենք 14',
      },
      addressArmenianForTaxi: 'Երևան, Նալբանդյան 14, Հանրապետության հրապարակի մոտ',
      coordinates: { lat: 40.1785, lng: 44.5152 },
      phone: '+374 10 523456',
      whatsapp: '+374 91 523456',
      telegram: '@yerevancentralhostel',
      email: 'info@yerevancentralhostel.am',
      photos: [
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520277739336-7bf67edfa768?auto=format&fit=crop&w=1200&q=80',
      ],
      entrancePhoto: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80',
      directionsFa: 'ورودی از داخل کوچه بن‌بست نعلبندیان، زنگ طبقه دوم پلاک ۱۴، روبروی کافه گرین پوینت.',
      directionsHy: 'Մուտքը Նալբանդյան փողոցի նրբանցքից, 2-րդ հարկ, զանգ 14:',
      floorAndDoorCode: 'طبقه ۲، کد درب ورودی: #2026',
      minPricePerNightAMD: 4500,
      reception24h: true,
      checkInStandardTime: '14:00',
      checkOutStandardTime: '11:00',
      earlyCheckInAvailable: true,
      earlyCheckInFeeAMD: 2000,
      lateArrivalAvailable: true,
      lateArrivalFeeAMD: 0,
      immediateStayEnabled: true,
      immediateStayExpiresAt: '2026-12-31T23:59:59Z',
      freeLuggageStorage: true,
      waitingLoungeAvailable: true,
      languagesSpoken: ['fa', 'en', 'ru', 'hy'],
      amenities: {
        wifi: true,
        lockers: true,
        requiresPersonalPadlock: false,
        kitchen: true,
        hotWater24h: true,
        linenIncluded: true,
        elevator: true,
        stairsCount: 0,
        airConditioning: true,
        breakfastAvailable: true,
        breakfastPriceAMD: 1500,
        laundry: true,
        coworking: true,
      },
      rules: {
        quietHours: '۲۳:۰۰ تا ۰۸:۰۰',
        smokingAllowed: false,
        petsAllowed: false,
        cancellationPolicy: 'لغو رایگان تا ۲۴ ساعت قبل از موعد ورود بدون جریمه.',
        acceptedPaymentMethodsOnArrival: ['درام نقد (AMD)', 'کارت بانکی ارمنستان', 'روبل/دلار با نرخ صرافی روز'],
      },
      roomTypes: [
        {
          id: 'rt-1-mixed-8',
          name: {
            fa: 'تخت در اتاق خوابگاه ۸ تخته اشتراکی (مختلط)',
            en: 'Bed in 8-Bed Mixed Dormitory',
            ru: 'Кровать в 8-местном общем номере',
            hy: 'Մահճակալ 8-տեղանոց ընդհանուր սենյակում',
          },
          type: 'dorm_mixed',
          totalBedsOrRooms: 8,
          pricePerNightAMD: 4500,
          hasCurtain: true,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: false,
          description: {
            fa: 'دارای پرده اختصاصی دور تخت، پریز و چراغ مطالعه اختصاصی، تشک طبی و کمد قفل‌دار رمزی.',
            en: 'Privacy curtains, personal reading lamp, individual power outlet, and keyless locker.',
            ru: 'Шторки для приватности, розетка, светильник и шкафчик с кодовым замком.',
            hy: 'Առանձնացված վարագույր, անհատական լույս և վարդակ, կոդային պահարան:',
          },
        },
        {
          id: 'rt-1-female-6',
          name: {
            fa: 'تخت در اتاق ۶ تخته ویژه بانوان',
            en: 'Bed in 6-Bed Female Dormitory',
            ru: 'Кровать в 6-местном женском номере',
            hy: 'Մահճակալ 6-տեղանոց կանանց սենյակում',
          },
          type: 'dorm_female',
          totalBedsOrRooms: 6,
          pricePerNightAMD: 5200,
          hasCurtain: true,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: false,
          description: {
            fa: 'محیط آرام ویژه بانوان با بالکن رو به حیاط، آینه قدی، سشوار و حمام اختصاصی داخل راهرو.',
            en: 'Calm female-only dorm with courtyard balcony, full-length mirror and hairdryer.',
            ru: 'Уютный женский номер с балконом, большим зеркалом и феном.',
            hy: 'Հանգիստ կանանց սենյակ պատշգամբով և հարմարություններով:',
          },
        },
        {
          id: 'rt-1-private-double',
          name: {
            fa: 'اتاق خصوصی دونفره با تخت دبل',
            en: 'Private Double Room',
            ru: 'Отдельный двухместный номер',
            hy: 'Առանձին երկտեղանոց սենյակ',
          },
          type: 'private',
          totalBedsOrRooms: 3,
          pricePerNightAMD: 18000,
          hasBedsidePlug: true,
          description: {
            fa: 'اتاق مستقل دو نفره با تخت دبل بزرگ، میز کار، کمد لباس و تلویزیون هوشمند.',
            en: 'Private double room with queen bed, workstation, closet and smart TV.',
            ru: 'Отдельный номер с двуспальной кроватью, рабочим столом и шкафом.',
            hy: 'Առանձին երկտեղանոց սենյակ մեծ մահճակալով և աշխատանքային սեղանով:',
          },
        },
      ],
      isPublished: true,
      createdAt: '2026-01-10T12:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'hostel-2',
      slug: 'cascade-art-view-hostel',
      name: {
        fa: 'هاستل هنر و چشم‌انداز کاسکاد',
        en: 'Cascade Art & View Hostel',
        ru: 'Каскад Арт Хостел',
        hy: 'Կասկադ Արտ և Վյու Հոսթել',
      },
      city: 'Yerevan',
      district: 'Kentron',
      address: {
        fa: 'ایروان، ناحیه کنترون، خیابان آنتارایین، پلاک ۸ (بالاتر از پله‌های کاسکاد)',
        en: '8 Antarayin St, Kentron, Yerevan (Above Cascade Monument)',
        ru: 'Ереван, Кентрон, ул. Антараин 8',
        hy: 'Երևան, Կենտրոն, Անտառային փող. 8',
      },
      addressArmenianForTaxi: 'Երևան, Անտառային 8, Կասկադի վերևում',
      coordinates: { lat: 40.1945, lng: 44.5165 },
      phone: '+374 10 584930',
      email: 'cascadehostel@gmail.com',
      photos: [
        'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      ],
      entrancePhoto: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      directionsFa: 'بالای کاسکاد، درب چوبی قهوه‌ای بزرگ با تابلوی برنزی YEREVANHUB.',
      directionsHy: 'Կասկադի վերևում, մեծ շագանակագույն փայտե դուռ:',
      floorAndDoorCode: 'طبقه ۱، کد ورودی: 1840',
      minPricePerNightAMD: 5000,
      reception24h: false,
      receptionOpenTime: '08:00',
      receptionCloseTime: '23:30',
      checkInStandardTime: '14:00',
      checkOutStandardTime: '11:00',
      earlyCheckInAvailable: true,
      earlyCheckInFeeAMD: 2500,
      lateArrivalAvailable: true,
      lateArrivalFeeAMD: 1500, // Fee if arriving after reception closes at 23:30
      immediateStayEnabled: false, // Requires advance arrangement
      freeLuggageStorage: true,
      waitingLoungeAvailable: true,
      languagesSpoken: ['en', 'ru', 'hy'],
      amenities: {
        wifi: true,
        lockers: true,
        requiresPersonalPadlock: true,
        kitchen: true,
        hotWater24h: true,
        linenIncluded: true,
        elevator: false,
        stairsCount: 24,
        airConditioning: true,
        breakfastAvailable: false,
        laundry: true,
        coworking: true,
      },
      rules: {
        quietHours: '۲۳:۰۰ تا ۰۹:۰۰',
        smokingAllowed: false,
        petsAllowed: false,
        cancellationPolicy: 'لغو رایگان تا ۴۸ ساعت قبل از موعد ورود.',
        acceptedPaymentMethodsOnArrival: ['درام نقد (AMD)', 'کارت خوان بانکی'],
      },
      roomTypes: [
        {
          id: 'rt-2-mixed-6',
          name: {
            fa: 'تخت در اتاق ۶ تخته دید به شهر',
            en: 'Bed in 6-Bed City View Dorm',
            ru: 'Кровать в 6-местном номере с видом на город',
            hy: 'Մահճակալ 6-տեղանոց սենյակում քաղաքի տեսարանով',
          },
          type: 'dorm_mixed',
          totalBedsOrRooms: 6,
          pricePerNightAMD: 5000,
          hasCurtain: true,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: true,
          description: {
            fa: 'چشم‌انداز پانوراما به شهر ایروان و کوه آرارات در روزهای آفتابی.',
            en: 'Panoramic view of Yerevan city and Mount Ararat on clear days.',
            ru: 'Панорамный вид на Ереван и гору Арарат.',
            hy: 'Հիանալի տեսարան դեպի Երևան և Արարատ լեռ:',
          },
        },
      ],
      isPublished: true,
      createdAt: '2026-01-15T12:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
    },
    {
      id: 'hostel-3',
      slug: 'nomad-hub-coliving-yerevan',
      name: {
        fa: 'نومد هاب و کولیوینگ ایروان',
        en: 'Nomad Hub & Co-Living Yerevan',
        ru: 'Номад Хаб и Коливинг Ереван',
        hy: 'Նոմադ Հաբ և Քոլիվինգ Երևան',
      },
      city: 'Yerevan',
      district: 'Arabkir',
      address: {
        fa: 'ایروان، ناحیه عربکیر، خیابان کومیتاس، پلاک ۴۹ (نزدیک ایستگاه مترو بارکاموتیون)',
        en: '49 Komitas Ave, Arabkir, Yerevan (Near Barekamutyun Metro)',
        ru: 'Ереван, Арабкир, пр. Комитаса 49',
        hy: 'Երևան, Արաբկիր, Կոմիտասի պող. 49',
      },
      addressArmenianForTaxi: 'Երևան, Կոմիտաս 49, Բարեկամություն մետրոյի մոտ',
      coordinates: { lat: 40.2031, lng: 44.4982 },
      phone: '+374 95 555666',
      whatsapp: '+374 95 555666',
      email: 'stay@nomadhub.am',
      photos: [
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      ],
      entrancePhoto: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
      directionsFa: 'ورودی تجاری طبقه همکف، درب شیشه‌ای با نشان نئون نارنجی Nomad Hub.',
      directionsHy: 'Առաջին հարկ, ապակե մուտք նարնջագույն նեոնային լոգոյով:',
      floorAndDoorCode: 'طبقه همکف، پذیرش ۲۴ ساعته',
      minPricePerNightAMD: 6000,
      reception24h: true,
      checkInStandardTime: '14:00',
      checkOutStandardTime: '12:00',
      earlyCheckInAvailable: true,
      earlyCheckInFeeAMD: 0, // Free if bed is clean
      lateArrivalAvailable: true,
      lateArrivalFeeAMD: 0,
      immediateStayEnabled: true,
      immediateStayExpiresAt: '2026-12-31T23:59:59Z',
      freeLuggageStorage: true,
      waitingLoungeAvailable: true,
      languagesSpoken: ['fa', 'en', 'ru'],
      amenities: {
        wifi: true,
        lockers: true,
        requiresPersonalPadlock: false,
        kitchen: true,
        hotWater24h: true,
        linenIncluded: true,
        elevator: true,
        stairsCount: 0,
        airConditioning: true,
        breakfastAvailable: true,
        breakfastPriceAMD: 2000,
        laundry: true,
        coworking: true,
      },
      rules: {
        quietHours: '۰۰:۰۰ تا ۰۸:۰۰',
        smokingAllowed: false,
        petsAllowed: true,
        cancellationPolicy: 'لغو انعطاف‌پذیر تا ۱۲ ساعت قبل از ورود.',
        acceptedPaymentMethodsOnArrival: ['درام نقد (AMD)', 'کارت‌های بین‌المللی', 'رمزارز USDT'],
      },
      roomTypes: [
        {
          id: 'rt-3-pod-dorm',
          name: {
            fa: 'کپسول خواب اختصاصی در سالن آرامش',
            en: 'Private Sleep Pod in Quiet Lounge',
            ru: 'Индивидуальная капсула для сна',
            hy: 'Անհատական քնելու պարկուճ',
          },
          type: 'dorm_mixed',
          totalBedsOrRooms: 12,
          pricePerNightAMD: 6000,
          hasCurtain: true,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: false,
          description: {
            fa: 'کپسول چوبی عایق صدا، تهویه مستقل، اینترنت گیگابیتی و دسترسی نامحدود به میزهای کار اشتراکی.',
            en: 'Sound-insulated wooden pod, individual air vent, gigabit WiFi, and coworking access.',
            ru: 'Шумоизолированная капсула, вентиляция, гигабитный интернет и коворкинг.',
            hy: 'Ձայնամեկուսիչ փայտե պարկուճ, օդափոխություն և գերարագ ինտերնետ:',
          },
        },
      ],
      isPublished: true,
      createdAt: '2026-02-01T12:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'hostel-4',
      slug: 'gyumri-heritage-travelers-house',
      name: {
        fa: 'خانه مسافران میراث گیومری',
        en: 'Gyumri Heritage Travelers House',
        ru: 'Гюмри Херитедж Дом Путешественников',
        hy: 'Գյումրի Հերիթիջ Ճանապարհորդների Տուն',
      },
      city: 'Gyumri',
      district: 'Historical Center',
      address: {
        fa: 'گیومری، بافت تاریخی، خیابان روستاولی، کوچه ۴، پلاک ۱۸',
        en: '18 Rustaveli St, Lane 4, Historical Center, Gyumri',
        ru: 'Гюмри, Исторический центр, ул. Руставели 18',
        hy: 'Գյումրի, Պատմական կենտրոն, Ռուսթավելու 18',
      },
      addressArmenianForTaxi: 'Գյումրի, Ռուսթավելու 18, Պատմական կենտրոն',
      coordinates: { lat: 40.7852, lng: 43.8415 },
      phone: '+374 312 40050',
      email: 'gyumri.heritage@gmail.com',
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      ],
      directionsFa: 'ساختمان سنگ سیاه سنتی ارمنی در بافت پیاده‌راه تاریخی روستاولی، جنب گالری عکاسی.',
      directionsHy: 'Սև տուֆից պատմական շենք Ռուսթավելու հետիոտնային փողոցում:',
      floorAndDoorCode: 'طبقه ۱، زنگ شماره ۱',
      minPricePerNightAMD: 4000,
      reception24h: false,
      receptionOpenTime: '08:30',
      receptionCloseTime: '22:00',
      checkInStandardTime: '14:00',
      checkOutStandardTime: '11:00',
      earlyCheckInAvailable: true,
      earlyCheckInFeeAMD: 1500,
      lateArrivalAvailable: false,
      lateArrivalFeeAMD: 0,
      immediateStayEnabled: false,
      freeLuggageStorage: true,
      waitingLoungeAvailable: true,
      languagesSpoken: ['en', 'ru', 'hy'],
      amenities: {
        wifi: true,
        lockers: true,
        requiresPersonalPadlock: true,
        kitchen: true,
        hotWater24h: true,
        linenIncluded: true,
        elevator: false,
        stairsCount: 12,
        airConditioning: false,
        breakfastAvailable: true,
        breakfastPriceAMD: 1800,
        laundry: true,
        coworking: false,
      },
      rules: {
        quietHours: '۲۲:۳۰ تا ۰۸:۰۰',
        smokingAllowed: false,
        petsAllowed: false,
        cancellationPolicy: 'لغو تا ۲۴ ساعت قبل با استرداد کامل.',
        acceptedPaymentMethodsOnArrival: ['فقط درام نقد (AMD)'],
      },
      roomTypes: [
        {
          id: 'rt-4-dorm-6',
          name: {
            fa: 'تخت در خوابگاه ۶ نفره سنتی',
            en: 'Bed in 6-Bed Traditional Dorm',
            ru: 'Кровать в 6-местном традиционном номере',
            hy: 'Մահճակալ 6-տեղանոց ավանդական սենյակում',
          },
          type: 'dorm_mixed',
          totalBedsOrRooms: 6,
          pricePerNightAMD: 4000,
          hasCurtain: false,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: true,
          description: {
            fa: 'اتاق با معماری سنتی توف سیاه گیومری و سقف چوبی بلند.',
            en: 'Traditional black tuff stone room with high wooden ceiling.',
            ru: 'Традиционная комната из черного туфа с высоким потолком.',
            hy: 'Ավանդական սև տուֆից սենյակ բարձր փայտե առաստաղով:',
          },
        },
      ],
      isPublished: true,
      createdAt: '2026-02-15T12:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z',
    },
  ];

  const rentals: RentalProperty[] = [
    {
      id: 'rental-1',
      slug: 'luxury-2bed-northern-avenue-opera',
      title: {
        fa: 'آپارتمان لوکس دوخوابه در خیابان نورتورن اونیو (روبروی اپرا)',
        en: 'Luxury 2-Bedroom Apartment on Northern Avenue',
        ru: 'Роскошная 2-комнатная квартира на Северном проспекте',
        hy: 'Շքեղ 2-սենյականոց բնակարան Հյուսիսային պողոտայում',
      },
      propertyType: 'apartment',
      rentalType: 'both',
      city: 'Yerevan',
      neighborhood: 'Kentron (Northern Avenue)',
      approximateLocationLabel: 'خیابان نورتورن اونیو، ۲ دقیقه‌ای تا میدان جمهوری و تئاتر اپرا',
      addressPublic: 'ایروان، ناحیه کنترون، پیاده‌راه خیابان شمالی',
      addressExactInternal: 'ایروان، خیابان شمالی، ساختمان ۱۰، ورودی شرقی، طبقه ۴، واحد ۲۱ (مالک: آرتاک گریگوریان)',
      photos: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      ],
      areaSqm: 88,
      floor: 4,
      totalFloors: 9,
      hasElevator: true,
      bedroomsCount: 2,
      bedsCount: 3,
      bathroomsCount: 2,
      maxResidents: 4,
      isFurnished: true,
      pricePerNightAMD: 32000,
      pricePerMonthAMD: 450000,
      minStayNights: 2,
      minStayMonths: 1,
      refundableDepositAMD: 150000,
      depositTerms: 'ودیعه در هنگام تحویل کلید دریافت و در پایان اقامت پس از بررسی سلامت وسایل عودت داده می‌شود.',
      commissionType: 'none_direct',
      commissionAmountText: 'بدون کمیسیون (مستقیم با هماهنگی مدیریت YEREVANHUB)',
      cleaningFeeAMD: 8000,
      utilitiesBreakdown: {
        electricity: 'meter_reading',
        water: 'tenant',
        gas: 'meter_reading',
        internet: 'included',
        buildingMaintenance: 'included',
      },
      amenities: {
        wifi: true,
        ac: true,
        centralHeating: true,
        washingMachine: true,
        dishwasher: true,
        balcony: true,
        parking: true,
        petFriendly: false,
      },
      verifiedBadge: true,
      verifiedExplanation: 'تأییدشده توسط کارشناس YEREVANHUB: بررسی حضوری سند، کارکرد سیستم گرمایش/سرمایش و راستی‌آزمایی تصاویر در اکتبر ۲۰۲۶.',
      providerType: 'direct_owner',
      landlordInternalNotes: 'مالک: آرتاک گریگوریان (+374 91 123456). هماهنگی بازدید نیازمند اطلاع از ۲۴ ساعت قبل است.',
      status: 'published',
      lastCheckedAt: '2026-10-18T10:00:00Z',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
    },
    {
      id: 'rental-2',
      slug: 'cozy-1bed-baghramyan-cascade',
      title: {
        fa: 'آپارتمان نورگیر تک‌خوابه دنج نزدیک پارک باقرامیان و کاسکاد',
        en: 'Sunny 1-Bedroom Apartment near Baghramyan Park & Cascade',
        ru: 'Уютная 1-комнатная квартира возле парка Баграмяна',
        hy: 'Լուսավոր 1-սենյականոց բնակարան Բաղրամյանի մոտ',
      },
      propertyType: 'apartment',
      rentalType: 'long_term',
      city: 'Yerevan',
      neighborhood: 'Kentron (Baghramyan)',
      approximateLocationLabel: 'خیابان باقرامیان، جنب ایستگاه مترو، ۵ دقیقه پیاده تا کاسکاد',
      addressPublic: 'ایروان، ناحیه کنترون، خیابان مارشال باقرامیان',
      addressExactInternal: 'ایروان، باقرامیان پلاک ۱۹، ورودی ۲، طبقه ۲، واحد ۷ (مالک: مری کاراپتیان)',
      photos: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      ],
      areaSqm: 56,
      floor: 2,
      totalFloors: 5,
      hasElevator: false,
      bedroomsCount: 1,
      bedsCount: 1,
      bathroomsCount: 1,
      maxResidents: 2,
      isFurnished: true,
      pricePerMonthAMD: 260000,
      minStayMonths: 3,
      refundableDepositAMD: 100000,
      depositTerms: 'ودیعه به مبلغ ۱۰۰٬۰۰۰ درام معادل هزینه تضمین ودیعه که در صورت حفظ شرایط قرارداد بازگردانده می‌شود.',
      commissionType: 'none_direct',
      commissionAmountText: 'مستقیم بدون کمیسیون آژانس املاک',
      cleaningFeeAMD: 0,
      utilitiesBreakdown: {
        electricity: 'tenant',
        water: 'tenant',
        gas: 'tenant',
        internet: 'included',
        buildingMaintenance: 'included',
      },
      amenities: {
        wifi: true,
        ac: true,
        centralHeating: true,
        washingMachine: true,
        dishwasher: false,
        balcony: true,
        parking: false,
        petFriendly: true,
      },
      verifiedBadge: true,
      verifiedExplanation: 'تأییدشده توسط تیم YEREVANHUB: بررسی حضوری و اعتبارسنجی مالکیت در مهرماه ۱۴۰۵ (اکتبر ۲۰۲۶).',
      providerType: 'direct_owner',
      landlordInternalNotes: 'مالک مری کاراپتیان (+374 93 456789) - مایل به عقد قرارداد ۶ ماهه یا ۱ ساله با اتباع خارجی.',
      status: 'published',
      lastCheckedAt: '2026-10-15T12:00:00Z',
      createdAt: '2026-02-10T00:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
    },
    {
      id: 'rental-3',
      slug: 'modern-studio-arabkir-barekamutyun',
      title: {
        fa: 'استودیو مدرن و بازسازی‌شده در عربکیر نزدیک مترو بارکاموتیون',
        en: 'Renovated Modern Studio in Arabkir near Barekamutyun Metro',
        ru: 'Современная студия в Арабкире возле метро',
        hy: 'Ժամանակակից ստուդիա Արաբկիրում',
      },
      propertyType: 'studio',
      rentalType: 'both',
      city: 'Yerevan',
      neighborhood: 'Arabkir',
      approximateLocationLabel: 'خیابان هراچیا کوچار، ۲۰۰ متری مترو بارکاموتیون',
      addressPublic: 'ایروان، ناحیه عربکیر، خیابان هراچیا کوچار',
      addressExactInternal: 'ایروان، عربکیر، خ کوچار پلاک ۲۴، واحد ۱۲',
      photos: [
        'https://images.unsplash.com/photo-1502005229762-ee1b2b814421?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
      ],
      areaSqm: 42,
      floor: 3,
      totalFloors: 12,
      hasElevator: true,
      bedroomsCount: 1,
      bedsCount: 1,
      bathroomsCount: 1,
      maxResidents: 2,
      isFurnished: true,
      pricePerNightAMD: 17000,
      pricePerMonthAMD: 195000,
      minStayNights: 2,
      minStayMonths: 1,
      refundableDepositAMD: 60000,
      depositTerms: 'ودیعه قابل بازگشت در هنگام تحویل کلید و تسویه هزینه‌ها.',
      commissionType: 'none_direct',
      commissionAmountText: 'صفر درام کمیسیون',
      cleaningFeeAMD: 5000,
      utilitiesBreakdown: {
        electricity: 'meter_reading',
        water: 'included',
        gas: 'meter_reading',
        internet: 'included',
        buildingMaintenance: 'included',
      },
      amenities: {
        wifi: true,
        ac: true,
        centralHeating: true,
        washingMachine: true,
        dishwasher: false,
        balcony: false,
        parking: true,
        petFriendly: false,
      },
      verifiedBadge: true,
      verifiedExplanation: 'بررسی سلامت کنتورها، اینترنت فیبر نوری و تأسیسات توسط بازرس پلتفرم.',
      providerType: 'direct_owner',
      landlordInternalNotes: 'مالک ساکن طبقه اول است. اینترنت فیبر ۲۰۰ مگابیت.',
      status: 'published',
      lastCheckedAt: '2026-10-12T09:00:00Z',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-10-12T09:00:00Z',
    },
    {
      id: 'rental-4',
      slug: 'wooden-villa-cottage-dilijan-mountains',
      title: {
        fa: 'ویلای چوبی کوهستانی ۳ خوابه در جنگل‌های دیلیجان',
        en: 'Scenic 3-Bedroom Wooden Villa in Dilijan Forest',
        ru: 'Живописная 3-комнатная деревянная вилла в Дилижане',
        hy: 'Գեղատեսիլ 3-սենյականոց փայտե վիլլա Դիլիջանում',
      },
      propertyType: 'villa',
      rentalType: 'short_term',
      city: 'Dilijan',
      neighborhood: 'Forest Reserve Area',
      approximateLocationLabel: 'دیلیجان، جاده قدیم دریاچه سوان، منطقه حفاظت‌شده',
      addressPublic: 'دیلیجان، منطقه جنگلی، خیابان کالینین',
      addressExactInternal: 'دیلیجان، خیابان کالینین، پلاک ۴۱ (مالک: سورن ملکونیان)',
      photos: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      ],
      areaSqm: 165,
      floor: 1,
      totalFloors: 2,
      hasElevator: false,
      bedroomsCount: 3,
      bedsCount: 5,
      bathroomsCount: 2,
      maxResidents: 8,
      isFurnished: true,
      pricePerNightAMD: 48000,
      minStayNights: 1,
      refundableDepositAMD: 50000,
      depositTerms: 'ودیعه ۵۰٬۰۰۰ درام نقدی که در زمان خروج عودت داده می‌شود.',
      commissionType: 'none_direct',
      commissionAmountText: 'رزرو مستقیم',
      cleaningFeeAMD: 10000,
      utilitiesBreakdown: {
        electricity: 'included',
        water: 'included',
        gas: 'included',
        internet: 'included',
        buildingMaintenance: 'included',
      },
      amenities: {
        wifi: true,
        ac: false,
        centralHeating: true,
        washingMachine: true,
        dishwasher: true,
        balcony: true,
        parking: true,
        petFriendly: true,
      },
      verifiedBadge: true,
      verifiedExplanation: 'بررسی ایمنی شومینه، سیستم گرمایشی و مسیر دسترسی خودرو در پاییز ۲۰۲۶.',
      providerType: 'direct_owner',
      landlordInternalNotes: 'دارای آلاچیق، منقل باربیکیو و هیزم آماده.',
      status: 'published',
      lastCheckedAt: '2026-10-10T14:00:00Z',
      createdAt: '2026-03-05T00:00:00Z',
      updatedAt: '2026-10-10T14:00:00Z',
    },
  ];

  const coupons: Coupon[] = [
    {
      code: 'WELCOME10',
      percent: 10,
      minAmountAMD: 0,
      maxUses: 1000,
      usedCount: 34,
      active: true,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
      description: '۱۰ درصد تخفیف ویژه خوش‌آمدگویی برای اولین اقامت در هاستل‌های YEREVANHUB',
    },
    {
      code: 'SUMMER20',
      percent: 20,
      minAmountAMD: 25000,
      maxUses: 50,
      usedCount: 14,
      active: true,
      startsAt: '2026-05-01T00:00:00Z',
      expiresAt: '2026-11-30T23:59:59Z',
      description: '۲۰ درصد تخفیف ویژه برای اقامت‌های بالاتر از ۲۵٬۰۰۰ درام',
    },
    {
      code: 'EXPIRED50',
      percent: 50,
      minAmountAMD: 10000,
      maxUses: 20,
      usedCount: 20,
      active: false,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-09-01T00:00:00Z',
      description: 'کد منقضی‌شده جهت آزمایش سامانه اعتبارسنجی تخفیف',
    },
  ];

  const bookings: Booking[] = [
    {
      id: 'book-seed-1',
      trackingCode: 'YVN-1042',
      privateToken: 'token-guest-yvn-1042-demo',
      hostelId: 'hostel-1',
      hostelName: 'هاستل مرکزی اکو ایروان',
      roomTypeId: 'rt-1-mixed-8',
      roomTypeName: 'تخت در خوابگاه ۸ تخته اشتراکی (مختلط)',
      guestName: 'سهراب مرادی',
      contactType: 'phone',
      guestContact: '+98 912 345 6789',
      checkIn: '2026-10-23',
      checkOut: '2026-10-26',
      nights: 3,
      guestsCount: 1,
      quantity: 1,
      estimatedArrivalTime: '18:00',
      specialRequests: 'تخت طبقه پایین در صورت امکان ترجیح داده می‌شود.',
      isLowerBunkRequested: true,
      isImmediateArrival: false,
      isOvernightArrival: false,
      earlyCheckInFeeAMD: 0,
      lateCheckInFeeAMD: 0,
      extraServicesFeeAMD: 0,
      baseAmountAMD: 13500,
      discountPercent: 10,
      discountAmountAMD: 1350,
      finalAmountAMD: 12150,
      couponCode: 'WELCOME10',
      status: 'confirmed',
      confirmedAt: '2026-10-22T02:00:00Z',
      travelerUserId: 'user-traveler-1',
      createdAt: '2026-10-22T01:30:00Z',
      updatedAt: '2026-10-22T02:00:00Z',
      expiresAt: '2026-10-22T03:30:00Z',
    },
    {
      id: 'book-seed-2',
      trackingCode: 'YVN-8821',
      privateToken: 'token-guest-yvn-8821-urgent',
      hostelId: 'hostel-1',
      hostelName: 'هاستل مرکزی اکو ایروان',
      roomTypeId: 'rt-1-mixed-8',
      roomTypeName: 'تخت در خوابگاه ۸ تخته اشتراکی (مختلط)',
      guestName: 'علی رضایی',
      contactType: 'phone',
      guestContact: '+98 935 999 1122',
      checkIn: '2026-10-22',
      checkOut: '2026-10-23',
      nights: 1,
      guestsCount: 1,
      quantity: 1,
      estimatedArrivalTime: '03:30 (همین حالا / ورود شبانه)',
      specialRequests: 'تازه از اتوبوس ترمینال کیلیکیا پیاده شدم و همین حالا جا می‌خواهم.',
      isLowerBunkRequested: false,
      isImmediateArrival: true,
      isOvernightArrival: true,
      earlyCheckInFeeAMD: 0,
      lateCheckInFeeAMD: 0,
      extraServicesFeeAMD: 0,
      baseAmountAMD: 4500,
      discountPercent: 0,
      discountAmountAMD: 0,
      finalAmountAMD: 4500,
      status: 'pending',
      createdAt: '2026-10-22T03:30:00Z',
      updatedAt: '2026-10-22T03:30:00Z',
      expiresAt: '2026-10-22T04:00:00Z', // 30-min urgent window
    },
    {
      id: 'book-seed-3',
      trackingCode: 'YVN-6712',
      privateToken: 'token-guest-yvn-6712-completed',
      hostelId: 'hostel-1',
      hostelName: 'هاستل مرکزی اکو ایروان',
      roomTypeId: 'rt-1-female-6',
      roomTypeName: 'تخت در اتاق ۶ تخته ویژه بانوان',
      guestName: 'مریم احمدی',
      contactType: 'email',
      guestContact: 'maryam.a@gmail.com',
      checkIn: '2026-10-15',
      checkOut: '2026-10-18',
      nights: 3,
      guestsCount: 1,
      quantity: 1,
      baseAmountAMD: 15600,
      discountPercent: 0,
      discountAmountAMD: 0,
      finalAmountAMD: 15600,
      status: 'completed',
      reviewId: 'rev-1',
      createdAt: '2026-10-14T10:00:00Z',
      updatedAt: '2026-10-18T11:00:00Z',
      expiresAt: '2026-10-14T12:00:00Z',
    },
  ];

  const reviews: Review[] = [
    {
      id: 'rev-1',
      bookingId: 'book-seed-3',
      hostelId: 'hostel-1',
      hostelName: 'هاستل مرکزی اکو ایروان',
      guestName: 'مریم احمدی',
      rating: 5,
      comment: 'بسیار تمیز و مرتب بود. برخورد کارکنان صمیمانه بود و پرسنل به فارسی هم مسلط بودند که برای من خیلی کمک‌کننده بود. موقعیت مکانی هاستل عالی و نزدیک میدان جمهوری است.',
      status: 'approved',
      adminReply: 'از نظر پرمهرتان سپاسگزاریم مریم عزیز. خوشحالیم که اقامت خوبی در هاستل مرکزی اکو ایروان داشتید.',
      createdAt: '2026-10-19T09:00:00Z',
    },
    {
      id: 'rev-2',
      bookingId: 'book-seed-past-demo',
      hostelId: 'hostel-3',
      hostelName: 'نومد هاب و کولیوینگ ایروان',
      guestName: 'David K.',
      rating: 5,
      comment: 'The best coworking hostel in Yerevan! Fast fiber internet, quiet sleeping pods, and very friendly international community.',
      status: 'approved',
      adminReply: 'Thanks David! Always a pleasure having remote workers at Nomad Hub.',
      createdAt: '2026-10-10T14:30:00Z',
    },
    {
      id: 'rev-3-pending',
      bookingId: 'book-seed-pending-mod',
      hostelId: 'hostel-2',
      hostelName: 'هاستل هنر و چشم‌انداز کاسکاد',
      guestName: 'امید قاسمی',
      rating: 4,
      comment: 'چشم‌انداز شهر فوق‌العاده است و هوا در کاسکاد بسیار خنک و دلپذیر بود. پله‌ها برای چمدان سنگین کمی چالش‌برانگیز بود اما ارزش منظره را داشت.',
      status: 'pending', // Requires admin moderation
      createdAt: '2026-10-21T16:00:00Z',
    },
  ];

  const rentalInquiries: RentalInquiry[] = [
    {
      id: 'rinq-1',
      trackingCode: 'YVN-RNT-101',
      privateToken: 'token-rental-inq-101',
      propertyId: 'rental-1',
      propertyTitle: 'آپارتمان لوکس دوخوابه در خیابان نورتورن اونیو (روبروی اپرا)',
      guestName: 'کامران بهرامی',
      contact: '+98 912 888 7766',
      requestType: 'visit',
      proposedVisitDate: '2026-10-24 ساعت ۱۷:۰۰',
      residentsCount: 2,
      notes: 'قصد اقامت ۶ ماهه برای کار دورکاری دارم. مایلم آپارتمان و وضعیت اینترنت را حضوری بازدید کنم.',
      status: 'coordinating',
      adminNotes: 'با مالک آقای آرتاک هماهنگ شد؛ برای روز جمعه ساعت ۱۷:۰۰ تأیید شد.',
      createdAt: '2026-10-21T11:00:00Z',
      updatedAt: '2026-10-21T13:00:00Z',
    },
    {
      id: 'rinq-2',
      trackingCode: 'YVN-RNT-102',
      privateToken: 'token-rental-inq-102',
      propertyId: 'rental-2',
      propertyTitle: 'آپارتمان نورگیر تک‌خوابه دنج نزدیک پارک باقرامیان و کاسکاد',
      guestName: 'نیلوفر زمانی',
      contact: 'niloufar.z@yahoo.com',
      requestType: 'rent',
      desiredStartDate: '2026-11-01',
      desiredDurationText: '۱ سال',
      residentsCount: 1,
      notes: 'یک گربه خانگی کوچک دارم که در توضیحات ملک قید شده بود مجاز است.',
      status: 'pending_review',
      createdAt: '2026-10-22T01:00:00Z',
      updatedAt: '2026-10-22T01:00:00Z',
    },
  ];

  const articles: Article[] = [
    {
      id: 'art-1',
      slug: 'armenia-visa-and-residency-guide-for-iranians-2026',
      title: 'راهنمای جامع ویزا، اقامت و قوانین ورود به ارمنستان (به‌روزرسانی ۲۰۲۶)',
      summary: 'قوانین اقامت ۹۰ روزه بدون ویزا برای ایرانیان، تمدید ویزا، ثبت نشانی و نکات مهم گمرکی مرز نوردوز.',
      category: 'ویزا و اقامت',
      tags: ['ویزا', 'اقامت', 'مرز نوردوز', 'قوانین گمرک'],
      featuredImage: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80',
      content: `### شرایط ورود بدون ویزا برای شهروندان ایرانی
طبق توافق‌نامه لغو روادید میان دولت‌های ایران و ارمنستان، دارندگان گذرنامه معتبر ایرانی می‌توانند در هر دوره ۱۸۰ روزه، تا حداکثر **۹۰ روز** بدون نیاز به اخذ ویزا در خاک ارمنستان اقامت داشته باشند.

#### نکات الزامی هنگام ورود به مرز:
۱. **اعتبار گذرنامه**: گذرنامه شما باید در لحظه ورود حداقل ۶ ماه اعتبار داشته باشد.
۲. **مدارک لازم**: رزرو معتبر محل اقامت (هاستل یا آپارتمان) یا آدرس مشخص و شماره تماس میزبان.
۳. **بیمه مسافرتی**: داشتن بیمه مسافرتی معتبر توصیه می‌شود.
۴. **داروهای ممنوعه**: همراه داشتن داروهای آرام‌بخش حاوی کدوئین، ترامادول، متادون و مشتقات تریاک در ارمنستان **جرم سنگین** محسوب شده و پیگرد قانونی دارد.

#### تمدید اقامت بیش از ۹۰ روز
در صورت تمایل به اقامت بیشتر، باید قبل از پایان ۹۰ روز از طریق اداره مهاجرت ارمنستان (OVIR) یا با اقدام برای ثبت شرکت، استخدام رسمی یا تحصیل نسبت به اخذ کارت اقامت (Residence Card) اقدام نمایید.`,
      author: 'تیم پژوهش YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-15',
      sources: ['وزارت امور خارجه جمهوری ارمنستان', 'پلیس مهاجرت ایروان'],
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'art-2',
      slug: 'real-cost-of-living-and-travel-in-yerevan',
      title: 'هزینه‌های واقعی سفر و زندگی در ایروان در سال ۲۰۲۶: از هاستل تا خوراک و تاکسی',
      summary: 'برآورد جزئیات قیمت‌ها به درام ارمنستان (AMD) برای مسافران انفرادی، بک‌پکرها و مستاجران ماهانه.',
      category: 'هزینه‌های سفر و زندگی',
      tags: ['هزینه زندگی', 'قیمت درام', 'بودجه سفر', 'ایروان'],
      featuredImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      content: `### واحد پول ارمنستان: درام (AMD / ֏)
تمام معاملات روزمره در ارمنستان طبق قانون با درام ارمنستان انجام می‌شود.

#### ۱. هزینه اقامت:
- **تخت هاستل در مرکز شهر (کنترون)**: حدود ۴٬۰۰۰ تا ۶٬۵۰۰ درام برای هر شب.
- **اتاق اختصاصی دونفره در هاستل**: ۱۶٬۰۰۰ تا ۲۵٬۰۰۰ درام برای هر شب.
- **اجاره ماهانه آپارتمان ۱ خوابه در مرکز**: ۲۲۰٬۰۰۰ تا ۳۸۰٬۰۰۰ درام.
- **اجاره ماهانه آپارتمان در محله‌های اطراف (عربکیر/کومیتاس)**: ۱۸۰٬۰۰۰ تا ۲۶۰٬۰۰۰ درام.

#### ۲. هزینه خوراک و رستوران:
- یک وعده غذای معمولی در فودکورت یا شاورما: ۱٬۵۰۰ تا ۲٬۵00 درام.
- ناهار در کافه رستوران خوب: ۳٬۵۰۰ تا ۶٬۰۰۰ درام.
- یک فنجان قهوه اسپرسو در کافه‌های مرکز: ۸۰۰ تا ۱٬۵۰۰ درام.

#### ۳. حمل‌ونقل شهری:
- بلیت مترو و اتوبوس شهری: ۱۰۰ درام.
- سفر متوسط تاکسی در داخل ایروان با اپلیکیشن GG یا Yandex: ۸۰۰ تا ۱٬۸۰۰ درام.`,
      author: 'تیم پژوهش YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-18',
      sources: ['سامانه آماری بازار مسکن ایروان', 'بررسی میدانی YEREVANHUB'],
      createdAt: '2026-02-10T00:00:00Z',
      updatedAt: '2026-10-18T00:00:00Z',
    },
    {
      id: 'art-3',
      slug: 'kilikia-bus-station-overnight-arrival-guide',
      title: 'راهنمای مسافران اتوبوس تهران - ایروان و ورود شبانه در پایانه کیلیکیا',
      summary: 'نکات کلیدی برای مسافرانی که نیمه‌شب یا صبح زود به پایانه اتوبوس کیلیکیا یا فرودگاه زوارتنوتس می‌رسند.',
      category: 'راهنمای اولین سفر و تازهواردها',
      tags: ['ترمینال کیلیکیا', 'ورود شبانه', 'اتوبوس تهران ایروان', 'تاکسی شبانه'],
      featuredImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      content: `### پایانه اتوبوس کیلیکیا (مرکزی) ایروان
بیشتر اتوبوس‌های مسافربری از مبدأ تهران و تبریز به پایانه کیلیکیا (خیابان دریاسالار ایساکوف) می‌رسند.

#### در صورت رسیدن در ساعات نیمه‌شب یا بامداد چه کنیم؟
۱. **سیم‌کارت و اینترنت**: در پایانه کیلیکیا وای‌فای عمومی ممکن است پایدار نباشد؛ در صورت امکان رومینگ خود را برای دریافت پیامک فعال نگه دارید یا از کیوسک صرافی ترمینال استفاده کنید.
۲. **صرافی ترمینال**: نرخ صرافی پایانه کیلیکیا ممکن است اندکی پایین‌تر از مرکز شهر باشد، اما برای پرداخت کرایه تاکسی مقدار کمی (حدود ۵٬۰۰۰ تا ۱۰٬۰۰۰ درام) تبدیل کنید.
۳. **کرایه تاکسی تا مرکز شهر (میدان جمهوری)**:
   - با تاکسی‌های شخصی پایانه مذاکره نکنید چرا که معمولاً قیمت‌های نامتعارف پیشنهاد می‌دهند.
   - کرایه منصفانه با اپلیکیشن تاکسی یا تاکسی‌متر معمولاً بین **۱٬۰۰۰ تا ۱٬۵۰۰ درام** است.
۴. **هاستل با پذیرش ۲۴ ساعته**: اگر هاستل شما پذیرش ۲۴ ساعته ندارد یا رزرو شب قبل را ثبت نکرده‌اید، از بخش «تازه رسیده‌ام» سایت YEREVANHUB هاستل‌هایی که ورود فوری دارند را پیدا کنید.`,
      author: 'مدیریت YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-20',
      sources: ['تجارب مسافران و بررسی پایانه مسافربری کیلیکیا'],
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-10-20T00:00:00Z',
    },
    {
      id: 'art-4',
      slug: 'sim-card-and-high-speed-internet-in-armenia',
      title: 'راهنمای خرید سیم‌کارت و بسته‌های اینترنت پرسرعت در ارمنستان',
      summary: 'مقایسه اپراتورهای Viva-MTS، Team Telecom و Ucom به همراه نحوه خرید با پاسپورت.',
      category: 'سیم‌کارت و اینترنت',
      tags: ['سیم کارت', 'اینترنت', 'ویواسل', 'یوکام', 'تیم تلکام'],
      featuredImage: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80',
      content: `### اپراتورهای اصلی تلفن همراه در ارمنستان
سه اپراتور اصلی تلفن همراه در ارمنستان فعال هستند:
۱. **Viva (Viva-MTS سابق)**: بیشترین پوشش‌دهی در جاده‌ها و مناطق بین‌شهری و سرعت عالی ۴G/۵G در ایروان.
۲. **Team Telecom Armenia (Beeline سابق)**: بسته‌های اقتصادی و قیمت مناسب.
۳. **Ucom**: سرعت بسیار بالا و بسته‌های نامحدود دیتا.

#### نحوه خرید سیم‌کارت:
- فقط با ارائه **اصل گذرنامه (پاسپورت)** در شعب رسمی در میدان جمهوری، خیابان شمالی یا فرودگاه.
- سیم‌کارت‌های توریستی با اینترنت نامحدود ۱۰ الی ۳۰ روزه معمولاً بین ۳٬۰۰۰ تا ۵٬۰۰۰ درام قیمت دارند.`,
      author: 'تیم پژوهش YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-10',
      sources: ['پرتال رسمی اپراتورهای Viva و Ucom'],
      createdAt: '2026-02-20T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'art-5',
      slug: 'money-exchange-and-banking-guide-armenia',
      title: 'راهنمای پول و صرافی در ایروان: بهترین محل برای تبدیل ارز و اسکناس',
      summary: 'نکات تبدیل دلار، یورو و ریال، ساعت کار صرافی‌ها و صرافی‌های سوپرمارکت SAS.',
      category: 'پول و صرافی',
      tags: ['صرافی', 'تبدیل ارز', 'درام', 'سوپرمارکت ساس'],
      featuredImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
      content: `### بهترین مکان‌ها برای تبدیل ارز در ایروان
۱. **صرافی‌های داخل سوپرمارکت‌های زنجیره‌ای SAS و Yerevan City**:
   - تقریباً تمام شعب سوپرمارکت‌های SAS و Yerevan City دارای صرافی اختصاصی معتبر هستند.
   - بیشتر این شعب **۲۴ ساعته** باز بوده و بهترین نرخ‌های روز دلار و یورو را بدون کارمزد مخفی ارائه می‌دهند.
۲. **سایت مرجع نرخ صرافی‌های ارمنستان**:
   - برای مقایسه لحظه‌ای نرخ‌ها در بانک‌ها و صرافی‌ها می‌توانید به وب‌سایت **rate.am** مراجعه کنید.
۳. **تبدیل ریال ایران**:
   - صرافی‌های معدودی در اطراف میدان جمهوری و خیابان نعلبندیان تبدیل ریال انجام می‌دهند، اما به دلیل نوسانات شدید، اکیداً توصیه می‌شود **دلار یا یورو** همراه داشته باشید.`,
      author: 'تیم پژوهش YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-12',
      sources: ['داده‌های بانک مرکزی ارمنستان و Rate.am'],
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-10-12T00:00:00Z',
    },
    {
      id: 'art-6',
      slug: 'public-transport-and-taxi-apps-in-yerevan',
      title: 'حمل‌ونقل در ایروان: راهنمای مترو، اتوبوس و اپلیکیشن‌های تاکسی اینترنتی',
      summary: 'آموزش استفاده از اپلیکیشن GG و Yandex Go، هزینه مترو و نکات تردد با مارشروتکا.',
      category: 'تاکسی و حمل‌ونقل عمومی',
      tags: ['تاکسی ایروان', 'اپلیکیشن GG', 'یاندکس گو', 'مترو ایروان'],
      featuredImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      content: `### اپلیکیشن‌های تاکسی در ارمنستان
در ارمنستان هرگز نیازی به کرایه تاکسی‌های گذری با قیمت‌های نامشخص ندارید:
۱. **GG (جی‌جی)**: اپلیکیشن بومی ارمنستان، خودروهای باکیفیت‌تر، پشتیبانی قوی، رانندگان منضبط و امکان پرداخت نقدی به درام.
۲. **Yandex Go (یاندکس)**: دسترسی سریع، تعداد خودروی بسیار زیاد در تمام محله‌ها و قیمت اقتصادی.

#### متروی ایروان (Karen Demirchyan Metro):
- دارای یک خط اصلی از ایستگاه ایستگاه قطار (ساسونتسی داویت) تا بارکاموتیون.
- هزینه بلیت ژتون: **۱۰۰ درام** برای هر سفر.
- سریع‌ترین روش جابه‌جایی در ساعات اوج ترافیک عصرگاهی.`,
      author: 'تیم پژوهش YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: '2026-10-14',
      sources: ['شهرداری ایروان و سامانه حمل و نقل عمومی'],
      createdAt: '2026-03-05T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    },
    {
      id: 'art-7-draft',
      slug: 'renting-an-apartment-in-yerevan-complete-guide',
      title: 'راهنمای جامع قرارداد و اجاره خانه در ایروان (پیش‌نویس بررسی)',
      summary: 'پیش‌نویس کارشناسی درباره ودیعه، قرارداد ثبت رسمی در کاداستر و هزینه‌های آب، برق و گاز (کومونال).',
      category: 'اجارهٔ خانه و نکات سکونت',
      tags: ['قرارداد اجاره', 'ودیعه', 'کاداستر', 'کومونال'],
      featuredImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      content: `این مطلب در مرحله پیش‌نویس است و به عنوان راهنمای آزمایشی برای بررسی مدیر در پنل قرار دارد.`,
      author: 'مدیر کل YEREVANHUB',
      language: 'fa',
      status: 'draft', // Draft!
      isSampleDraft: true,
      lastVerifiedDate: '2026-10-21',
      sources: ['بخش حقوقی YEREVANHUB'],
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
    },
    {
      id: 'art-8-draft',
      slug: 'top-places-to-visit-in-armenia-seasonal-guide',
      title: '۱۰ جاذبه گردشگری و تاریخی برتر ارمنستان (پیش‌نویس برای بررسی پاییز)',
      summary: 'پیش‌نویس معرفی معبد گارنی، کلیسای گغارد، دریاچه سوان و تله‌کابین تاتو.',
      category: 'جاهای دیدنی',
      tags: ['گارنی', 'گغارد', 'سوان', 'تاتو'],
      featuredImage: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      content: `پیش‌نویس برای ویرایش و اضافه کردن اطلاعات تکمیلی فصلی توسط مدیر YEREVANHUB.`,
      author: 'مدیر کل YEREVANHUB',
      language: 'fa',
      status: 'draft', // Draft!
      isSampleDraft: true,
      lastVerifiedDate: '2026-10-21',
      sources: ['کمیته گردشگری ارمنستان'],
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
    },
  ];

  const phrases: TravelPhrase[] = [
    {
      id: 'phr-1',
      category: 'taxi',
      categoryLabelFa: 'تاکسی و آدرس',
      fa: 'لطفاً مرا به میدان جمهوری ببرید.',
      en: 'Please take me to Republic Square.',
      ru: 'Пожалуйста, отвезите меня на Площадь Республики.',
      hy: 'Խնդրում եմ, ինձ տարեք Հանրապետության հրապարակ:',
      phoneticHy: 'Khndrum yem, indz tarek Hanrapetutyan hraparak',
      note: 'پرکاربردترین عبارت برای شروع گشت در ایروان',
    },
    {
      id: 'phr-2',
      category: 'taxi',
      categoryLabelFa: 'تاکسی و آدرس',
      fa: 'کرایه چقدر می‌شود؟',
      en: 'How much is the fare?',
      ru: 'Сколько стоит проезд?',
      hy: 'Որքա՞ն է արժեքը:',
      phoneticHy: 'Vorkan e arzheke?',
    },
    {
      id: 'phr-3',
      category: 'hostel',
      categoryLabelFa: 'هاستل و اقامت',
      fa: 'من در سایت YEREVANHUB رزرو دارم.',
      en: 'I have a booking made on YEREVANHUB.',
      ru: 'У меня есть бронь через YEREVANHUB.',
      hy: 'Ես ամրագրում ունեմ YEREVANHUB-ում:',
      phoneticHy: 'Yes amragrum unem YEREVANHUB-um',
      note: 'برای نشان دادن در بدو ورود به پذیرش',
    },
    {
      id: 'phr-4',
      category: 'hostel',
      categoryLabelFa: 'هاستل و اقامت',
      fa: 'آیا می‌توانم چمدانم را تا آماده شدن تخت در انبار بگذارم؟',
      en: 'Can I leave my luggage in storage until the bed is ready?',
      ru: 'Могу ли я оставить багаж на хранение до готовности кровати?',
      hy: 'Կարո՞ղ եմ իմ ուղեբեռը թողնել պահեստում, մինչև մահճակալը պատրաստ լինի:',
      phoneticHy: 'Karogh yem im ughebere toghnel pahestum?',
      note: 'ویژه مسافران ورود صبح زود',
    },
    {
      id: 'phr-5',
      category: 'hostel',
      categoryLabelFa: 'هاستل و اقامت',
      fa: 'رمز وای‌فای چیست؟',
      en: 'What is the WiFi password?',
      ru: 'Какой пароль от Wi-Fi?',
      hy: 'Ո՞րն է Wi-Fi-ի գաղտնաբառը:',
      phoneticHy: 'Vorn e Wi-Fi-i gaghtnabare?',
    },
    {
      id: 'phr-6',
      category: 'rent',
      categoryLabelFa: 'اجاره خانه و آپارتمان',
      fa: 'آیا هزینه آب و برق و اینترنت شامل مبلغ اجاره است؟',
      en: 'Are utilities (water, electricity, internet) included in the rent?',
      ru: 'Коммунальные услуги и интернет включены в аренду?',
      hy: 'Կոմունալները և ինտերնետը ներառվա՞ծ են վարձավճարի մեջ:',
      phoneticHy: 'Komunalnere yev internete nerarvats yen vardzavchari mej?',
      note: 'کلیدی هنگام بازدید از ملک',
    },
    {
      id: 'phr-7',
      category: 'rent',
      categoryLabelFa: 'اجاره خانه و آپارتمان',
      fa: 'مبلغ ودیعه چقدر است و چه زمانی بازگردانده می‌شود؟',
      en: 'How much is the deposit and when is it returned?',
      ru: 'Каков залог и когда он возвращается?',
      hy: 'Որքա՞ն է կանխավճարը (դեպոզիտը) և ե՞րբ է վերադարձվում:',
      phoneticHy: 'Vorkan e depozite yev yerb e veradardzvum?',
    },
    {
      id: 'phr-8',
      category: 'shopping',
      categoryLabelFa: 'خرید و بازار',
      fa: 'قیمت این چقدر است؟',
      en: 'How much does this cost?',
      ru: 'Сколько это стоит?',
      hy: 'Ի՞նչ արժե սա:',
      phoneticHy: 'Inch arzhe sa?',
    },
    {
      id: 'phr-9',
      category: 'dining',
      categoryLabelFa: 'رستوران و غذا',
      fa: 'آیا این غذا گوشت حلال یا غذای گیاهی است؟',
      en: 'Is this food vegetarian / halal?',
      ru: 'Это блюдо вегетарианское / халяль?',
      hy: 'Արդյո՞ք այս ուտեստը բուսակերների համար է:',
      phoneticHy: 'Ardyok ays uteste busakerneri hamar e?',
    },
    {
      id: 'phr-10',
      category: 'emergency',
      categoryLabelFa: 'اضطراری و کمک',
      fa: 'لطفاً به من کمک کنید، من راه هاستلم را گم کرده‌ام.',
      en: 'Please help me, I have lost my way to the hostel.',
      ru: 'Пожалуйста, помогите, я заблудился по пути в хостел.',
      hy: 'Խնդրում եմ, օգնեք ինձ, ես կորցրել եմ հոսթելի ճանապարհը:',
      phoneticHy: 'Khndrum yem, ognek indz, yes kortserel yem hosteli chanaparhe',
      note: 'برای مواقع اضطراری',
    },
    {
      id: 'phr-11',
      category: 'emergency',
      categoryLabelFa: 'اضطراری و کمک',
      fa: 'شماره پلیس و اورژانس چیست؟ (پلیس ۱۰۲ / اورژانس ۱۰۳)',
      en: 'What is the emergency number? (Police 102 / Ambulance 103)',
      ru: 'Какой номер экстренной службы? (Полиция 102 / Скорая 103)',
      hy: 'Ո՞րն է շտապօգնության հեռախոսահամարը (103) / ոստիկանություն (102):',
      phoneticHy: 'Vorn e shtapognutyan herakhosahamare?',
    },
  ];

  return {
    users,
    sessions: [],
    hostels,
    bookings,
    rentals,
    rentalInquiries,
    coupons,
    reviews,
    articles,
    phrases,
    auditLogs: [
      {
        id: 'log-1',
        timestamp: '2026-10-22T00:00:00Z',
        actorId: 'user-admin-1',
        actorName: 'مدیریت کل YEREVANHUB',
        actorRole: 'admin',
        action: 'INITIALIZE_SYSTEM',
        targetType: 'SYSTEM',
        targetId: 'yerevanhub-core',
        details: 'پلتفرم چهارزبانه YEREVANHUB با پایگاه داده یکپارچه، هاستل‌ها، املاک و مترجم راه‌اندازی شد.',
      },
    ],
    settings: {
      immediateRequestTimeoutMinutes: 30,
      allowTravelerRegistration: true,
      emergencyHotline: '+374 91 999 000',
      telegramSupport: '@YerevanHubSupport',
      supportWorkingHoursFa: 'پشتیبانی مقیم ایروان: شبانه‌روزی (۲۴/۷) برای مسافران اضطراری، ساعت پاسخگویی عمومی ۸:۰۰ تا ۲۳:۰۰ به وقت ایروان',
    },
  };
}
