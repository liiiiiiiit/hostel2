import { featureText } from '../i18n/features';
import { VerificationInfo } from '../components/VerificationInfo';
import { PlaceActions } from '../components/PlaceActions';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import React, { useEffect, useState } from 'react';
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
  const [couponBusy, setCouponBusy] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const capacityFor = (room: RoomType) => appStore.remainingCapacity(hostel, room.id, checkIn, checkOut);
  useEffect(() => {
    const selected = hostel.roomTypes.find(room => room.id === selectedRoomTypeId);
    if (!selected || capacityFor(selected) === 0) {
      const next = hostel.roomTypes.find(room => capacityFor(room) > 0);
      if (next) setSelectedRoomTypeId(next.id);
    }
  }, [hostel, checkIn, checkOut, selectedRoomTypeId]);

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

    if (couponBusy) return;
    setCouponBusy(true);
    const response = await appStore.checkCoupon(clean,
      (selectedRoom?.pricePerNightAMD ?? hostel.minPricePerNightAMD) * quantity * nights);
    setCouponBusy(false);
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

    if (!selectedRoom || quantity > capacityFor(selectedRoom)) {
      setFormError(featureText(currentLang).noCapacity); return;
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

  const ft = featureText(currentLang);
  const copy = {
    fa: { book: 'درخواست رزرو', selected: 'انتخاب‌شده', rooms: 'تخت و اتاق', requests: 'درخواست‌های بیشتر', coupon: 'کد تخفیف', review: 'نظر مسافران', payment: 'پرداخت در محل', policies: 'قوانین و شرایط لغو', checkTimes: 'ساعت‌های ورود و خروج', pending: 'رزرو پس از تأیید هاستل قطعی می‌شود.', terms: 'قوانین اقامت و لغو را می‌پذیرم.', nights: 'شب', guestInfo: 'اطلاعات مهمان', contact: 'اطلاعات تماس', optional: 'اختیاری', discount: 'تخفیف', extra: 'هزینهٔ ورود', total: 'مبلغ نهایی', roomUnavailable: 'برای این تاریخ موجود نیست', noRoom: 'در این اقامتگاه اتاقی برای رزرو ثبت نشده است.' },
    en: { book: 'Request booking', selected: 'Selected', rooms: 'Beds & rooms', requests: 'More requests', coupon: 'Promo code', review: 'Guest reviews', payment: 'Pay on arrival', policies: 'House rules & cancellation', checkTimes: 'Arrival & departure', pending: 'Your stay is reserved once the hostel confirms.', terms: 'I accept the stay and cancellation rules.', nights: 'nights', guestInfo: 'Guest details', contact: 'Contact details', optional: 'Optional', discount: 'Discount', extra: 'Arrival fees', total: 'Total to pay', roomUnavailable: 'Unavailable for these dates', noRoom: 'No room types are listed for this stay.' },
    ru: { book: 'Запросить бронь', selected: 'Выбрано', rooms: 'Места и номера', requests: 'Пожелания', coupon: 'Промокод', review: 'Отзывы гостей', payment: 'Оплата при заезде', policies: 'Правила и отмена', checkTimes: 'Заезд и выезд', pending: 'Бронь действует после подтверждения хостелом.', terms: 'Я принимаю правила проживания и отмены.', nights: 'ночей', guestInfo: 'Данные гостя', contact: 'Контакт', optional: 'Необязательно', discount: 'Скидка', extra: 'Сборы за заезд', total: 'К оплате', roomUnavailable: 'Нет мест на эти даты', noRoom: 'Для этого объекта номера не указаны.' },
    hy: { book: 'Ամրագրման հարցում', selected: 'Ընտրված է', rooms: 'Մահճակալներ և սենյակներ', requests: 'Ցանկություններ', coupon: 'Զեղչի կոդ', review: 'Հյուրերի կարծիքներ', payment: 'Վճարում տեղում', policies: 'Կանոններ և չեղարկում', checkTimes: 'Մուտք և ելք', pending: 'Ամրագրումը գործում է հոսթելի հաստատումից հետո։', terms: 'Ընդունում եմ կացության և չեղարկման կանոնները։', nights: 'գիշեր', guestInfo: 'Հյուրի տվյալներ', contact: 'Կոնտակտ', optional: 'Ըստ ցանկության', discount: 'Զեղչ', extra: 'Ժամանման վճարներ', total: 'Վճարման գումար', roomUnavailable: 'Այս օրերի համար հասանելի չէ', noRoom: 'Այս կացության համար սենյակներ նշված չեն։' },
  }[currentLang];
  const selectedCapacity = selectedRoom ? capacityFor(selectedRoom) : 0;
  const canBook = selectedRoom && pricing.isValidDates && quantity <= selectedCapacity && selectedCapacity > 0;
  const amenities = [
    hostel.amenities.wifi && tr.wifiFree, hostel.amenities.lockers && tr.lockersAmenity,
    hostel.freeLuggageStorage && tr.freeLuggage, hostel.amenities.kitchen && tr.sharedKitchen,
    hostel.amenities.elevator && tr.hasElevator,
  ].filter(Boolean);
  return (
    <div className="page-shell py-7 sm:py-10 space-y-7">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-slate-500"><button type="button" className="hover:text-emerald-800" onClick={() => onNavigate('home')}>{tr.breadcrumbHome}</button><span>/</span><button type="button" className="hover:text-emerald-800" onClick={() => onNavigate('hostels')}>{t.navHostels}</button></nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3"><p className="eyebrow">{getCityName(hostel.city, currentLang)} · {hostel.district}</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{getLocalized(hostel.name,currentLang)}</h1><p className="flex gap-2 items-start text-slate-500 text-sm"><MapPin size={17} className="shrink-0 mt-0.5"/>{getLocalized(hostel.address,currentLang)}</p></div>
        <div className="space-y-2"><PlaceActions kind="hostel" id={hostel.id}/>{count > 0 && <p className="flex gap-2 items-center text-sm"><Star size={16} className="fill-amber-500 text-amber-600"/><strong>{avg} / 5</strong><span className="text-slate-500">({count} {t.reviewsCountText})</span></p>}</div>
      </header>
      <div className={`grid gap-3 overflow-hidden rounded-3xl ${hostel.photos.length > 1 ? 'md:grid-cols-[1.65fr_1fr]' : ''}`}>
        <img src={hostel.photos[0]} alt={getLocalized(hostel.name,currentLang)} className="w-full aspect-[16/10] sm:aspect-[21/10] md:aspect-[16/10] object-cover bg-slate-100"/>
        {hostel.photos.length > 1 && <div className="hidden md:grid gap-3 grid-rows-2 min-h-0">{hostel.photos.slice(1,3).map((photo,index)=><img src={photo} alt={`${getLocalized(hostel.name,currentLang)} ${index+2}`} key={photo} className="w-full h-full min-h-0 object-cover bg-slate-100"/>)}</div>}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_390px] gap-7 xl:gap-10 items-start">
        <div className="space-y-7 min-w-0">
          <VerificationInfo verified={hostel.verification?.status==='verified'} checkedAt={hostel.verification?.checkedAt} note={hostel.verification?.note}/>
          <div className="surface p-5 sm:p-6 space-y-5">
            <h2 className="text-xl font-semibold">{copy.rooms}</h2>
            {hostel.roomTypes.length===0 && <p className="text-slate-500">{copy.noRoom}</p>}
            <div role="radiogroup" aria-label={copy.rooms} className="space-y-3">{hostel.roomTypes.map(room=>{
              const available=capacityFor(room),selected=selectedRoom?.id===room.id;
              return <label key={room.id} className={`block p-4 rounded-2xl border cursor-pointer transition-colors ${selected ? 'border-emerald-700 bg-emerald-50/40' : 'border-slate-200 hover:border-slate-300'} ${available===0 ? 'opacity-60' : ''}`}>
                <div className="flex gap-3 items-start"><input className="mt-1" type="radio" name="selected-room" value={room.id} checked={selected} disabled={available===0} onChange={()=>setSelectedRoomTypeId(room.id)}/><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-3 justify-between"><h3 className="font-semibold">{getLocalized(room.name,currentLang)}</h3><span className="font-semibold ltr-isolate">{room.pricePerNightAMD.toLocaleString()} <span className="text-xs text-slate-500 font-normal">AMD / {t.perNight}</span></span></div><p className="mt-1 text-sm text-slate-500 leading-relaxed">{getLocalized(room.description,currentLang)}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">{room.hasCurtain && <span>✓ {tr.curtain}</span>}{room.hasBedsidePlug && <span>✓ {tr.bedsidePlug}</span>}{room.hasPersonalLocker && <span>✓ {tr.locker}</span>}<span className={available>0 ? 'text-emerald-800' : 'text-red-700'}>{available>0 ? `${ft.available}: ${available}` : copy.roomUnavailable}</span></div></div></div>
              </label>;
            })}</div>
          </div>
          <section className="surface p-5 sm:p-6 space-y-4"><h2 className="text-xl font-semibold">{tr.amenitiesAndRules}</h2><div className="flex flex-wrap gap-2">{amenities.map(item=><span key={String(item)} className="px-3 py-2 rounded-xl bg-slate-50 text-sm text-slate-700">{item}</span>)}</div><details className="border-t border-slate-100 pt-4"><summary className="font-medium cursor-pointer">{copy.checkTimes}</summary><div className="pt-3 grid sm:grid-cols-3 gap-3 text-sm text-slate-600"><p>{tr.standardCheckIn} <strong className="ltr-isolate">{hostel.checkInStandardTime}</strong></p><p>{tr.standardCheckOut} <strong className="ltr-isolate">{hostel.checkOutStandardTime}</strong></p><p>{hostel.reception24h ? tr.reception24hText : [hostel.receptionOpenTime,hostel.receptionCloseTime].filter(Boolean).join(' – ')}</p></div></details><details className="border-t border-slate-100 pt-4"><summary className="font-medium cursor-pointer">{copy.policies}</summary><div className="pt-3 space-y-2 text-sm text-slate-600 leading-relaxed"><p>{hostel.rules.cancellationPolicy}</p><p>{tr.quietHoursLabel} {hostel.rules.quietHours}</p><p>{copy.payment}: {hostel.rules.acceptedPaymentMethodsOnArrival.join(' · ')}</p></div></details></section>
          <HostelLocationMap hostel={hostel} currentLang={currentLang}/>
          <section className="surface p-5 sm:p-6 space-y-5"><h2 className="text-xl font-semibold">{copy.review} <span className="font-normal text-slate-400">({reviews.length})</span></h2>{reviews.length===0 ? <p className="text-sm text-slate-500 py-4">{ft.noReviews}</p> : reviews.map(review=><article key={review.id} className="border-t border-slate-100 pt-5 space-y-3"><div className="flex items-center justify-between"><strong>{review.guestName}</strong><span className="inline-flex gap-1 items-center text-sm"><Star size={15} className="fill-amber-500 text-amber-600"/>{review.rating} / 5</span></div>{review.scores && <div className="flex flex-wrap gap-3 text-xs text-slate-500">{(['cleanliness','safety','staff','location'] as const).map(key=><span key={key}>{ft[key]} {review.scores![key]} / 5</span>)}</div>}<p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>{review.adminReply && <p className="text-sm p-3 rounded-xl bg-slate-50">{review.adminReply}</p>}</article>)}</section>
        </div>
        <aside className="surface p-5 sm:p-6 space-y-5 lg:sticky lg:top-24" id="stay-booking-form" aria-label={copy.book}>
          <div className="flex gap-4 items-start justify-between border-b border-slate-100 pb-5"><div><h2 className="text-xl font-semibold">{copy.book}</h2><p className="text-sm text-slate-500 mt-1">{copy.payment}</p></div><div className="text-end"><strong className="block text-xl ltr-isolate">{(selectedRoom?.pricePerNightAMD ?? hostel.minPricePerNightAMD).toLocaleString()} <span className="text-xs font-normal">AMD</span></strong><span className="text-xs text-slate-500">{t.perNight}</span></div></div>
          {formError && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-800 text-sm">{formError}</p>}
          <form onSubmit={handleSubmitBooking} className="space-y-4" aria-busy={isSubmitting}>
            <div className="grid grid-cols-2 gap-3"><label htmlFor="booking-in" className="text-sm font-medium">{ft.checkIn}<input id="booking-in" className="field mt-2" type="date" required min={yerevanToday()} max={addCalendarDays(yerevanToday(),88)} value={checkIn} onChange={event=>{setCheckIn(event.target.value);if(event.target.value&&event.target.value>=checkOut)setCheckOut(addCalendarDays(event.target.value,1));}}/></label><label htmlFor="booking-out" className="text-sm font-medium">{ft.checkOut}<input id="booking-out" className="field mt-2" type="date" required min={addCalendarDays(checkIn||yerevanToday(),1)} max={addCalendarDays(yerevanToday(),89)} value={checkOut} onChange={event=>setCheckOut(event.target.value)}/></label></div>
            <div className="grid grid-cols-2 gap-3"><label htmlFor="booking-quantity" className="text-sm font-medium">{tr.bedQuantity}<select id="booking-quantity" className="field mt-2" value={quantity} onChange={event=>setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} disabled={n>selectedCapacity}>{n}</option>)}</select></label><label htmlFor="booking-guests" className="text-sm font-medium">{tr.guestsCount}<select id="booking-guests" className="field mt-2" value={guestsCount} onChange={event=>setGuestsCount(Number(event.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label></div>
            {!canBook && <p role="status" className="text-sm text-amber-900">{ft.noCapacity}</p>}
            <label htmlFor="booking-arrival" className="block text-sm font-medium">{tr.approxArrival}<select id="booking-arrival" className="field mt-2" value={arrivalTime} onChange={event=>setArrivalTime(event.target.value)}><option value="14:00">{tr.arrival14}</option><option value="18:00">{tr.arrival18}</option><option value="22:00">{tr.arrival22}</option><option value="03:00">{tr.arrival03}</option><option value="07:00">{tr.arrival07}</option></select></label>
            {arrivalAnalysis.isEarlyMorning && <details className="rounded-xl p-3 bg-amber-50 text-sm text-amber-950"><summary className="cursor-pointer font-medium">{tr.overnightTitle}</summary><p className="pt-2 leading-relaxed">{tr.overnightDesc}</p></details>}
            <div className="border-t border-slate-100 pt-4 space-y-3"><h3 className="font-medium text-sm">{copy.guestInfo}</h3><label htmlFor="booking-name" className="block text-sm">{tr.fullName}<input id="booking-name" autoComplete="name" className="field mt-2" required placeholder="Ali / John" value={guestName} onChange={event=>setGuestName(event.target.value)}/></label><div className="flex justify-between gap-2 text-sm"><label htmlFor="booking-contact">{copy.contact}</label><div className="flex gap-3"><button type="button" aria-pressed={contactType==='phone'} className={contactType==='phone'?'text-emerald-800 font-semibold':'text-slate-400'} onClick={()=>setContactType('phone')}>{tr.phoneTab}</button><button type="button" aria-pressed={contactType==='email'} className={contactType==='email'?'text-emerald-800 font-semibold':'text-slate-400'} onClick={()=>setContactType('email')}>{tr.emailTab}</button></div></div><input id="booking-contact" className="field ltr-isolate" autoComplete={contactType==='phone'?'tel':'email'} required type={contactType==='phone'?'tel':'email'} placeholder={contactType==='phone'?'+374 91 ...':'name@example.com'} value={guestContact} onChange={event=>setGuestContact(event.target.value)}/></div>
            <details className="border-t border-slate-100 pt-4"><summary className="text-sm cursor-pointer font-medium">{copy.requests} <span className="text-slate-400 font-normal">· {copy.optional}</span></summary><div className="pt-4 space-y-3"><label className="flex gap-2 text-sm"><input type="checkbox" checked={isLowerBunkRequested} onChange={event=>setIsLowerBunkRequested(event.target.checked)}/>{tr.lowerBunk}</label><label className="block text-sm" htmlFor="booking-note">{tr.specialRequests}<textarea id="booking-note" className="field mt-2" rows={2} value={specialRequests} onChange={event=>setSpecialRequests(event.target.value)}/></label></div></details>
            <details className="border-t border-slate-100 pt-4"><summary className="text-sm cursor-pointer font-medium">{copy.coupon}</summary><div className="pt-3 space-y-2">{!appliedCouponCode ? <div className="flex gap-2"><label htmlFor="booking-coupon" className="sr-only">{copy.coupon}</label><input id="booking-coupon" className="field min-w-0 uppercase" placeholder="WELCOME10" value={couponInput} onChange={event=>setCouponInput(event.target.value)}/><button type="button" disabled={couponBusy} onClick={handleApplyCoupon} className="button-secondary">{couponBusy?'…':tr.apply}</button></div> : <div className="flex justify-between gap-3 text-sm text-emerald-800"><span>{appliedCouponCode} · {discountPercent}%</span><button type="button" className="underline" onClick={handleRemoveCoupon}>{tr.removeCoupon}</button></div>}{couponError && <p role="alert" className="text-xs text-red-700">{couponError}</p>}{appliedCouponCode && !couponValidation.valid && <p role="alert" className="text-xs text-red-700">{couponValidation.message}</p>}</div></details>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm"><div className="flex justify-between text-slate-500"><span>{nights} {copy.nights} × {quantity}</span><span className="ltr-isolate">{pricing.baseAmount.toLocaleString()} AMD</span></div>{pricing.discountAmount>0&&<div className="flex justify-between text-emerald-800"><span>{copy.discount}</span><span className="ltr-isolate">−{pricing.discountAmount.toLocaleString()} AMD</span></div>}{pricing.extraFees>0&&<div className="flex justify-between text-slate-600"><span>{copy.extra}</span><span className="ltr-isolate">{pricing.extraFees.toLocaleString()} AMD</span></div>}<div className="flex justify-between gap-3 font-semibold text-base border-t border-slate-200 pt-3"><span>{copy.total}</span><span className="ltr-isolate">{pricing.finalAmountToPayOnArrival.toLocaleString()} AMD</span></div></div>
            <label className="flex gap-2 items-start text-sm text-slate-600"><input className="mt-1" type="checkbox" required checked={acceptedTerms} onChange={event=>setAcceptedTerms(event.target.checked)}/>{copy.terms}</label>
            <button type="submit" disabled={isSubmitting || !canBook || Boolean(appliedCouponCode&&!couponValidation.valid) || Boolean(appStore.getState().previewMode)} className="button-primary w-full">{isSubmitting ? ft.processing : copy.book}<ArrowIcon size={17}/></button>
            <p className="text-xs text-slate-500 leading-relaxed text-center">{copy.pending}</p>
          </form>
        </aside>
      </div>
    </div>
  );
};
