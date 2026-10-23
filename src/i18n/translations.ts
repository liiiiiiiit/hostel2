import { AppLanguage } from '../types';

export interface Translations {
  appName: string;
  tagline: string;
  navHostels: string;
  navRentals: string;
  navGuide: string;
  navTranslator: string;
  navImmediateStay: string;
  navAbout: string;
  navContact: string;
  navRules: string;
  login: string;
  register: string;
  logout: string;
  myAccount: string;
  adminPanel: string;
  managerPanel: string;

  // Hero & CTA
  heroTitle: string;
  heroSubtitle: string;
  ctaSearchHostels: string;
  ctaImmediateStay: string;
  ctaSearchRentals: string;
  quickSearchTitle: string;
  officialPlatformBadge: string;
  payOnArrivalText: string;
  nightlyAdmissionText: string;
  noSmsCodeText: string;

  // Search Widget & Filters
  cityLabel: string;
  checkInLabel: string;
  checkOutLabel: string;
  guestsLabel: string;
  searchButton: string;
  allCities: string;
  filtersLabel: string;
  clearFilters: string;
  sortByLabel: string;
  sortRecommended: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortRating: string;
  rentalTypeLabel: string;
  longTermRental: string;
  shortTermRental: string;
  guestCount1: string;
  guestCount2: string;
  guestCount3: string;
  guestCount4Plus: string;

  // Badges & Common
  reception24hBadge: string;
  immediateCheckInBadge: string;
  verifiedBadge: string;
  payOnArrivalBadge: string;
  currencyAMD: string;
  perBedPerNight: string;
  perMonth: string;
  perNight: string;
  startingFrom: string;
  detailsButton: string;
  bookNowButton: string;
  viewPropertyButton: string;
  viewPropertyDetails: string;
  viewAllHostels: string;
  viewAllRentals: string;
  reviewsCountText: string;
  staffLanguagesText: string;
  amenitiesLabel: string;
  rulesLabel: string;
  featuredHostelsTitle: string;
  featuredHostelsSubtitle: string;
  featuredRentalsTitle: string;
  featuredRentalsSubtitle: string;
  guideHighlightsTitle: string;
  immediateCheckIn: string;
  hours24: string;
  wifi: string;
  lockers: string;
  luggageStorage: string;

  // Immediate Stay Flow
  immediateStayPageTitle: string;
  immediateStaySubtitle: string;
  immediateStayWarning: string;
  whereAreYouNow: string;
  kilikiaStation: string;
  zvartnotsAirport: string;
  sasuntsiDavitStation: string;
  republicSquare: string;
  northernBusStation: string;
  urgentHostelsReadyCount: string;
  urgentBookingButton: string;
  guestNamePlaceholder: string;
  phonePlaceholder: string;
  airDistance: string;
  estTaxiFare: string;

  // Booking & Tracking
  trackingCodeLabel: string;
  statusLabel: string;
  bookingStatusPending: string;
  bookingStatusConfirmed: string;
  bookingStatusRejected: string;
  bookingStatusCancelled: string;
  bookingStatusExpired: string;
  bookingStatusCompleted: string;
  arrivalPassTitle: string;
  armenianAddressForTaxi: string;
  copyArmenianAddress: string;
  openGoogleMaps: string;
  entranceGuideTitle: string;
  doorCodeTitle: string;
  hostelPhoneTitle: string;
  emergencyIssueButton: string;
  cancelBookingButton: string;
  discountCodePrompt: string;
  applyCoupon: string;
  stayTotal: string;
  discountAmount: string;
  finalToPay: string;
  payOnArrivalNote: string;
  noOnlinePaymentNote: string;

  // Features / Why Us
  whyChooseTitle: string;
  whyChooseSubtitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;

  // Translator
  translatorPageTitle: string;
  translatorSubtitle: string;
  translatorSourceLabel: string;
  translatorTargetLabel: string;
  typeOrPasteText: string;
  translationAppearsHere: string;
  translatingAction: string;
  translateButton: string;
  clearText: string;
  copyText: string;
  copiedText: string;
  fullscreenDisplay: string;
  privacyTranslationNote: string;
  travelPhrasesTitle: string;
  travelPhrasesSubtitle: string;
  openTranslatorWithPhrases: string;
  allCategories: string;
  catTaxi: string;
  catHostel: string;
  catRent: string;
  catShopping: string;
  catDining: string;
  catEmergency: string;
  largeModalTitle: string;
  closeButton: string;

  // Guide
  guidePageTitle: string;
  guidePageSubtitle: string;
  guideRefBadge: string;
  searchGuidePlaceholder: string;
  lastVerifiedLabel: string;
  sourcesLabel: string;
  readMoreButton: string;

  // Footer & Policies
  footerAboutTitle: string;
  footerPoliciesTitle: string;
  footerSectionsTitle: string;
  privacyPolicy: string;
  bookingRules: string;
  footerRights: string;
  timezoneNotice: string;

  // Modern Features & Widgets
  yerevanLiveStatus: string;
  currencyConverterTitle: string;
  currencyConverterSubtitle: string;
  amountInAMD: string;
  approxInToman: string;
  approxInUSD: string;
  approxInRUB: string;
  neighborhoodsTitle: string;
  neighborhoodsSubtitle: string;
  neighborhoodKentronName: string;
  neighborhoodKentronDesc: string;
  neighborhoodArabkirName: string;
  neighborhoodArabkirDesc: string;
  neighborhoodAvanName: string;
  neighborhoodAvanDesc: string;
  viewHostelsInDistrict: string;
  playPronunciation: string;
  copyForTaxi: string;
  copied: string;
  distToRepublicSquare: string;
  minsWalk: string;
  freeCancellation: string;
}

export const UI_TRANSLATIONS: Record<AppLanguage, Translations> = {
  fa: {
    appName: 'YEREVANHUB',
    tagline: 'پلتفرم جامع رزرو هاستل، اجاره آپارتمان و راهنمای سفر به ارمنستان',
    navHostels: 'رزرو هاستل',
    navRentals: 'اجاره آپارتمان و خانه',
    navGuide: 'راهنمای ارمنستان',
    navTranslator: 'مترجم چهارزبانه',
    navImmediateStay: 'تازه رسیده‌ام (ورود فوری)',
    navAbout: 'درباره ما',
    navContact: 'تماس با ما',
    navRules: 'قوانین و لغو',
    login: 'ورود',
    register: 'ثبت‌نام مسافر',
    logout: 'خروج',
    myAccount: 'پیگیری و حساب من',
    adminPanel: 'پنل مدیریت کل',
    managerPanel: 'پنل هاستل‌دار',

    heroTitle: 'اقامت آسان و مطمئن در ارمنستان بدون پیش‌پرداخت اینترنتی',
    heroSubtitle: 'رزرو هاستل‌های تأییدشده با پرداخت در محل، اجاره آپارتمان‌های بررسیشده، راهنمای به‌روز زندگی و مترجم همراه.',
    ctaSearchHostels: 'جستوجو و رزرو هاستل',
    ctaImmediateStay: 'تازه رسیدهام؛ همین حالا جا میخواهم',
    ctaSearchRentals: 'مشاهده آپارتمان‌ها و خانه‌ها',
    quickSearchTitle: 'جستجوی اقامت در ایروان و ارمنستان',
    officialPlatformBadge: 'پلتفرم رسمی و تخصصی اقامت در ارمنستان',
    payOnArrivalText: 'پرداخت در محل با درام (AMD)',
    nightlyAdmissionText: 'پذیرش شبانه و ورود زودهنگام',
    noSmsCodeText: 'رزرو بدون ثبت‌نام و بدون کد تایید',

    cityLabel: 'شهر / محدوده',
    checkInLabel: 'تاریخ ورود',
    checkOutLabel: 'تاریخ خروج',
    guestsLabel: 'تعداد مهمان',
    searchButton: 'جستجو',
    allCities: 'همه شهرها',
    filtersLabel: 'فیلترها',
    clearFilters: 'پاک کردن فیلترها',
    sortByLabel: 'مرتب‌سازی:',
    sortRecommended: 'پیشنهادی YEREVANHUB',
    sortPriceAsc: 'ارزان‌ترین قیمت',
    sortPriceDesc: 'گران‌ترین قیمت',
    sortRating: 'بالاترین امتیاز مسافران',
    rentalTypeLabel: 'نوع اجاره',
    longTermRental: 'اجاره ماهانه و سالانه (بلندمدت)',
    shortTermRental: 'اجاره روزانه و هفتگی (توریستی)',
    guestCount1: '۱ نفر',
    guestCount2: '۲ نفر',
    guestCount3: '۳ نفر',
    guestCount4Plus: '۴+ نفر',

    reception24hBadge: 'پذیرش ۲۴ ساعته',
    immediateCheckInBadge: 'ورود فوری فعال',
    verifiedBadge: 'بررسی حضوری شده',
    payOnArrivalBadge: 'پرداخت در محل (درام)',
    currencyAMD: 'AMD ֏',
    perBedPerNight: 'هر تخت / هر شب',
    perMonth: 'ماهانه',
    perNight: 'هر شب',
    startingFrom: 'شروع قیمت از:',
    detailsButton: 'مشاهده جزئیات و رزرو',
    bookNowButton: 'ثبت درخواست رزرو',
    viewPropertyButton: 'مشاهده ملک و استعلام',
    viewPropertyDetails: 'مشاهده جزئیات ملک',
    viewAllHostels: 'مشاهده همه هاستل‌ها',
    viewAllRentals: 'مشاهده همه املاک',
    reviewsCountText: 'نظر مسافر',
    staffLanguagesText: 'زبان‌های پذیرش:',
    amenitiesLabel: 'امکانات',
    rulesLabel: 'قوانین و مقررات',
    featuredHostelsTitle: 'هاستل‌های منتخب ایروان',
    featuredHostelsSubtitle: 'اقامتگاه‌های تاییدشده، تمیز و دارای موقعیت مرکزی با پرداخت در محل',
    featuredRentalsTitle: 'آپارتمان‌ها و خانه‌های برگزیده',
    featuredRentalsSubtitle: 'واحدهای مبله، بازرسی‌شده و دارای شرایط شفاف',
    guideHighlightsTitle: 'برگزیده راهنمای ارمنستان',
    immediateCheckIn: 'ورود فوری',
    hours24: '۲۴ ساعته',
    wifi: 'وای‌فای',
    lockers: 'کمد اختصاصی',
    luggageStorage: 'انبار چمدان',

    immediateStayPageTitle: 'تازه رسیده‌ام؛ همین حالا جا می‌خواهم',
    immediateStaySubtitle: 'اگر تازه از اتوبوس پایانه کیلیکیا یا هواپیما پیاده شده‌اید و در نیمه‌شب یا ساعات نامتعارف به تخت خواب نیاز دارید، هاستل‌های زیر آمادگی پذیرش فوری شما را دارند.',
    immediateStayWarning: 'تذکر بسیار مهم: لطفاً قبل از دریافت تأییدیه هاستل، به سمت آدرس حرکت نکنید. پس از ارسال درخواست، وضعیت ظرفیت به صورت زنده بررسی و در لینک پیگیری اختصاصی به شما اطلاع داده می‌شود.',
    whereAreYouNow: '۱. در حال حاضر کجای ایروان هستید؟ (محل پیاده شدن)',
    kilikiaStation: 'پایانه مرکزی اتوبوس رانی کیلیکیا (اتوبوس تهران/تبریز)',
    zvartnotsAirport: 'فرودگاه بین‌المللی زوارتنوتس ایروان (Zvartnots Airport)',
    sasuntsiDavitStation: 'ایستگاه راه‌آهن مرکزی ساسونتسی داویت (Sasuntsi Davit)',
    republicSquare: 'میدان جمهوری ایروان (مرکز شهر)',
    northernBusStation: 'پایانه اتوبوس شمال (مسیر گرجستان/دیلیجان)',
    urgentHostelsReadyCount: 'هاستل‌های آماده پذیرش در این لحظه',
    urgentBookingButton: 'درخواست پذیرش فوری',
    guestNamePlaceholder: 'نام مسافر *',
    phonePlaceholder: 'شماره تماس (ایران یا ارمنستان) *',
    airDistance: 'فاصله هوایی',
    estTaxiFare: 'کرایه احتمالی تاکسی',

    trackingCodeLabel: 'کد پیگیری اختصاصی',
    statusLabel: 'وضعیت درخواست',
    bookingStatusPending: 'در انتظار تأیید هاستل‌دار',
    bookingStatusConfirmed: 'تأییدشده (آماده پذیرش)',
    bookingStatusRejected: 'رد شده',
    bookingStatusCancelled: 'لغو شده توسط مسافر',
    bookingStatusExpired: 'منقضی شده',
    bookingStatusCompleted: 'اقامت تکمیل شده',
    arrivalPassTitle: 'کارت راهنمای مسافر YEREVANHUB (مخصوص موبایل و راننده تاکسی)',
    armenianAddressForTaxi: 'نشانی به زبان ارمنی (برای نشان دادن به راننده تاکسی یا جستجو در نقشه):',
    copyArmenianAddress: 'کپی نشانی ارمنی',
    openGoogleMaps: 'مسیریابی در نقشه',
    entranceGuideTitle: 'راهنمای یافتن درب ورودی:',
    doorCodeTitle: 'طبقه و رمز درب ورودی ساختمان:',
    hostelPhoneTitle: 'تلفن هاستل:',
    emergencyIssueButton: 'هاستل پاسخ نمی‌دهد / مشکل ورود دارم',
    cancelBookingButton: 'لغو این رزرو',
    discountCodePrompt: 'کد تخفیف دارید؟',
    applyCoupon: 'اعمال کد',
    stayTotal: 'مبلغ کل اقامت',
    discountAmount: 'تخفیف',
    finalToPay: 'مبلغ نهایی پرداخت در محل',
    payOnArrivalNote: 'این مبلغ در هنگام پذیرش در هاستل پرداخت خواهد شد.',
    noOnlinePaymentNote: 'بدون نیاز به کارت بانکی خارجی یا پرداخت آنلاین؛ هزینه هاستل در محل به درام ارمنستان پرداخت می‌شود.',

    whyChooseTitle: 'چرا مسافران YEREVANHUB را انتخاب می‌کنند؟',
    whyChooseSubtitle: 'تجربه‌ای امن، مستقیم و بدون واسطه‌های گران‌قیمت برای سفر به ارمنستان',
    feature1Title: 'بدون پیش‌پرداخت اینترنتی',
    feature1Desc: 'رزرو قطعی بدون نیاز به کارت‌های بین‌المللی یا کسر کارمزد؛ تسویه کامل نقدی در بدو ورود به هاستل با درام ارمنستان.',
    feature2Title: 'پذیرش ورود فوری شبانه',
    feature2Desc: 'مسیر ویژه برای مسافرانی که تازه از اتوبوس یا فرودگاه پیاده شده‌اند و بدون معطلی تخت آماده می‌خواهند.',
    feature3Title: 'املاک کارشناسی‌شده حضوری',
    feature3Desc: 'تمام خانه‌ها و آپارتمان‌ها از نظر سند، موقعیت و شرایط ودیعه توسط کارشناسان YEREVANHUB بررسی حضوری شده‌اند.',
    feature4Title: 'مترجم و پشتیبانی مقیم ارمنستان',
    feature4Desc: 'دسترسی رایگان به مترجم تخصصی ۴ زبانه، کتابچه اصطلاحات سفر و ارتباط تلفنی با مدیران در ایروان.',

    translatorPageTitle: 'مترجم چهارزبانه: فارسی، انگلیسی، روسی و ارمنی',
    translatorSubtitle: 'ترجمه دقیق متن‌ها و اصطلاحات روزمره برای ارتباط آسان با رانندگان، میزبانان و مردم ارمنستان',
    translatorSourceLabel: 'مبدأ:',
    translatorTargetLabel: 'مقصد:',
    typeOrPasteText: 'متن خود را اینجا تایپ کنید یا بچسبانید...',
    translationAppearsHere: 'ترجمه در این قسمت نمایش داده می‌شود...',
    translatingAction: 'در حال ترجمه دقیق...',
    translateButton: 'ترجمه کن',
    clearText: 'پاک کردن',
    copyText: 'کپی',
    copiedText: 'کپی شد ✓',
    fullscreenDisplay: 'نمایش تمام صفحه',
    privacyTranslationNote: 'ترجمه متن به هیچ عنوان در سرور ذخیره نمی‌شود و محرمانه است.',
    travelPhrasesTitle: 'عبارت‌های آماده و کاربردی سفر به ارمنستان',
    travelPhrasesSubtitle: 'جملات استاندارد و تأییدشده با تلفظ آوایی برای تاکسی، هاستل، خرید و غذا',
    openTranslatorWithPhrases: 'ورود به مترجم چهارزبانه و مشاهده تمام عبارت‌ها',
    allCategories: 'همه دسته‌ها',
    catTaxi: 'تاکسی و آدرس',
    catHostel: 'هاستل',
    catRent: 'اجاره خانه',
    catShopping: 'خرید',
    catDining: 'غذا و رستوران',
    catEmergency: 'اضطراری',
    largeModalTitle: 'حالت نمایش به راننده یا فرد محلی (Large Text Display)',
    closeButton: 'بستن پنجره',

    guidePageTitle: 'راهنمای جامع سفر و زندگی در ارمنستان',
    guidePageSubtitle: 'مقالات مستند، قوانین ویزا، نکات ارز و سیم‌کارت، و تجربیات میدانی زندگی در ایروان با ذکر تاریخ آخرین راستی‌آزمایی',
    guideRefBadge: 'مرجع اطلاعات سفر و اقامت در ارمنستان',
    searchGuidePlaceholder: 'جستجو در مقالات راهنما (ویزا، سیم‌کارت، مترو، ارز...)...',
    lastVerifiedLabel: 'آخرین راستی‌آزمایی میدانی:',
    sourcesLabel: 'منابع رسمی:',
    readMoreButton: 'مطالعه کامل راهنما',

    footerAboutTitle: 'پشتیبانی مقیم ایروان',
    footerPoliciesTitle: 'قوانین و اطلاعات',
    footerSectionsTitle: 'بخش‌های اصلی',
    privacyPolicy: 'حریم خصوصی و شرایط استفاده',
    bookingRules: 'قوانین رزرو و لغو اقامت',
    footerRights: 'تمامی حقوق متعلق به پلتفرم بین‌المللی YEREVANHUB است.',
    timezoneNotice: 'کلیه زمان‌ها و تاریخ‌ها بر اساس وقت رسمی ارمنستان (Asia/Yerevan) محاسبه می‌شوند.',

    // Modern Features & Widgets
    yerevanLiveStatus: 'ایروان: وقت رسمی | وضعیت هاستل‌ها: پذیرش فعال',
    currencyConverterTitle: 'ماشین‌حساب زنده تبدیل درام ارمنستان (AMD)',
    currencyConverterSubtitle: 'محاسبه سریع و شفاف قیمت‌ها به تومان، دلار آمریکا و روبل برای مسافران',
    amountInAMD: 'مبلغ به درام ارمنستان (֏ AMD)',
    approxInToman: 'معادل تقریبی به تومان',
    approxInUSD: 'معادل به دلار آمریکا ($)',
    approxInRUB: 'معادل به روبل روسیه (₽)',
    neighborhoodsTitle: 'راهنمای محله‌های پرطرفدار ایروان',
    neighborhoodsSubtitle: 'انتخاب بهترین منطقه بر اساس سلیقه: از قلب تاریخی کنترون تا آرامش آرابکیر',
    neighborhoodKentronName: 'کِنتْرون (مرکز شهر ایروان)',
    neighborhoodKentronDesc: 'میدان جمهوری، خیابان شمالی و پله‌های کاسکاد. دسترسی پیاده به همه جا و بهترین هاستل‌ها.',
    neighborhoodArabkirName: 'آرابکیر و خیابان کومیتاس',
    neighborhoodArabkirDesc: 'منطقه‌ای دنج، کافه‌های محلی و دسترسی عالی به خط مترو. قیمت‌های مناسب‌تر برای اقامت هفتگی.',
    neighborhoodAvanName: 'آوان و نورک (هوای پاک)',
    neighborhoodAvanDesc: 'چشم‌انداز کوه آرارات، مجتمع‌های مسکونی مدرن با اجاره‌بهای اقتصادی‌تر برای اقامت طولانی.',
    viewHostelsInDistrict: 'مشاهده اقامتگاه‌های این منطقه',
    playPronunciation: 'شنیدن تلفظ ارمنی',
    copyForTaxi: 'کپی برای راننده تاکسی',
    copied: 'کپی شد!',
    distToRepublicSquare: 'فاصله تا میدان جمهوری',
    minsWalk: 'دقیقه پیاده',
    freeCancellation: 'لغو رایگان تا ۲۴ ساعت قبل',
  },

  en: {
    appName: 'YEREVANHUB',
    tagline: 'Hostel booking, apartment rentals, Armenia travel guide & 4-language translator',
    navHostels: 'Hostels',
    navRentals: 'House & Apartments',
    navGuide: 'Armenia Guide',
    navTranslator: '4-Language Translator',
    navImmediateStay: 'Just Arrived (Instant Check-in)',
    navAbout: 'About Us',
    navContact: 'Contact',
    navRules: 'Rules & Policies',
    login: 'Sign In',
    register: 'Sign Up',
    logout: 'Sign Out',
    myAccount: 'My Bookings',
    adminPanel: 'Admin Panel',
    managerPanel: 'Hostel Manager',

    heroTitle: 'Reliable Stays in Armenia with Zero Online Prepayment',
    heroSubtitle: 'Verified hostels with pay-at-hostel convenience, curated apartment rentals, practical guides and live translator.',
    ctaSearchHostels: 'Search & Book Hostels',
    ctaImmediateStay: 'Just Arrived; Need a Bed Now',
    ctaSearchRentals: 'Browse Apartments & Houses',
    quickSearchTitle: 'Find Accommodations in Yerevan',
    officialPlatformBadge: 'Official Accommodation Platform in Armenia',
    payOnArrivalText: 'Pay on arrival in Armenian Dram (AMD)',
    nightlyAdmissionText: '24/7 reception & early check-in',
    noSmsCodeText: 'Book without account or SMS OTP',

    cityLabel: 'City / District',
    checkInLabel: 'Check-in Date',
    checkOutLabel: 'Check-out Date',
    guestsLabel: 'Guests',
    searchButton: 'Search',
    allCities: 'All Cities',
    filtersLabel: 'Filters',
    clearFilters: 'Clear Filters',
    sortByLabel: 'Sort by:',
    sortRecommended: 'Recommended by YEREVANHUB',
    sortPriceAsc: 'Lowest Price',
    sortPriceDesc: 'Highest Price',
    sortRating: 'Highest Guest Rating',
    rentalTypeLabel: 'Rental Type',
    longTermRental: 'Monthly & Long-Term Rental',
    shortTermRental: 'Daily & Short-Term Stay',
    guestCount1: '1 Guest',
    guestCount2: '2 Guests',
    guestCount3: '3 Guests',
    guestCount4Plus: '4+ Guests',

    reception24hBadge: '24/7 Reception',
    immediateCheckInBadge: 'Immediate Check-in Ready',
    verifiedBadge: 'Verified & Inspected',
    payOnArrivalBadge: 'Pay on Arrival (AMD)',
    currencyAMD: 'AMD ֏',
    perBedPerNight: 'per bed / night',
    perMonth: 'per month',
    perNight: 'per night',
    startingFrom: 'Starting from:',
    detailsButton: 'Details & Booking',
    bookNowButton: 'Request Booking',
    viewPropertyButton: 'View Property & Inquire',
    viewPropertyDetails: 'View Property Details',
    viewAllHostels: 'View All Hostels',
    viewAllRentals: 'View All Properties',
    reviewsCountText: 'reviews',
    staffLanguagesText: 'Reception speaks:',
    amenitiesLabel: 'Amenities',
    rulesLabel: 'Rules & Policies',
    featuredHostelsTitle: 'Featured Yerevan Hostels',
    featuredHostelsSubtitle: 'Verified, clean hostels in prime central locations with pay-on-arrival in AMD',
    featuredRentalsTitle: 'Featured Apartments & Homes',
    featuredRentalsSubtitle: 'Inspected residential properties with transparent deposit terms',
    guideHighlightsTitle: 'Armenia Travel & Living Highlights',
    immediateCheckIn: 'Immediate Check-in',
    hours24: '24/7',
    wifi: 'Wi-Fi',
    lockers: 'Lockers',
    luggageStorage: 'Luggage Storage',

    immediateStayPageTitle: 'Just Arrived; Need a Bed Now',
    immediateStaySubtitle: 'If you just stepped off a late bus at Kilikia Station or landed at Zvartnots Airport and need a guaranteed bed during odd hours, these hostels are ready for you right now.',
    immediateStayWarning: 'Important Notice: Please do not travel to the property until your booking is confirmed. Your request is processed in real time and updated on your private tracking link.',
    whereAreYouNow: '1. Where are you currently in Yerevan? (Arrival Point)',
    kilikiaStation: 'Kilikia Central Bus Station (Tehran/Tabriz bus arrival)',
    zvartnotsAirport: 'Zvartnots International Airport (EVN Airport)',
    sasuntsiDavitStation: 'Sasuntsi Davit Central Railway Station',
    republicSquare: 'Republic Square (City Center)',
    northernBusStation: 'Northern Bus Station (Georgia / Dilijan bus arrival)',
    urgentHostelsReadyCount: 'Hostels Ready for Immediate Check-in Now',
    urgentBookingButton: 'Request Instant Check-in',
    guestNamePlaceholder: 'Guest Full Name *',
    phonePlaceholder: 'Phone Number (WhatsApp or local) *',
    airDistance: 'Distance',
    estTaxiFare: 'Est. Taxi Fare',

    trackingCodeLabel: 'Tracking Code',
    statusLabel: 'Status',
    bookingStatusPending: 'Pending Hostel Confirmation',
    bookingStatusConfirmed: 'Confirmed (Ready for Check-in)',
    bookingStatusRejected: 'Rejected',
    bookingStatusCancelled: 'Cancelled by Guest',
    bookingStatusExpired: 'Expired',
    bookingStatusCompleted: 'Stay Completed',
    arrivalPassTitle: 'YEREVANHUB Arrival Pass (Show to Driver & Reception)',
    armenianAddressForTaxi: 'Address in Armenian (Show to taxi driver or search in map):',
    copyArmenianAddress: 'Copy Armenian Address',
    openGoogleMaps: 'Open Navigation Map',
    entranceGuideTitle: 'Finding the Entrance Door:',
    doorCodeTitle: 'Floor & Building Door Intercom Code:',
    hostelPhoneTitle: 'Hostel Phone:',
    emergencyIssueButton: 'Hostel Not Responding / Check-in Issue',
    cancelBookingButton: 'Cancel this Booking',
    discountCodePrompt: 'Have a discount coupon?',
    applyCoupon: 'Apply',
    stayTotal: 'Stay Total',
    discountAmount: 'Discount',
    finalToPay: 'Final Pay on Arrival',
    payOnArrivalNote: 'Pay directly to the hostel upon arrival in Armenian Dram (AMD).',
    noOnlinePaymentNote: 'No foreign cards required. All hostel reservations are paid directly at check-in in Armenian Dram (AMD).',

    whyChooseTitle: 'Why Travelers Choose YEREVANHUB',
    whyChooseSubtitle: 'Safe, direct, and zero online markup for your travel and stay in Armenia',
    feature1Title: 'Zero Online Prepayment',
    feature1Desc: 'Guaranteed reservations without needing foreign payment cards. Pay 100% in cash at the hostel in Armenian Dram (AMD).',
    feature2Title: 'Instant Midnight Check-in',
    feature2Desc: 'Special fast-track for arrivals landing late or stepping off buses needing immediate bed access.',
    feature3Title: 'In-Person Inspected Properties',
    feature3Desc: 'All apartments and homes have deeds and amenities verified directly by YEREVANHUB experts.',
    feature4Title: 'Local Yerevan Support & Translator',
    feature4Desc: 'Free 4-language AI translator, offline travel phrasebook, and real telephone assistance on the ground.',

    translatorPageTitle: '4-Language Translator: Persian, English, Russian & Armenian',
    translatorSubtitle: 'Accurate translations and daily expressions for smooth communication with drivers, hosts, and locals in Armenia',
    translatorSourceLabel: 'Source:',
    translatorTargetLabel: 'Target:',
    typeOrPasteText: 'Type or paste your text here...',
    translationAppearsHere: 'Translation will appear here...',
    translatingAction: 'Translating accurately...',
    translateButton: 'Translate',
    clearText: 'Clear',
    copyText: 'Copy',
    copiedText: 'Copied ✓',
    fullscreenDisplay: 'Fullscreen Display',
    privacyTranslationNote: 'Translation requests are strictly private and never permanently stored.',
    travelPhrasesTitle: 'Essential Armenian Travel Phrases',
    travelPhrasesSubtitle: 'Verified daily phrases with phonetic pronunciation for taxis, hostels, shopping and dining',
    openTranslatorWithPhrases: 'Open 4-Language Translator & All Phrases',
    allCategories: 'All Categories',
    catTaxi: 'Taxi & Directions',
    catHostel: 'Hostel',
    catRent: 'Rent & Housing',
    catShopping: 'Shopping',
    catDining: 'Food & Dining',
    catEmergency: 'Emergency',
    largeModalTitle: 'Driver / Local Large Text Display',
    closeButton: 'Close Window',

    guidePageTitle: 'Comprehensive Armenia Living & Travel Guide',
    guidePageSubtitle: 'Documented guides on visas, currency exchange, SIM cards, public transit and living tips with verification dates',
    guideRefBadge: 'Official Armenia Travel Reference',
    searchGuidePlaceholder: 'Search articles (visa, SIM card, metro, currency)...',
    lastVerifiedLabel: 'Field Verified Date:',
    sourcesLabel: 'Official Sources:',
    readMoreButton: 'Read Full Guide',

    footerAboutTitle: 'Local Yerevan Support',
    footerPoliciesTitle: 'Policies & Legal',
    footerSectionsTitle: 'Main Sections',
    privacyPolicy: 'Privacy & Terms of Use',
    bookingRules: 'Booking & Cancellation Policies',
    footerRights: 'All rights reserved by YEREVANHUB.',
    timezoneNotice: 'All schedules and timestamps are strictly in Asia/Yerevan time.',

    // Modern Features & Widgets
    yerevanLiveStatus: 'Yerevan: Local Time | Hostels: Check-in Active',
    currencyConverterTitle: 'Live Armenian Dram (AMD) Currency Converter',
    currencyConverterSubtitle: 'Instant, transparent conversion to USD, EUR, RUB & Tomans for travelers',
    amountInAMD: 'Amount in Armenian Dram (֏ AMD)',
    approxInToman: 'Approx. in Iranian Toman',
    approxInUSD: 'Approx. in US Dollar ($)',
    approxInRUB: 'Approx. in Russian Ruble (₽)',
    neighborhoodsTitle: 'Explore Yerevan Neighborhoods',
    neighborhoodsSubtitle: 'Find the ideal district: from historic Kentron to peaceful Arabkir',
    neighborhoodKentronName: 'Kentron (City Center)',
    neighborhoodKentronDesc: 'Republic Square, Northern Avenue and Cascade. Walking distance to landmarks and lively hostels.',
    neighborhoodArabkirName: 'Arabkir & Komitas Ave',
    neighborhoodArabkirDesc: 'Cozy cafes, authentic vibe and direct metro connection. Ideal for weekly stays and budget rentals.',
    neighborhoodAvanName: 'Avan & Nork (Fresh Air)',
    neighborhoodAvanDesc: 'Ararat mountain views, modern apartment blocks and great value for monthly rentals.',
    viewHostelsInDistrict: 'View stays in this area',
    playPronunciation: 'Listen to pronunciation',
    copyForTaxi: 'Copy for Taxi Driver',
    copied: 'Copied!',
    distToRepublicSquare: 'Distance to Republic Sq.',
    minsWalk: 'min walk',
    freeCancellation: 'Free cancellation up to 24h before',
  },

  ru: {
    appName: 'YEREVANHUB',
    tagline: 'Бронирование хостелов, аренда квартир, гид по Армении и 4-язычный переводчик',
    navHostels: 'Хостелы',
    navRentals: 'Квартиры и дома',
    navGuide: 'Гид по Армении',
    navTranslator: 'Переводчик',
    navImmediateStay: 'Только приехал (Срочный заезд)',
    navAbout: 'О нас',
    navContact: 'Контакты',
    navRules: 'Правила',
    login: 'Вход',
    register: 'Регистрация',
    logout: 'Выход',
    myAccount: 'Мои брони',
    adminPanel: 'Панель администратора',
    managerPanel: 'Панель хостела',

    heroTitle: 'Надежное проживание в Армении без онлайн-предоплаты',
    heroSubtitle: 'Проверенные хостелы с оплатой на месте, отборные квартиры, путеводитель и переводчик.',
    ctaSearchHostels: 'Найти и забронировать хостел',
    ctaImmediateStay: 'Только приехал: нужно место сейчас',
    ctaSearchRentals: 'Смотреть квартиры и дома',
    quickSearchTitle: 'Поиск жилья в Ереване',
    officialPlatformBadge: 'Официальная платформа проживания в Армении',
    payOnArrivalText: 'Оплата на месте в драмах (AMD)',
    nightlyAdmissionText: 'Круглосуточное заселение и ранний заезд',
    noSmsCodeText: 'Бронь без регистрации и СМС',

    cityLabel: 'Город / Район',
    checkInLabel: 'Дата заезда',
    checkOutLabel: 'Дата выезда',
    guestsLabel: 'Гостей',
    searchButton: 'Найти',
    allCities: 'Все города',
    filtersLabel: 'Фильтры',
    clearFilters: 'Сбросить фильтры',
    sortByLabel: 'Сортировка:',
    sortRecommended: 'Рекомендации YEREVANHUB',
    sortPriceAsc: 'Сначала дешевые',
    sortPriceDesc: 'Сначала дорогие',
    sortRating: 'Высокий рейтинг',
    rentalTypeLabel: 'Тип аренды',
    longTermRental: 'Помесячная и долгосрочная аренда',
    shortTermRental: 'Посуточная и краткосрочная аренда',
    guestCount1: '1 гость',
    guestCount2: '2 гостя',
    guestCount3: '3 гостя',
    guestCount4Plus: '4+ гостя',

    reception24hBadge: 'Круглосуточная стойка (24/7)',
    immediateCheckInBadge: 'Срочное заселение доступно',
    verifiedBadge: 'Проверено экспертом',
    payOnArrivalBadge: 'Оплата на месте (AMD)',
    currencyAMD: 'AMD ֏',
    perBedPerNight: 'за кровать / ночь',
    perMonth: 'в месяц',
    perNight: 'за ночь',
    startingFrom: 'Цена от:',
    detailsButton: 'Подробнее и бронь',
    bookNowButton: 'Забронировать',
    viewPropertyButton: 'Посмотреть объект',
    viewPropertyDetails: 'Подробнее об объекте',
    viewAllHostels: 'Все хостелы',
    viewAllRentals: 'Все объекты недвижимости',
    reviewsCountText: 'отзывов',
    staffLanguagesText: 'Языки ресепшена:',
    amenitiesLabel: 'Удобства',
    rulesLabel: 'Правила проживания',
    featuredHostelsTitle: 'Популярные хостелы Еревана',
    featuredHostelsSubtitle: 'Проверенные и чистые хостелы в центре с оплатой на месте в драмах (AMD)',
    featuredRentalsTitle: 'Проверенные квартиры и дома',
    featuredRentalsSubtitle: 'Меблированное жилье с прозрачными условиями залога',
    guideHighlightsTitle: 'Гид по Армении: избранное',
    immediateCheckIn: 'Срочный заезд',
    hours24: 'Круглосуточно 24/7',
    wifi: 'Wi-Fi',
    lockers: 'Шкафчики',
    luggageStorage: 'Хранение багажа',

    immediateStayPageTitle: 'Только приехал; нужно место прямо сейчас',
    immediateStaySubtitle: 'Если вы только что прибыли на автовокзал Киликия или прилетели в аэропорт Звартноц и вам срочно нужно спальное место, эти хостелы готовы принять вас прямо сейчас.',
    immediateStayWarning: 'Важно: пожалуйста, не выезжайте по адресу до подтверждения хостела. Статус обновляется онлайн по персональной ссылке отслеживания.',
    whereAreYouNow: '1. Где вы сейчас находитесь в Ереване? (Точка прибытия)',
    kilikiaStation: 'Центральный автовокзал Киликия (автобусы из Ирана)',
    zvartnotsAirport: 'Международный аэропорт Звартноц (EVN)',
    sasuntsiDavitStation: 'Центральный железнодорожный вокзал Сасунци Давид',
    republicSquare: 'Площадь Республики (Центр города)',
    northernBusStation: 'Северный автовокзал (маршрут из Грузии/Дилижана)',
    urgentHostelsReadyCount: 'Хостелы, готовые принять прямо сейчас',
    urgentBookingButton: 'Запросить срочный заезд',
    guestNamePlaceholder: 'Имя гостя *',
    phonePlaceholder: 'Номер телефона (WhatsApp или местный) *',
    airDistance: 'Расстояние',
    estTaxiFare: 'Примерное такси',

    trackingCodeLabel: 'Код отслеживания',
    statusLabel: 'Статус',
    bookingStatusPending: 'Ожидает подтверждения хостела',
    bookingStatusConfirmed: 'Подтверждено (готово к заезду)',
    bookingStatusRejected: 'Отклонено',
    bookingStatusCancelled: 'Отменено гостем',
    bookingStatusExpired: 'Истек срок действия',
    bookingStatusCompleted: 'Проживание завершено',
    arrivalPassTitle: 'Карта заезда YEREVANHUB (Покажите водителю и ресепшену)',
    armenianAddressForTaxi: 'Адрес на армянском (для таксиста или навигатора):',
    copyArmenianAddress: 'Скопировать адрес',
    openGoogleMaps: 'Открыть на карте',
    entranceGuideTitle: 'Как найти входную дверь:',
    doorCodeTitle: 'Этаж и код домофона:',
    hostelPhoneTitle: 'Телефон хостела:',
    emergencyIssueButton: 'Хостел не отвечает / Проблема со входом',
    cancelBookingButton: 'Отменить бронирование',
    discountCodePrompt: 'Есть промокод?',
    applyCoupon: 'Применить',
    stayTotal: 'Сумма проживания',
    discountAmount: 'Скидка',
    finalToPay: 'К оплате на месте',
    payOnArrivalNote: 'Оплата производится наличными администратору хостела в драмах (AMD).',
    noOnlinePaymentNote: 'Банковская карта не требуется. Все расчеты производятся на месте в драмах (AMD).',

    whyChooseTitle: 'Почему путешественники выбирают YEREVANHUB',
    whyChooseSubtitle: 'Безопасное, прямое бронирование без скрытых комиссий и наценок',
    feature1Title: 'Без онлайн-предоплаты',
    feature1Desc: 'Гарантированная бронь без зарубежных карт. Полная оплата наличными при заселении в драмах.',
    feature2Title: 'Круглосуточный срочный заезд',
    feature2Desc: 'Специальный маршрут для прибывших ночным рейсом или автобусом, кому срочно нужна свободная кровать.',
    feature3Title: 'Проверенное жилье',
    feature3Desc: 'Все квартиры и дома проверены экспертами на соответствие документам, фото и прозрачности депозита.',
    feature4Title: 'Местная поддержка и переводчик',
    feature4Desc: 'Бесплатный доступ к 4-язычному переводчику, разговорнику и телефонной поддержке в Ереване.',

    translatorPageTitle: '4-язычный переводчик: персидский, английский, русский и армянский',
    translatorSubtitle: 'Точный перевод текстов и повседневных фраз для легкого общения в Армении',
    translatorSourceLabel: 'Исходный:',
    translatorTargetLabel: 'Целевой:',
    typeOrPasteText: 'Введите или вставьте текст сюда...',
    translationAppearsHere: 'Перевод отобразится здесь...',
    translatingAction: 'Выполняется перевод...',
    translateButton: 'Перевести',
    clearText: 'Очистить',
    copyText: 'Копировать',
    copiedText: 'Скопировано ✓',
    fullscreenDisplay: 'На весь экран',
    privacyTranslationNote: 'Все переводы строго конфиденциальны и не сохраняются на сервере.',
    travelPhrasesTitle: 'Полезные фразы для путешествия по Армении',
    travelPhrasesSubtitle: 'Проверенные фразы с транскрипцией для такси, хостелов, покупок и кафе',
    openTranslatorWithPhrases: 'Открыть переводчик и разговорник',
    allCategories: 'Все категории',
    catTaxi: 'Такси и маршруты',
    catHostel: 'Хостел',
    catRent: 'Аренда жилья',
    catShopping: 'Магазины и покупки',
    catDining: 'Еда и рестораны',
    catEmergency: 'Экстренные ситуации',
    largeModalTitle: 'Крупный экран для показа водителю или местным жителям',
    closeButton: 'Закрыть окно',

    guidePageTitle: 'Путеводитель по жизни и путешествиям в Армении',
    guidePageSubtitle: 'Проверенные статьи о визах, валюте, сим-картах, транспорте и жизни в Ереване с датами проверки',
    guideRefBadge: 'Официальный справочник YEREVANHUB',
    searchGuidePlaceholder: 'Поиск по статьям (виза, сим-карта, метро, обмен валюты)...',
    lastVerifiedLabel: 'Дата проверки на месте:',
    sourcesLabel: 'Официальные источники:',
    readMoreButton: 'Читать статью полностью',

    footerAboutTitle: 'Поддержка в Ереване',
    footerPoliciesTitle: 'Правила и информация',
    footerSectionsTitle: 'Основные разделы',
    privacyPolicy: 'Конфиденциальность и условия',
    bookingRules: 'Правила бронирования и отмены',
    footerRights: 'Все права защищены YEREVANHUB.',
    timezoneNotice: 'Все расчеты и время указаны по поясу Asia/Yerevan.',

    // Modern Features & Widgets
    yerevanLiveStatus: 'Ереван: Местное время | Хостелы: Заезд открыт',
    currencyConverterTitle: 'Конвертер армянского драма (AMD)',
    currencyConverterSubtitle: 'Быстрый и точный расчет стоимости в рублях, долларах и томанах',
    amountInAMD: 'Сумма в армянских драмах (֏ AMD)',
    approxInToman: 'Примерно в туманах',
    approxInUSD: 'Примерно в долларах США ($)',
    approxInRUB: 'Примерно в рублях (₽)',
    neighborhoodsTitle: 'Районы Еревана: где остановиться',
    neighborhoodsSubtitle: 'Выберите район по вкусу: от оживленного Кентрона до спокойного Арабкира',
    neighborhoodKentronName: 'Кентрон (Центр города)',
    neighborhoodKentronDesc: 'Площадь Республики, Северный проспект и Каскад. Все достопримечательности в шаговой доступности.',
    neighborhoodArabkirName: 'Арабкир и проспект Комитаса',
    neighborhoodArabkirDesc: 'Уютные кафе, аутентичная атмосфера и метро. Отличный выбор для аренды и экономии.',
    neighborhoodAvanName: 'Аван и Норк (Свежий воздух)',
    neighborhoodAvanDesc: 'Вид на Арарат, современные жилые комплексы и выгодные цены на долгосрочную аренду.',
    viewHostelsInDistrict: 'Смотреть жилье в этом районе',
    playPronunciation: 'Прослушать произношение',
    copyForTaxi: 'Скопировать для такси',
    copied: 'Скопировано!',
    distToRepublicSquare: 'До площади Республики',
    minsWalk: 'мин пешком',
    freeCancellation: 'Бесплатная отмена за 24ч',
  },

  hy: {
    appName: 'YEREVANHUB',
    tagline: 'Հոսթելների ամրագրում, բնակարանների վարձակալություն, Հայաստանի ուղեցույց և թարգմանիչ',
    navHostels: 'Հոսթելներ',
    navRentals: 'Բնակարաններ և տներ',
    navGuide: 'Հայաստանի ուղեցույց',
    navTranslator: 'Թարգմանիչ',
    navImmediateStay: 'Նոր եմ հասել (Շտապ տեղավորում)',
    navAbout: 'Մեր մասին',
    navContact: 'Կապ',
    navRules: 'Կանոններ',
    login: 'Մուտք',
    register: 'Գրանցում',
    logout: 'Ելք',
    myAccount: 'Իմ ամրագրումները',
    adminPanel: 'Գլխավոր կառավարում',
    managerPanel: 'Հոսթելի վահանակ',

    heroTitle: 'Հուսալի կացություն Հայաստանում առանց առցանց կանխավճարի',
    heroSubtitle: 'Ստուգված հոսթելներ տեղում վճարմամբ, բնակարանների վարձակալություն և ճամփորդական ուղեցույց:',
    ctaSearchHostels: 'Որոնել և ամրագրել հոսթել',
    ctaImmediateStay: 'Նոր եմ հասել. տեղ է պետք հիմա',
    ctaSearchRentals: 'Դիտել բնակարանները և տները',
    quickSearchTitle: 'Կացարանի որոնում Երևանում',
    officialPlatformBadge: 'Հայաստանում կացության պաշտոնական հարթակ',
    payOnArrivalText: 'Վճարում տեղում հայկական դրամով (AMD)',
    nightlyAdmissionText: 'Գիշերային ընդունելություն և վաղ ժամանում',
    noSmsCodeText: 'Ամրագրում առանց գրանցման',

    cityLabel: 'Քաղաք / Թաղամաս',
    checkInLabel: 'Մուտքի ամսաթիվ',
    checkOutLabel: 'Ելքի ամսաթիվ',
    guestsLabel: 'Հյուրերի քանակ',
    searchButton: 'Որոնել',
    allCities: 'Բոլոր քաղաքները',
    filtersLabel: 'Ֆիլտրեր',
    clearFilters: 'Մաքրել ֆիլտրերը',
    sortByLabel: 'Դասավորել՝',
    sortRecommended: 'YEREVANHUB-ի ընտրություն',
    sortPriceAsc: 'Սկզբում մատչելի',
    sortPriceDesc: 'Սկզբում թանկ',
    sortRating: 'Բարձր գնահատական',
    rentalTypeLabel: 'Վարձակալության տեսակ',
    longTermRental: 'Ամսական և երկարաժամկետ',
    shortTermRental: 'Օրավարձով և կարճաժամկետ',
    guestCount1: '1 հյուր',
    guestCount2: '2 հյուր',
    guestCount3: '3 հյուր',
    guestCount4Plus: '4+ հյուր',

    reception24hBadge: '24/7 ընդունարան',
    immediateCheckInBadge: 'Անմիջապես տեղավորում',
    verifiedBadge: 'Ստուգված է',
    payOnArrivalBadge: 'Վճարում տեղում (AMD)',
    currencyAMD: 'AMD ֏',
    perBedPerNight: 'մահճակալ / գիշեր',
    perMonth: 'ամսական',
    perNight: 'գիշեր',
    startingFrom: 'Գինը սկսած՝',
    detailsButton: 'Մանրամասներ և ամրագրում',
    bookNowButton: 'Ամրագրել',
    viewPropertyButton: 'Դիտել գույքը',
    viewPropertyDetails: 'Դիտել գույքի մանրամասները',
    viewAllHostels: 'Դիտել բոլոր հոսթելները',
    viewAllRentals: 'Դիտել բոլոր գույքերը',
    reviewsCountText: 'կարծիք',
    staffLanguagesText: 'Սպասարկման լեզուները՝',
    amenitiesLabel: 'Հարմարություններ',
    rulesLabel: 'Կանոններ և պայմաններ',
    featuredHostelsTitle: 'Երևանի ընտրված հոսթելները',
    featuredHostelsSubtitle: 'Ստուգված և մաքուր հոսթելներ քաղաքի կենտրոնում՝ տեղում վճարմամբ (AMD)',
    featuredRentalsTitle: 'Ընտրված բնակարաններ և տներ',
    featuredRentalsSubtitle: 'Կահավորված և ստուգված բնակարաններ՝ թափանցիկ պայմաններով',
    guideHighlightsTitle: 'Հայաստանի ուղեցույցի ընտրանի',
    immediateCheckIn: 'Անհապաղ մուտք',
    hours24: '24/7 շուրջօրյա',
    wifi: 'Wi-Fi',
    lockers: 'Պահարաններ',
    luggageStorage: 'Ուղեբեռի պահեստ',

    immediateStayPageTitle: 'Նոր եմ հասել. տեղ է պետք հենց հիմա',
    immediateStaySubtitle: 'Եթե նոր եք իջել Կիլիկիա ավտոկայանից կամ Զվարթնոց օդանավակայանից և ուշ ժամի շտապ մահճակալ է պետք, այս հոսթելները պատրաստ են ընդունել ձեզ:',
    immediateStayWarning: 'Ուշադրություն. Խնդրում ենք չգնալ հասցեով մինչև հաստատում չստանաք: Ձեր հարցումը մշակվում է առցանց և երևում է անձնական հղումով:',
    whereAreYouNow: '1. Որտե՞ղ եք գտնվում Երևանում այս պահին (ժամանման վայր)',
    kilikiaStation: 'Կիլիկիա կենտրոնական ավտոկայան (Թեհրան/Թավրիզ ավտոբուս)',
    zvartnotsAirport: 'Զվարթնոց միջազգային օդանավակայան (EVN)',
    sasuntsiDavitStation: 'Սասունցի Դավիթ երկաթուղային կայարան',
    republicSquare: 'Հանրապետության հրապարակ (Քաղաքի կենտրոն)',
    northernBusStation: 'Հյուսիսային ավտոկայան (Վրաստան/Դիլիջան)',
    urgentHostelsReadyCount: 'Այս պահին ընդունելության պատրաստ հոսթելներ',
    urgentBookingButton: 'Շտապ տեղավորման հարցում',
    guestNamePlaceholder: 'Հյուրի անուն *',
    phonePlaceholder: 'Հեռախոսահամար (WhatsApp կամ տեղական) *',
    airDistance: 'Հեռավորություն',
    estTaxiFare: 'Տաքսու մոտավոր գին',

    trackingCodeLabel: 'Հետևման կոդ',
    statusLabel: 'Կարգավիճակ',
    bookingStatusPending: 'Սպասում է հոսթելի հաստատմանը',
    bookingStatusConfirmed: 'Հաստատված է (պատրաստ է ընդունման)',
    bookingStatusRejected: 'Մերժված է',
    bookingStatusCancelled: 'Չեղարկված է հյուրի կողմից',
    bookingStatusExpired: 'Ժամկետանց է',
    bookingStatusCompleted: 'Ավարտված է',
    arrivalPassTitle: 'YEREVANHUB Ժամանման քարտ (Ցույց տվեք վարորդին կամ ընդունարանին)',
    armenianAddressForTaxi: 'Հասցեն հայերենով (տաքսու վարորդին ցույց տալու համար):',
    copyArmenianAddress: 'Պատճենել հասցեն',
    openGoogleMaps: 'Բացել քարտեզը',
    entranceGuideTitle: 'Մուտքի դռան ուղեցույց՝',
    doorCodeTitle: 'Հարկ և մուտքի դռան ծածկագիր՝',
    hostelPhoneTitle: 'Հոսթելի հեռախոս՝',
    emergencyIssueButton: 'Հոսթելը չի պատասխանում / Մուտքի խնդիր',
    cancelBookingButton: 'Չեղարկել այս ամրագրումը',
    discountCodePrompt: 'Ունե՞ք զեղչի կոդ:',
    applyCoupon: 'Կիրառել',
    stayTotal: 'Ընդհանուր գումար',
    discountAmount: 'Զեղչ',
    finalToPay: 'Վճարման ենթակա տեղում',
    payOnArrivalNote: 'Վճարվում է կանխիկ հոսթել ժամանելիս հայկական դրամով (AMD):',
    noOnlinePaymentNote: 'Առցանց քարտային վճարում պետք չէ. հոսթելի վճարումը կատարվում է տեղում դրամով (AMD):',

    whyChooseTitle: 'Ինչո՞ւ են ճանապարհորդներն ընտրում YEREVANHUB-ը',
    whyChooseSubtitle: 'Անվտանգ, ուղիղ և առանց միջնորդավճարների կացություն Հայաստանում',
    feature1Title: 'Առանց առցանց կանխավճարի',
    feature1Desc: 'Երաշխավորված ամրագրում առանց քարտերի. ամբողջական վճարում տեղում հոսթել ժամանելիս դրամով:',
    feature2Title: 'Շտապ գիշերային ընդունելություն',
    feature2Desc: 'Հատուկ ուղի ուշ ժամերին ավտոբուսից կամ օդանավակայանից նոր ժամանածների համար:',
    feature3Title: 'Անձամբ ստուգված գույքեր',
    feature3Desc: 'Բոլոր բնակարանները ստուգված են սեփականության, դիրքի և գրավի պայմանների մասով:',
    feature4Title: 'Տեղական աջակցություն և թարգմանիչ',
    feature4Desc: 'Անվճար մուտք դեպի 4-լեզվով թարգմանիչ, խոսակցարան և տեղական հեռախոսային աջակցություն:',

    translatorPageTitle: '4-լեզվով թարգմանիչ. Պարսկերեն, Անգլերեն, Ռուսերեն և Հայերեն',
    translatorSubtitle: 'Տեքստերի և առօրյա արտահայտությունների ճշգրիտ թարգմանություն հաղորդակցվելու համար',
    translatorSourceLabel: 'Սկզբնաղբյուր՝',
    translatorTargetLabel: 'Թիրախ՝',
    typeOrPasteText: 'Գրեք կամ տեղադրեք տեքստն այստեղ...',
    translationAppearsHere: 'Թարգմանությունը կհայտնվի այստեղ...',
    translatingAction: 'Թարգմանվում է...',
    translateButton: 'Թարգմանել',
    clearText: 'Մաքրել',
    copyText: 'Պատճենել',
    copiedText: 'Պատճենված է ✓',
    fullscreenDisplay: 'Ամբողջ էկրանով',
    privacyTranslationNote: 'Թարգմանվող տեքստերը խիստ գաղտնի են և չեն պահպանվում սերվերում:',
    travelPhrasesTitle: 'Օգտակար արտահայտություններ Հայաստանում ճանապարհորդելիս',
    travelPhrasesSubtitle: 'Ստուգված արտահայտություններ արտասանությամբ տաքսու, հոսթելի, առևտրի և սննդի համար',
    openTranslatorWithPhrases: 'Բացել թարգմանիչը և բոլոր արտահայտությունները',
    allCategories: 'Բոլոր բաժինները',
    catTaxi: 'Տաքսի և հասցեներ',
    catHostel: 'Հոսթել',
    catRent: 'Բնակարանի վարձույթ',
    catShopping: 'Առևտուր',
    catDining: 'Սնունդ և ճաշարան',
    catEmergency: 'Շտապ օգնություն',
    largeModalTitle: 'Խոշոր էկրան վարորդին կամ տեղացուն ցույց տալու համար',
    closeButton: 'Փակել պատուհանը',

    guidePageTitle: 'Հայաստանում ապրելու և ճանապարհորդելու ուղեցույց',
    guidePageSubtitle: 'Ստուգված հոդվածներ վիզաների, արտարժույթի, քարտերի և տրանսպորտի մասին',
    guideRefBadge: 'YEREVANHUB Տեղեկատվական կենտրոն',
    searchGuidePlaceholder: 'Փնտրել հոդվածներում (վիզա, SIM քարտ, մետրո, արժույթ)...',
    lastVerifiedLabel: 'Վերջին ստուգման ամսաթիվ՝',
    sourcesLabel: 'Պաշտոնական աղբյուրներ՝',
    readMoreButton: 'Կարդալ ամբողջությամբ',

    footerAboutTitle: 'Երևանյան աջակցություն',
    footerPoliciesTitle: 'Կանոններ և տեղեկատվություն',
    footerSectionsTitle: 'Գլխավոր բաժիններ',
    privacyPolicy: 'Գաղտնիություն և պայմաններ',
    bookingRules: 'Ամրագրման և չեղարկման կանոններ',
    footerRights: 'Բոլոր իրավունքները պաշտպանված են YEREVANHUB-ի կողմից:',
    timezoneNotice: 'Բոլոր հաշվարկները կատարվում են Asia/Yerevan ժամային գոտով:',

    // Modern Features & Widgets
    yerevanLiveStatus: 'Երևան. Պաշտոնական ժամ | Հոսթելներ. Ընդունելությունը բաց է',
    currencyConverterTitle: 'ՀՀ Դրամի (AMD) արժույթի հաշվիչ',
    currencyConverterSubtitle: 'Արագ հաշվարկ դոլարով, ռուբլիով և թումանով ճանապարհորդների համար',
    amountInAMD: 'Գումարը ՀՀ Դրամով (֏ AMD)',
    approxInToman: 'Մոտավորապես Թումանով',
    approxInUSD: 'Մոտավորապես ԱՄՆ դոլարով ($)',
    approxInRUB: 'Մոտավորապես ՌԴ ռուբլիով (₽)',
    neighborhoodsTitle: 'Երևանի հայտնի թաղամասերը',
    neighborhoodsSubtitle: 'Որտեղ մնալ. պատմական Կենտրոնից մինչև հարմարավետ Արաբկիր',
    neighborhoodKentronName: 'Կենտրոն (Քաղաքի սիրտը)',
    neighborhoodKentronDesc: 'Հանրապետության հրապարակ, Հյուսիսային պողոտա և Կասկադ: Ամեն ինչ քայլելու հեռավորության վրա:',
    neighborhoodArabkirName: 'Արաբկիր և Կոմիտասի պողոտա',
    neighborhoodArabkirDesc: 'Հարմարավետ սրճարաններ, մետրոյի հասանելիություն և բարենպաստ գներ:',
    neighborhoodAvanName: 'Ավան և Նորք (Մաքուր օդ)',
    neighborhoodAvanDesc: 'Տեսարան դեպի Արարատ լեռ, նորակառույց համալիրներ և մատչելի երկարաժամկետ վարձույթ:',
    viewHostelsInDistrict: 'Դիտել այս տարածքի կացարանները',
    playPronunciation: 'Լսել հայերեն արտասանությունը',
    copyForTaxi: 'Պատճենել տաքսու վարորդի համար',
    copied: 'Պատճենված է!',
    distToRepublicSquare: 'Հեռավորությունը Հանրապետության հրապարակից',
    minsWalk: 'րոպե քայլք',
    freeCancellation: 'Անվճար չեղարկում մինչև 24 ժամ առաջ',
  },
};
