import { featureText } from '../i18n/features';
import { VerificationInfo } from '../components/VerificationInfo';
import { PlaceActions } from '../components/PlaceActions';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import React, { useState } from 'react';
import { AppLanguage, Hostel, RoomType, Review } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import {
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  Zap,
  Wifi,
  Lock,
  Coffee,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Tag,
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Phone,
  Send,
  Bed,
} from 'lucide-react';
import {
  calculateNights,
  calculateBookingPrice,
  analyzeArrivalHour,
  validateCoupon,
} from '../utils/pricing';
import { getLocalized, getCityName } from '../utils/i18n';
import { appStore } from '../services/store';
import { HostelLocationMap } from '../components/HostelLocationMap';

interface Props {
  currentLang: AppLanguage;
  hostel: Hostel;
  reviews: Review[];
  onNavigate: (view: string, params?: any) => void;
  initialBooking?: { checkIn?: string; checkOut?: string; guests?: number };
  getHostelRating: (hostelId: string) => { avg: number; count: number };
}

const DETAIL_TEXTS = {
  fa: {
    breadcrumbHome: 'صفحه اصلی',
    availableRoomsTitle: 'انواع اتاق‌ها و تخت‌های موجود',
    perNightPayOnArrival: 'هر شب (پرداخت در محل)',
    selectedCheck: 'انتخاب شده ✓',
    selectThisType: 'انتخاب این نوع',
    curtain: 'پرده دور تخت',
    bedsidePlug: 'پریز کنار تخت',
    locker: 'کمد قفل‌دار',
    ownLock: '(نیاز به قفل شخصی)',
    codeLock: '(رمزی)',
    overnightTitle: 'راهنمای ویژه ورود در نیمه‌شب یا صبح زود (اتوبوس تهران - ایروان)',
    overnightDesc: 'اگر ساعت رسیدن شما بین نیمه‌شب تا ۶ صبح است: تحویل استاندارد اتاق ساعت ۱۴:۰۰ است. چنانچه می‌خواهید به محض رسیدن در بامداد روی تخت بخوابید، رزرو باید از شب قبل آغاز شود. در غیر این صورت، پذیرش هاستل چمدان شما را رایگان تحویل گرفته و می‌توانید تا زمان تحویل تخت (۱۴:۰۰) از لابی و آشپزخانه استفاده کنید.',
    standardCheckIn: 'ساعت تحویل استاندارد:',
    standardCheckOut: 'ساعت تخلیه:',
    receptionHours: 'ساعت کار پذیرش:',
    reception24hText: '۲۴ ساعته شبانه‌روزی',
    amenitiesAndRules: 'امکانات هاستل و قوانین اقامت',
    wifiFree: 'اینترنت پرسرعت رایگان',
    lockersAmenity: 'کمد قفل‌دار شخصی',
    freeLuggage: 'انبار چمدان رایگان',
    sharedKitchen: 'آشپزخانه مجهز اشتراکی',
    hasElevator: 'دارای آسانسور',
    quietHoursLabel: 'ساعات آرامش:',
    cancelAndPaymentLabel: 'سیاست لغو و پرداخت:',
    verifiedReviews: 'نظرات مسافران تأییدشده',
    reviewAfterStayNotice: 'تنها پس از تکمیل اقامت امکان ثبت نظر وجود دارد',
    noReviewsYet: 'هنوز نظری برای این هاستل ثبت نشده است.',
    startingPriceLabel: 'قیمت شروع اقامت:',
    checkInDate: 'تاریخ ورود',
    checkOutDate: 'تاریخ خروج',
    bedQuantity: 'تعداد تخت / اتاق',
    guestsCount: 'تعداد مهمانان',
    approxArrival: 'ساعت تقریبی رسیدن به هاستل',
    arrival14: 'ساعت ۱۴:۰۰ (پذیرش عادی)',
    arrival18: 'ساعت ۱۸:۰۰ (عصر)',
    arrival22: 'ساعت ۲۲:۰۰ (شب)',
    arrival03: 'ساعت ۰۳:۰۰ بامداد (ورود شبانه اتوبوس)',
    arrival07: 'ساعت ۰۷:۰۰ صبح (ورود زودهنگام)',
    guestInfoLabel: 'اطلاعات تماس مسافر (حداقل اطلاعات بدون ثبت‌نام)',
    fullName: 'نام و نام خانوادگی *',
    phoneOrEmail: 'شماره تماس یا ایمیل *',
    phoneTab: 'شماره تماس',
    emailTab: 'ایمیل',
    contactHint: 'شماره‌های بین‌المللی و ایران پذیرفته می‌شوند. نیازی به کد یکبارمصرف نیست.',
    lowerBunk: 'درخواست ترجیحی تخت پایین (غیرقطعی و بر اساس موجودی)',
    specialRequests: 'توضیحات یا نیازهای خاص (اختیاری)',
    haveCoupon: 'کد تخفیف دارید؟',
    removeCoupon: 'حذف کد',
    apply: 'اعمال',
    stayDuration: 'مدت اقامت:',
    basePrice: 'مبلغ پایه اقامت:',
    discount: 'تخفیف',
    overnightFee: 'هزینه ورود شبانه / زودهنگام:',
    finalPayOnArrival: 'مبلغ نهایی پرداخت در محل:',
    termsCheckbox: 'قوانین اقامت، ساعت تحویل و سیاست لغو هاستل را مطالعه کرده و می‌پذیرم. هزینه را در بدو ورود نقداً پرداخت خواهم کرد.',
    submitBtn: 'ارسال درخواست رزرو (دریافت پیوند پیگیری)',
    submittingBtn: 'در حال ارسال درخواست...',
    trackingNotice: 'ثبت درخواست اولیه بلافاصله لینک اختصاصی پیگیری در اختیارتان قرار می‌دهد. پس از بررسی هاستلدار وضعیت تأیید خواهد شد.',
    errorNameRequired: 'وارد کردن نام و نام خانوادگی الزامی است.',
    errorContactRequired: 'شماره تماس یا ایمیل معتبر برای هماهنگی الزامی است.',
    errorNightsRequired: 'تاریخ خروج باید حداقل ۱ شب پس از تاریخ ورود باشد.',
    errorTermsRequired: 'لطفاً قوانین رزرو و لغو را مطالعه و تأیید نمایید.',
  },
  en: {
    breadcrumbHome: 'Home',
    availableRoomsTitle: 'Available Rooms & Bed Options',
    perNightPayOnArrival: 'per night (pay on arrival)',
    selectedCheck: 'Selected ✓',
    selectThisType: 'Select Option',
    curtain: 'Privacy Curtain',
    bedsidePlug: 'Bedside Socket',
    locker: 'Locker',
    ownLock: '(own padlock needed)',
    codeLock: '(combination lock)',
    overnightTitle: 'Special Midnight & Early Morning Arrival Advisor',
    overnightDesc: 'If your arrival time is between midnight and 06:00 AM: Standard check-in is at 14:00. To sleep on a bed immediately upon arrival in the early hours, your booking must begin the previous night. Otherwise, reception offers free luggage drop and access to common spaces.',
    standardCheckIn: 'Standard check-in:',
    standardCheckOut: 'Standard check-out:',
    receptionHours: 'Front desk hours:',
    reception24hText: '24/7 round the clock',
    amenitiesAndRules: 'Hostel Amenities & House Rules',
    wifiFree: 'Free High-speed Wi-Fi',
    lockersAmenity: 'Personal Lockers',
    freeLuggage: 'Free Luggage Storage',
    sharedKitchen: 'Fully Equipped Guest Kitchen',
    hasElevator: 'Elevator Available',
    quietHoursLabel: 'Quiet Hours:',
    cancelAndPaymentLabel: 'Cancellation & Payment Policy:',
    verifiedReviews: 'Verified Traveler Reviews',
    reviewAfterStayNotice: 'Reviews can only be posted after completing a stay',
    noReviewsYet: 'No reviews yet for this hostel.',
    startingPriceLabel: 'Starting price:',
    checkInDate: 'Check-in Date',
    checkOutDate: 'Check-out Date',
    bedQuantity: 'Beds / Rooms',
    guestsCount: 'Number of Guests',
    approxArrival: 'Estimated Arrival Time',
    arrival14: '14:00 (Standard check-in)',
    arrival18: '18:00 (Evening)',
    arrival22: '22:00 (Night)',
    arrival03: '03:00 AM (Overnight bus arrival)',
    arrival07: '07:00 AM (Early morning)',
    guestInfoLabel: 'Guest Contact Details (No account required)',
    fullName: 'Full Name *',
    phoneOrEmail: 'Phone or Email *',
    phoneTab: 'Phone',
    emailTab: 'Email',
    contactHint: 'International & local numbers accepted. No SMS code verification required.',
    lowerBunk: 'Request bottom bunk if available (subject to availability)',
    specialRequests: 'Special requests or arrival notes (optional)',
    haveCoupon: 'Have a coupon code?',
    removeCoupon: 'Remove code',
    apply: 'Apply',
    stayDuration: 'Stay duration:',
    basePrice: 'Base accommodation:',
    discount: 'Discount',
    overnightFee: 'Early / Overnight fee:',
    finalPayOnArrival: 'Final to pay on arrival (cash):',
    termsCheckbox: 'I have read and accept the hostel rules, check-in terms, and cancellation policies. I will pay in cash upon arrival.',
    submitBtn: 'Submit Booking Request (Instant Tracking Link)',
    submittingBtn: 'Submitting request...',
    trackingNotice: 'Submitting generates your private tracking link immediately. The hostel will review and confirm your bed.',
    errorNameRequired: 'Guest full name is required.',
    errorContactRequired: 'Valid phone number or email is required.',
    errorNightsRequired: 'Check-out must be at least 1 night after check-in.',
    errorTermsRequired: 'Please accept the booking and cancellation terms.',
  },
  ru: {
    breadcrumbHome: 'Главная',
    availableRoomsTitle: 'Доступные номера и места',
    perNightPayOnArrival: 'за ночь (оплата на месте)',
    selectedCheck: 'Выбрано ✓',
    selectThisType: 'Выбрать этот тип',
    curtain: 'Шторка на кровати',
    bedsidePlug: 'Розетка у кровати',
    locker: 'Индивидуальный шкафчик',
    ownLock: '(нужен свой замок)',
    codeLock: '(кодовый замок)',
    overnightTitle: 'Советы при ночном или раннем заезде (автобус Тегеран/Тбилиси)',
    overnightDesc: 'Если вы прибываете ночью (между 00:00 и 06:00): Стандартное время заселения — 14:00. Чтобы сразу лечь спать, бронируйте с предыдущих суток. В противном случае хостел бесплатно примет ваш багаж в лобби.',
    standardCheckIn: 'Стандартный заезд:',
    standardCheckOut: 'Стандартный выезд:',
    receptionHours: 'Часы работы стойки:',
    reception24hText: 'Круглосуточно 24/7',
    amenitiesAndRules: 'Удобства хостела и правила',
    wifiFree: 'Бесплатный скоростной Wi-Fi',
    lockersAmenity: 'Индивидуальные шкафчики',
    freeLuggage: 'Бесплатное хранение багажа',
    sharedKitchen: 'Общая оборудованная кухня',
    hasElevator: 'Есть лифт',
    quietHoursLabel: 'Тихие часы:',
    cancelAndPaymentLabel: 'Политика отмены и оплаты:',
    verifiedReviews: 'Отзывы подтвержденных гостей',
    reviewAfterStayNotice: 'Отзыв можно оставить только после выезда',
    noReviewsYet: 'Отзывов пока нет.',
    startingPriceLabel: 'Стоимость от:',
    checkInDate: 'Дата заезда',
    checkOutDate: 'Дата выезда',
    bedQuantity: 'Количество мест / номеров',
    guestsCount: 'Количество гостей',
    approxArrival: 'Примерное время заезда',
    arrival14: '14:00 (Стандартное заселение)',
    arrival18: '18:00 (Вечер)',
    arrival22: '22:00 (Ночь)',
    arrival03: '03:00 ночи (Ночной автобус)',
    arrival07: '07:00 утра (Ранний заезд)',
    guestInfoLabel: 'Контакты гостя (без обязательной регистрации)',
    fullName: 'Имя и фамилия *',
    phoneOrEmail: 'Телефон или Email *',
    phoneTab: 'Телефон',
    emailTab: 'Email',
    contactHint: 'Принимаются любые международные номера. Без SMS подтверждений.',
    lowerBunk: 'Пожелание: нижняя кровать (при наличии свободных)',
    specialRequests: 'Пожелания или комментарии (необязательно)',
    haveCoupon: 'Есть промокод?',
    removeCoupon: 'Удалить',
    apply: 'Применить',
    stayDuration: 'Длительность:',
    basePrice: 'Базовая стоимость:',
    discount: 'Скидка',
    overnightFee: 'Доплата за ночной/ранний заезд:',
    finalPayOnArrival: 'Итого к оплате на месте (наличные):',
    termsCheckbox: 'Я согласен с правилами хостела, условиями заезда и отмены. Оплату внесу наличными при заселении.',
    submitBtn: 'Забронировать (получить ссылку отслеживания)',
    submittingBtn: 'Отправка заявки...',
    trackingNotice: 'После отправки вы сразу получите персональную ссылку для отслеживания статуса бронирования.',
    errorNameRequired: 'Укажите имя и фамилию.',
    errorContactRequired: 'Укажите контактный телефон или email.',
    errorNightsRequired: 'Дата выезда должна быть минимум на 1 ночь позже даты заезда.',
    errorTermsRequired: 'Пожалуйста, подтвердите согласие с правилами.',
  },
  hy: {
    breadcrumbHome: 'Գլխավոր',
    availableRoomsTitle: 'Առկա սենյակներ և տեղեր',
    perNightPayOnArrival: 'մեկ գիշերվա համար (տեղում վճարում)',
    selectedCheck: 'Ընտրված է ✓',
    selectThisType: 'Ընտրել այս տարբերակը',
    curtain: 'Անկողնու վարագույր',
    bedsidePlug: 'Վարդակ մահճակալի մոտ',
    locker: 'Փականով պահարան',
    ownLock: '(անձնական կողպեքով)',
    codeLock: '(կոդով)',
    overnightTitle: 'Խորհրդատվություն գիշերային կամ վաղ ժամանման դեպքում',
    overnightDesc: 'Եթե ժամանում եք գիշերը (00:00 - 06:00): Ստանդարտ մուտքը 14:00-ին է: Անմիջապես քնելու համար անհրաժեշտ է ամրագրել նախորդ օրվանից: Այլապես կարող եք անվճար թողնել ուղեբեռը ընդունարանում:',
    standardCheckIn: 'Ստանդարտ մուտք՝',
    standardCheckOut: 'Ստանդարտ ելք՝',
    receptionHours: 'Ընդունարանի աշխատաժամերը՝',
    reception24hText: '24/7 շուրջօրյա',
    amenitiesAndRules: 'Հարմարություններ և ներքին կանոններ',
    wifiFree: 'Անվճար արագ Wi-Fi',
    lockersAmenity: 'Անհատական պահարաններ',
    freeLuggage: 'Ուղեբեռի անվճար պահեստ',
    sharedKitchen: 'Ընդհանուր կահավորված խոհանոց',
    hasElevator: 'Վերելակ առկա է',
    quietHoursLabel: 'Հանգստի ժամեր՝',
    cancelAndPaymentLabel: 'Չեղարկման և վճարման կանոններ՝',
    verifiedReviews: 'Հաստատված հյուրերի կարծիքները',
    reviewAfterStayNotice: 'Կարծիք կարող է թողնել միայն բնակված հյուրը',
    noReviewsYet: 'Այս հոսթելի համար դեռ կարծիքներ չկան:',
    startingPriceLabel: 'Սկսած՝',
    checkInDate: 'Մուտքի ամսաթիվ',
    checkOutDate: 'Ելքի ամսաթիվ',
    bedQuantity: 'Տեղերի / Սենյակների քանակ',
    guestsCount: 'Հյուրերի քանակ',
    approxArrival: 'Մոտավոր ժամանում',
    arrival14: '14:00 (Ստանդարտ մուտք)',
    arrival18: '18:00 (Երեկո)',
    arrival22: '22:00 (Գիշեր)',
    arrival03: '03:00 (Գիշերային ավտոբուս)',
    arrival07: '07:00 (Վաղ առավոտ)',
    guestInfoLabel: 'Հյուրի կոնտակտային տվյալներ (առանց գրանցման)',
    fullName: 'Անուն և ազգանուն *',
    phoneOrEmail: 'Հեռախոս կամ էլ. հասցե *',
    phoneTab: 'Հեռախոս',
    emailTab: 'Էլ. հասցե',
    contactHint: 'Ընդունվում են բոլոր միջազգային համարները: Առանց SMS հաստատման:',
    lowerBunk: 'Նախընտրելի է ներքևի մահճակալ (հնարավորության դեպքում)',
    specialRequests: 'Հատուկ ցանկություններ (ըստ ցանկության)',
    haveCoupon: 'Ունե՞ք զեղչի կոդ',
    removeCoupon: 'Հեռացնել',
    apply: 'Կիրառել',
    stayDuration: 'Կեցության ժամկետ՝',
    basePrice: 'Հիմնական գումար՝',
    discount: 'Զեղչ',
    overnightFee: 'Գիշերային/վաղ ժամանման վճար՝',
    finalPayOnArrival: 'Վճարման ենթակա գումարը տեղում (կանխիկ)՝',
    termsCheckbox: 'Ես ծանոթացել և ընդունում եմ հոսթելի կանոնները: Գումարը կվճարեմ տեղում կանխիկ:',
    submitBtn: 'Ուղարկել ամրագրման հայտը (ստանալ հետևման հղում)',
    submittingBtn: 'Ուղարկվում է...',
    trackingNotice: 'Հայտն ուղարկելուց հետո կստանաք անհատական հետևման հղում:',
    errorNameRequired: 'Անուն և ազգանունը պարտադիր է:',
    errorContactRequired: 'Կոնտակտային հեռախոսը կամ էլ. հասցեն պարտադիր է:',
    errorNightsRequired: 'Ելքի օրը պետք է լինի առնվազն 1 գիշեր հետո:',
    errorTermsRequired: 'Խնդրում ենք հաստատել կանոնների ընդունումը:',
  },
};

export const HostelDetailView: React.FC<Props> = ({
  currentLang,
  hostel,
  reviews,
  onNavigate,
  getHostelRating,
  initialBooking,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const tr = DETAIL_TEXTS[currentLang] || DETAIL_TEXTS.fa;
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const { avg, count } = getHostelRating(hostel.id);

  // Booking Form State
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(
    hostel.roomTypes[0]?.id || ''
  );
  const [checkIn, setCheckIn] = useState(() => initialBooking?.checkIn || yerevanToday());
  const [checkOut, setCheckOut] = useState(() => initialBooking?.checkOut || addCalendarDays(initialBooking?.checkIn || yerevanToday(), 1));
  const [quantity, setQuantity] = useState(initialBooking?.guests || 1);
  const [guestsCount, setGuestsCount] = useState(initialBooking?.guests || 1);
  const [guestName, setGuestName] = useState('');
  const [contactType, setContactType] = useState<'phone' | 'email'>('phone');
  const [guestContact, setGuestContact] = useState('');
  const [arrivalTime, setArrivalTime] = useState('14:00');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLowerBunkRequested, setIsLowerBunkRequested] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Discount coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponError, setCouponError] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const selectedRoom = hostel.roomTypes.find(rt => rt.id === selectedRoomTypeId) || hostel.roomTypes[0];

  // Arrival hour analysis
  const arrivalHourNum = parseInt(arrivalTime.split(':')[0] || '14', 10);
  const arrivalAnalysis = analyzeArrivalHour(arrivalHourNum);

  // Pricing calculation
  const nights = calculateNights(checkIn, checkOut);
  const currentCoupon = appStore.getState().coupons.find(
    c => c.code.toUpperCase() === appliedCouponCode.trim().toUpperCase() && c.active
  );
  const couponValidation = validateCoupon(appliedCouponCode,
    (selectedRoom?.pricePerNightAMD ?? hostel.minPricePerNightAMD) * quantity * nights, currentCoupon);
  const discountPercent = couponValidation.valid ? couponValidation.discountPercent : 0;

  const earlyFee = (arrivalAnalysis.isEarlyMorning && hostel.earlyCheckInAvailable) ? hostel.earlyCheckInFeeAMD : 0;
  const lateFee = (arrivalAnalysis.isOvernightArrival && hostel.lateArrivalAvailable) ? hostel.lateArrivalFeeAMD : 0;

  const pricing = calculateBookingPrice({
    pricePerNight: selectedRoom?.pricePerNightAMD || hostel.minPricePerNightAMD,
    checkIn,
    checkOut,
    quantity,
    discountPercent,
    earlyCheckInFee: earlyFee,
    lateCheckInFee: lateFee,
  });

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    const response = await appStore.checkCoupon(clean,
      (selectedRoom?.pricePerNightAMD ?? hostel.minPricePerNightAMD) * quantity * nights);
    if (!response.success || !response.coupon) {
      setAppliedCouponCode(''); setCouponError(response.error || 'کد معتبر نیست.'); return;
    }
    const result = { discountPercent: response.coupon.percent };

    setAppliedCouponCode(clean);
    setCouponSuccess(`Coupon applied (${result.discountPercent}% off)`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!guestName.trim()) {
      setFormError(tr.errorNameRequired);
      return;
    }

    if (!guestContact.trim()) {
      setFormError(tr.errorContactRequired);
      return;
    }

    if (nights <= 0) {
      setFormError(tr.errorNightsRequired);
      return;
    }

    if (!acceptedTerms) {
      setFormError(tr.errorTermsRequired);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await appStore.createBooking({
        hostelId: hostel.id,
        roomTypeId: selectedRoom.id,
        guestName,
        contactType,
        guestContact,
        checkIn,
        checkOut,
        quantity,
        guestsCount,
        estimatedArrivalTime: arrivalTime,
        isLowerBunkRequested,
        specialRequests,
        couponCode: appliedCouponCode || undefined,
      });

      if (result.success && result.booking) {
        onNavigate('booking-track', { token: result.booking.privateToken });
      } else {
        setFormError(result.error || 'Error occurred while creating reservation');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while creating reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <PlaceActions kind="hostel" id={hostel.id} />
      <VerificationInfo verified={hostel.verification?.status === 'verified'} checkedAt={hostel.verification?.checkedAt} note={hostel.verification?.note} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="hover:text-amber-700 cursor-pointer"
        >
          {tr.breadcrumbHome}
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('hostels')}
          className="hover:text-amber-700 cursor-pointer"
        >
          {t.navHostels}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate">{getLocalized(hostel.name, currentLang)}</span>
      </nav>

      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
              {getCityName(hostel.city, currentLang)} • {hostel.district}
            </span>
            {hostel.immediateStayEnabled && (
              <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 fill-white" />
                <span>{t.immediateCheckInBadge}</span>
              </span>
            )}
            {hostel.reception24h && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-medium">
                {t.reception24hBadge}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900">
            {getLocalized(hostel.name, currentLang)}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{getLocalized(hostel.address, currentLang)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <div>
              <div className="text-sm font-extrabold text-slate-900">{avg} / 5</div>
              <div className="text-[10px] text-slate-500">{count} {t.reviewsCountText}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden bg-slate-100">
        <div className="md:col-span-2 aspect-16/10 overflow-hidden">
          <img
            src={hostel.photos[0]}
            alt={getLocalized(hostel.name, currentLang)}
            className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          {hostel.photos.slice(1, 3).map((photo, i) => (
            <div key={i} className="aspect-16/10 md:aspect-auto overflow-hidden">
              <img
                src={photo}
                alt={`${getLocalized(hostel.name, currentLang)} ${i + 2}`}
                className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content Columns: Left Details / Right Booking Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Details, Rooms, Overnight Advisor, Amenities */}
        <div className="lg:col-span-2 space-y-10">
          {/* Room & Bed Types */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">
              {tr.availableRoomsTitle}
            </h2>
            <div className="space-y-3">
              {hostel.roomTypes.map(rt => (
                <div
                  key={rt.id}
                  onClick={() => setSelectedRoomTypeId(rt.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedRoomTypeId === rt.id
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-amber-600" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {getLocalized(rt.name, currentLang)}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {rt.totalBedsOrRooms} beds
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {getLocalized(rt.description, currentLang)}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
                      {rt.hasCurtain && (
                        <span className="text-emerald-700 font-medium">✓ {tr.curtain}</span>
                      )}
                      {rt.hasBedsidePlug && (
                        <span className="text-emerald-700 font-medium">✓ {tr.bedsidePlug}</span>
                      )}
                      {rt.hasPersonalLocker && (
                        <span className="text-emerald-700 font-medium">
                          ✓ {tr.locker} {rt.requiresOwnLock ? tr.ownLock : tr.codeLock}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-lg font-black text-slate-900">
                      {rt.pricePerNightAMD.toLocaleString()}{' '}
                      <span className="text-xs text-amber-700">AMD ֏</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{tr.perNightPayOnArrival}</span>
                    <button
                      type="button"
                      className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedRoomTypeId === rt.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {selectedRoomTypeId === rt.id ? tr.selectedCheck : tr.selectThisType}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overnight & Midnight Arrival Advisor */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{tr.overnightTitle}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {tr.overnightDesc}
            </p>
            <div className="text-xs text-slate-600 flex flex-wrap gap-4 pt-1 font-medium">
              <span>{tr.standardCheckIn} {hostel.checkInStandardTime}</span>
              <span>{tr.standardCheckOut} {hostel.checkOutStandardTime}</span>
              <span>{tr.receptionHours} {hostel.reception24h ? tr.reception24hText : `${hostel.receptionOpenTime || '08:00'} - ${hostel.receptionCloseTime || '23:00'}`}</span>
            </div>
          </div>

          {/* Amenities & Facility Rules */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">
              {tr.amenitiesAndRules}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>{tr.wifiFree}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>{tr.lockersAmenity}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{tr.freeLuggage}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-600" />
                <span>{tr.sharedKitchen}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>
                  {hostel.amenities.elevator
                    ? tr.hasElevator
                    : `Stairs (${hostel.amenities.stairsCount || 20})`}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{tr.quietHoursLabel} {hostel.rules.quietHours}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
              <span className="font-bold text-slate-800 block">{tr.cancelAndPaymentLabel}</span>
              <p>{hostel.rules.cancellationPolicy}</p>
              <p>Accepted Payment Methods: {hostel.rules.acceptedPaymentMethodsOnArrival.join(', ')}</p>
            </div>
          </div>

          {/* Dedicated Hostel Location Map & Distances */}
          <HostelLocationMap hostel={hostel} currentLang={currentLang} />

          {/* Verified Reviews */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                {tr.verifiedReviews} ({reviews.length})
              </h2>
              <span className="text-xs text-slate-400">
                {tr.reviewAfterStayNotice}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                {tr.noReviewsYet}
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{rev.guestName}</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{rev.rating} / 5</span>
                      </div>
                    </div>
                    {rev.scores && <div className="grid grid-cols-2 gap-2 text-xs">{(['cleanliness','safety','staff','location'] as const).map(key => <span key={key}>{featureText(currentLang)[key]}: {rev.scores![key]} / 5</span>)}</div>}
                    <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                    {rev.adminReply && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-slate-700 mt-2">
                        <span className="font-bold text-amber-900 block mb-0.5">
                          YEREVANHUB Response:
                        </span>
                        {rev.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Direct Booking Drawer Box */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-400 font-semibold block">{tr.startingPriceLabel}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {selectedRoom.pricePerNightAMD.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-700">AMD ֏</span>
              </div>
              <span className="text-[11px] text-slate-500">{t.perBedPerNight}</span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr.checkInDate}
                  </label>
                  <input
                    type="date"
                    required
                    min={yerevanToday()} max={addCalendarDays(yerevanToday(),88)}
                    value={checkIn}
                    onChange={e => setCheckIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr.checkOutDate}
                  </label>
                  <input
                    type="date"
                    required
                    min={addCalendarDays(checkIn || yerevanToday(),1)} max={addCalendarDays(yerevanToday(),89)}
                    value={checkOut}
                    onChange={e => setCheckOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quantity & Guests */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr.bedQuantity}
                  </label>
                  <select
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr.guestsCount}
                  </label>
                  <select
                    value={guestsCount}
                    onChange={e => setGuestsCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated arrival time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {tr.approxArrival}
                </label>
                <select
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                >
                  <option value="14:00">{tr.arrival14}</option>
                  <option value="18:00">{tr.arrival18}</option>
                  <option value="22:00">{tr.arrival22}</option>
                  <option value="03:00">{tr.arrival03}</option>
                  <option value="07:00">{tr.arrival07}</option>
                </select>
              </div>

              {/* Minimal personal info: Name + Phone or Email */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="block text-xs font-bold text-slate-900">
                  {tr.guestInfoLabel}
                </span>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">{tr.fullName}</label>
                  <input
                    type="text"
                    required
                    placeholder="Ali / John"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-slate-600">
                    <label>{tr.phoneOrEmail}</label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setContactType('phone')}
                        className={`cursor-pointer ${contactType === 'phone' ? 'font-bold text-amber-700' : 'text-slate-400'}`}
                      >
                        {tr.phoneTab}
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setContactType('email')}
                        className={`cursor-pointer ${contactType === 'email' ? 'font-bold text-amber-700' : 'text-slate-400'}`}
                      >
                        {tr.emailTab}
                      </button>
                    </div>
                  </div>
                  <input
                    type={contactType === 'phone' ? 'tel' : 'email'}
                    required
                    placeholder={contactType === 'phone' ? '+374 91 ...' : 'name@example.com'}
                    value={guestContact}
                    onChange={e => setGuestContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 ltr-isolate text-left"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {tr.contactHint}
                  </span>
                </div>
              </div>

              {/* Preferred requests */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLowerBunkRequested}
                    onChange={e => setIsLowerBunkRequested(e.target.checked)}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <span>{tr.lowerBunk}</span>
                </label>

                <div>
                  <input
                    type="text"
                    placeholder={tr.specialRequests}
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              {/* Promo Coupon Drawer */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>{tr.haveCoupon}</span>
                  </span>
                  {appliedCouponCode && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-700 text-[10px] cursor-pointer"
                    >
                      {tr.removeCoupon}
                    </button>
                  )}
                </div>

                {!appliedCouponCode ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="WELCOME10"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      className="flex-1 uppercase bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                    >
                      {tr.apply}
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                    <span>{appliedCouponCode} active ({discountPercent}% off)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}

                {couponError && (
                  <span className="text-[11px] text-red-600 block">{couponError}</span>
                )}
              </div>

              {/* Cost Summary Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{tr.stayDuration}</span>
                  <span className="font-semibold text-slate-900">{nights} {currentLang === 'fa' ? 'شب' : currentLang === 'ru' ? 'ночей' : currentLang === 'hy' ? 'գիշեր' : 'nights'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{tr.basePrice}</span>
                  <span>{pricing.baseAmount.toLocaleString()} AMD</span>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>{tr.discount} ({pricing.discountPercent}%):</span>
                    <span>- {pricing.discountAmount.toLocaleString()} AMD</span>
                  </div>
                )}
                {pricing.extraFees > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>{tr.overnightFee}</span>
                    <span>+ {pricing.extraFees.toLocaleString()} AMD</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-950">
                  <span>{tr.finalPayOnArrival}</span>
                  <span className="text-amber-700">
                    {pricing.finalAmountToPayOnArrival.toLocaleString()} AMD ֏
                  </span>
                </div>
              </div>

              {/* Rules Acceptance Checkbox */}
              <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="rounded text-amber-600 mt-0.5 w-4 h-4"
                />
                <span>
                  {tr.termsCheckbox}
                </span>
              </label>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? tr.submittingBtn : tr.submitBtn}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {tr.trackingNotice}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
