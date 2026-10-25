import { yerevanToday } from '../utils/dates';
import React, { useState } from 'react';
import { AppLanguage, RentalProperty } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import {
  Home,
  ShieldCheck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  ArrowRight,
  ArrowLeft,
  Zap,
  Droplet,
  Flame,
  Wifi,
  Building,
} from 'lucide-react';
import { appStore } from '../services/store';
import { getLocalized, getCityName } from '../utils/i18n';

interface Props {
  currentLang: AppLanguage;
  rental: RentalProperty;
  onNavigate: (view: string, params?: any) => void;
}

const RENTAL_DETAIL_TEXTS = {
  fa: {
    breadcrumbHome: 'صفحه اصلی',
    keySpecsTitle: 'مشخصات کلیدی ملک',
    areaLabel: 'متراژ زیربنا',
    sqmUnit: 'متر مربع',
    bedroomLabel: 'اتاق خواب',
    bedroomUnit: 'خوابه',
    floorLabel: 'طبقه و آسانسور',
    floorPrefix: 'طبقه',
    withElevator: '(آسانسور دارد)',
    noElevator: '(بدون آسانسور)',
    residentsLabel: 'حداکثر ساکنین',
    residentsUnit: 'نفر',
    depositTitle: 'ودیعه تضمینی و شرایط استرداد (Deposit Terms)',
    depositAmountLabel: 'مبلغ ودیعه:',
    depositDesc: 'ودیعه جدا از اجاره نگهداری می‌شود و در پایان دوره قرارداد پس از تسویه قبض‌ها مستقیماً به مستاجر بازگردانده خواهد شد.',
    utilitiesTitle: 'وضعیت هزینه‌های ماهانه و قبوض (کومونال)',
    elecLabel: 'برق:',
    gasLabel: 'گاز و گرمایش:',
    waterLabel: 'آب مصرفی:',
    wifiLabel: 'اینترنت وای‌فای:',
    elecIncluded: 'رایگان (روی اجاره)',
    elecMeter: 'طبق کنتور و مصرف مستاجر',
    gasIncluded: 'رایگان',
    gasMeter: 'بر اساس کنتور اختصاصی گاز',
    waterIncluded: 'شامل اجاره',
    waterMeter: 'به عهده مستاجر (معمولاً اندک)',
    wifiIncluded: 'اینترنت فعال و رایگان',
    wifiMeter: 'اشتراک با مستاجر',
    inspectionTitle: 'توضیحات بازرسی YEREVANHUB:',
    inspectionNote: 'آدرس دقیق و مشخصات تماس مالک پس از ارسال درخواست هماهنگی و بررسی اولیه توسط مدیریت با شما به اشتراک گذاشته خواهد شد.',
    rateLabel: 'نرخ اجاره:',
    rateMonthly: 'AMD ֏ ماهانه',
    rateNightly: 'AMD ֏ هر شب',
    requestTypeLabel: 'نوع درخواست شما:',
    typeVisitBtn: 'هماهنگی بازدید',
    typeRentBtn: 'درخواست اجاره',
    nameLabel: 'نام و نام خانوادگی *',
    contactLabel: 'شماره تماس یا ایمیل *',
    visitDateLabel: 'زمان پیشنهادی جهت بازدید حضوری',
    startDateLabel: 'تاریخ شروع',
    durationLabel: 'مدت مورد نظر',
    residentsCountLabel: 'تعداد ساکنین',
    notesLabel: 'توضیحات تکمیلی (اختیاری)',
    notesPlaceholder: 'حیوان خانگی، نیاز به پارکینگ یا شرایط ویژه...',
    submitBtn: 'ارسال درخواست (دریافت پیوند پیگیری)',
    submittingBtn: 'در حال ارسال...',
    disclaimer: 'ثبت درخواست اولیه تعهدی ایجاد نمی‌کند. تیم پشتیبانی جهت هماهنگی با مالک با شما تماس خواهد گرفت.',
    errName: 'نام و نام خانوادگی الزامی است.',
    errContact: 'شماره تماس یا ایمیل معتبر الزامی است.',
  },
  en: {
    breadcrumbHome: 'Home',
    keySpecsTitle: 'Key Property Specifications',
    areaLabel: 'Total Area',
    sqmUnit: 'sq meters',
    bedroomLabel: 'Bedrooms',
    bedroomUnit: 'bed(s)',
    floorLabel: 'Floor & Elevator',
    floorPrefix: 'Floor',
    withElevator: '(with elevator)',
    noElevator: '(no elevator)',
    residentsLabel: 'Max Residents',
    residentsUnit: 'resident(s)',
    depositTitle: 'Security Deposit & Refund Terms',
    depositAmountLabel: 'Deposit Amount:',
    depositDesc: 'Security deposit is held separately from rent and refunded in full at lease conclusion after final utility settlement.',
    utilitiesTitle: 'Monthly Utilities Breakdown (Communal)',
    elecLabel: 'Electricity:',
    gasLabel: 'Gas & Heating:',
    waterLabel: 'Water:',
    wifiLabel: 'High-speed Wi-Fi:',
    elecIncluded: 'Included in rent',
    elecMeter: 'Meter-based (paid by tenant)',
    gasIncluded: 'Included in rent',
    gasMeter: 'Individual gas meter',
    waterIncluded: 'Included in rent',
    waterMeter: 'Tenant responsibility (nominal)',
    wifiIncluded: 'Active & free Wi-Fi included',
    wifiMeter: 'Tenant responsibility',
    inspectionTitle: 'YEREVANHUB Field Verification:',
    inspectionNote: 'Exact building address and owner contact details are provided upon initial review and inquiry confirmation.',
    rateLabel: 'Rental Rate:',
    rateMonthly: 'AMD ֏ per month',
    rateNightly: 'AMD ֏ per night',
    requestTypeLabel: 'Inquiry Purpose:',
    typeVisitBtn: 'Schedule Visit',
    typeRentBtn: 'Apply to Rent',
    nameLabel: 'Full Name *',
    contactLabel: 'Phone or Email *',
    visitDateLabel: 'Preferred viewing date & time',
    startDateLabel: 'Move-in Date',
    durationLabel: 'Desired Lease Term',
    residentsCountLabel: 'Number of Residents',
    notesLabel: 'Additional Notes (optional)',
    notesPlaceholder: 'Pets, parking requirements, or special terms...',
    submitBtn: 'Submit Inquiry (Get Private Link)',
    submittingBtn: 'Submitting...',
    disclaimer: 'Submitting creates no financial obligation. Our local coordinator will contact you to confirm viewing details.',
    errName: 'Full name is required.',
    errContact: 'Valid phone number or email is required.',
  },
  ru: {
    breadcrumbHome: 'Главная',
    keySpecsTitle: 'Характеристики объекта',
    areaLabel: 'Площадь',
    sqmUnit: 'м²',
    bedroomLabel: 'Спальни',
    bedroomUnit: 'комн.',
    floorLabel: 'Этаж и лифт',
    floorPrefix: 'Этаж',
    withElevator: '(есть лифт)',
    noElevator: '(без лифта)',
    residentsLabel: 'Макс. жителей',
    residentsUnit: 'чел.',
    depositTitle: 'Условия гарантийного депозита (Залог)',
    depositAmountLabel: 'Сумма залога:',
    depositDesc: 'Залог хранится отдельно от арендной платы и возвращается арендатору при выезде после финальной сверки коммунальных счетов.',
    utilitiesTitle: 'Коммунальные платежи (Комунал)',
    elecLabel: 'Электричество:',
    gasLabel: 'Газ и отопление:',
    waterLabel: 'Вода:',
    wifiLabel: 'Интернет Wi-Fi:',
    elecIncluded: 'Включено в аренду',
    elecMeter: 'По счетчику (оплачивает жилец)',
    gasIncluded: 'Включено в аренду',
    gasMeter: 'По индивидуальному газовому счетчику',
    waterIncluded: 'Включено в аренду',
    waterMeter: 'По счетчику (обычно минимально)',
    wifiIncluded: 'Интернет подключен и бесплатен',
    wifiMeter: 'Подключение за счет жильца',
    inspectionTitle: 'Результаты проверки YEREVANHUB:',
    inspectionNote: 'Точный адрес объекта и контакты владельца предоставляются после подачи заявки на просмотр.',
    rateLabel: 'Стоимость аренды:',
    rateMonthly: 'AMD ֏ в месяц',
    rateNightly: 'AMD ֏ за ночь',
    requestTypeLabel: 'Тип обращения:',
    typeVisitBtn: 'Осмотр квартиры',
    typeRentBtn: 'Заявка на аренду',
    nameLabel: 'Имя и фамилия *',
    contactLabel: 'Телефон или Email *',
    visitDateLabel: 'Желаемая дата и время осмотра',
    startDateLabel: 'Дата заселения',
    durationLabel: 'Срок аренды',
    residentsCountLabel: 'Количество проживающих',
    notesLabel: 'Дополнительные пожелания (необязательно)',
    notesPlaceholder: 'Домашние питомцы, парковка, особые условия...',
    submitBtn: 'Отправить заявку (получить ссылку)',
    submittingBtn: 'Отправка...',
    disclaimer: 'Подача заявки ни к чему не обязывает. Координатор свяжется с вами для согласования визита.',
    errName: 'Укажите имя и фамилию.',
    errContact: 'Укажите телефон или email.',
  },
  hy: {
    breadcrumbHome: 'Գլխավոր',
    keySpecsTitle: 'Գույքի հիմնական բնութագիրը',
    areaLabel: 'Մակերես',
    sqmUnit: 'քմ',
    bedroomLabel: 'Ննջասենյակներ',
    bedroomUnit: 'սենյականոց',
    floorLabel: 'Հարկ և վերելակ',
    floorPrefix: 'Հարկ',
    withElevator: '(առկա է վերելակ)',
    noElevator: '(առանց վերելակի)',
    residentsLabel: 'Առավելագույն բնակիչներ',
    residentsUnit: 'անձ',
    depositTitle: 'Երաշխիքային կանխավճարի պայմաններ (Դեպոզիտ)',
    depositAmountLabel: 'Դեպոզիտի գումարը՝',
    depositDesc: 'Դեպոզիտը պահվում է առանձին և ամբողջությամբ վերադարձվում է վարձակալության ավարտին՝ կոմունալ վճարումները կարգավորելուց հետո:',
    utilitiesTitle: 'Ամսական կոմունալ ծախսեր',
    elecLabel: 'Էլեկտրաէներգիա՝',
    gasLabel: 'Գազ և ջեռուցում՝',
    waterLabel: 'Ջուր՝',
    wifiLabel: 'Wi-Fi ինտերնետ՝',
    elecIncluded: 'Ներառված է վարձավճարում',
    elecMeter: 'Ըստ հաշվիչի (վճարում է վարձակալը)',
    gasIncluded: 'Ներառված է վարձավճարում',
    gasMeter: 'Ըստ գազի առանձին հաշվիչի',
    waterIncluded: 'Ներառված է վարձավճարում',
    waterMeter: 'Ըստ հաշվիչի (չնչին գումար)',
    wifiIncluded: 'Ակտիվ և անվճար Wi-Fi',
    wifiMeter: 'Վարձակալի հաշվին',
    inspectionTitle: 'YEREVANHUB ստուգման արդյունքներ՝',
    inspectionNote: 'Շենքի ճշգրիտ հասցեն և տիրոջ կոնտակտները կտրամադրվեն նախնական հաստատումից հետո:',
    rateLabel: 'Վարձավճար՝',
    rateMonthly: 'AMD ֏ ամսական',
    rateNightly: 'AMD ֏ օրական',
    requestTypeLabel: 'Հարցման նպատակ՝',
    typeVisitBtn: 'Տեղում դիտում',
    typeRentBtn: 'Վարձակալության հայտ',
    nameLabel: 'Անուն և ազգանուն *',
    contactLabel: 'Հեռախոս կամ էլ. հասցե *',
    visitDateLabel: 'Դիտման նախընտրելի օր և ժամ',
    startDateLabel: 'Մուտքի ամսաթիվ',
    durationLabel: 'Վարձակալության ժամկետ',
    residentsCountLabel: 'Բնակիչների քանակ',
    notesLabel: 'Լրացուցիչ նշումներ (ըստ ցանկության)',
    notesPlaceholder: 'Ընտանի կենդանիներ, ավտոկայանատեղի կամ այլ...',
    submitBtn: 'Ուղարկել հայտը (ստանալ հետևման հղում)',
    submittingBtn: 'Ուղարկվում է...',
    disclaimer: 'Հայտի ուղարկումը ֆինանսական պարտավորություն չի առաջացնում: Մեր համակարգողը կկապվի Ձեզ հետ:',
    errName: 'Անուն և ազգանունը պարտադիր է:',
    errContact: 'Կոնտակտային տվյալը պարտադիր է:',
  },
};

export const RentalDetailView: React.FC<Props> = ({
  currentLang,
  rental,
  onNavigate,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const tr = RENTAL_DETAIL_TEXTS[currentLang] || RENTAL_DETAIL_TEXTS.fa;
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  // Inquiry form state
  const [requestType, setRequestType] = useState<'visit' | 'rent'>('visit');
  const [guestName, setGuestName] = useState('');
  const [contact, setContact] = useState('');
  const [proposedVisitDate, setProposedVisitDate] = useState(() => `${yerevanToday()} 17:00`);
  const [desiredStartDate, setDesiredStartDate] = useState(yerevanToday);
  const [desiredDurationText, setDesiredDurationText] = useState('6 months');
  const [residentsCount, setResidentsCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!guestName.trim()) {
      setFormError(tr.errName);
      return;
    }
    if (!contact.trim()) {
      setFormError(tr.errContact);
      return;
    }

    setIsSubmitting(true);
    const result = appStore.createRentalInquiry({
      propertyId: rental.id,
      guestName,
      contact,
      requestType,
      desiredStartDate: requestType === 'rent' ? desiredStartDate : undefined,
      desiredDurationText: requestType === 'rent' ? desiredDurationText : undefined,
      proposedVisitDate: requestType === 'visit' ? proposedVisitDate : undefined,
      residentsCount,
      notes,
    });
    setIsSubmitting(false);

    if (result.success && result.inquiry) {
      onNavigate('rental-track', { token: result.inquiry.privateToken });
    } else {
      setFormError(result.error || 'Failed to submit inquiry.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="hover:text-blue-700 cursor-pointer"
        >
          {tr.breadcrumbHome}
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('rentals')}
          className="hover:text-blue-700 cursor-pointer"
        >
          {t.navRentals}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate">
          {getLocalized(rental.title, currentLang)}
        </span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs font-bold">
            {getCityName(rental.city, currentLang)} • {rental.neighborhood}
          </span>
          {rental.verifiedBadge && (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.verifiedBadge}</span>
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900">
          {getLocalized(rental.title, currentLang)}
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{rental.addressPublic || `${rental.city}, ${rental.neighborhood}`}</span>
        </p>
      </div>

      {/* Photo Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden bg-slate-100">
        <div className="md:col-span-2 aspect-16/10 overflow-hidden">
          <img
            src={rental.photos[0]}
            alt={getLocalized(rental.title, currentLang)}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          {rental.photos.slice(1, 3).map((photo, i) => (
            <div key={i} className="aspect-16/10 md:aspect-auto overflow-hidden">
              <img
                src={photo}
                alt={`${getLocalized(rental.title, currentLang)} ${i + 2}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Details / Right Inquiry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Property specs */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{tr.keySpecsTitle}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">{tr.areaLabel}</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.areaSqm} {tr.sqmUnit}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">{tr.bedroomLabel}</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.bedroomsCount} {tr.bedroomUnit}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">{tr.floorLabel}</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {tr.floorPrefix} {rental.floor} {rental.hasElevator ? tr.withElevator : tr.noElevator}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">{tr.residentsLabel}</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.maxResidents} {tr.residentsUnit}</span>
              </div>
            </div>
          </div>

          {/* Refundable Security Deposit terms (شرایط ودیعه) */}
          <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>{tr.depositTitle}</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-800 space-y-2 leading-relaxed">
              <p>
                <strong>{tr.depositAmountLabel}</strong> {rental.refundableDepositAMD.toLocaleString()} AMD ֏.
              </p>
              <p>{rental.depositTerms}</p>
              <p className="text-slate-600 text-xs">
                {tr.depositDesc}
              </p>
            </div>
          </div>

          {/* Utilities status breakdown (آب، برق، گاز، اینترنت، شارژ ساختمان) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{tr.utilitiesTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>{tr.elecLabel}</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.electricity === 'included' ? tr.elecIncluded : tr.elecMeter}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>{tr.gasLabel}</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.gas === 'included' ? tr.gasIncluded : tr.gasMeter}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Droplet className="w-4 h-4 text-blue-500" />
                  <span>{tr.waterLabel}</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.water === 'included' ? tr.waterIncluded : tr.waterMeter}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Wifi className="w-4 h-4 text-emerald-500" />
                  <span>{tr.wifiLabel}</span>
                </span>
                <span className="font-bold text-emerald-700">
                  {rental.utilitiesBreakdown.internet === 'included' ? tr.wifiIncluded : tr.wifiMeter}
                </span>
              </div>
            </div>
          </div>

          {/* Inspection Verification Badge Details */}
          <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <span className="font-bold block flex items-center gap-1.5 text-sm text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{tr.inspectionTitle}</span>
            </span>
            <p>{rental.verifiedExplanation}</p>
            <p className="text-slate-600 text-[11px] pt-1">
              {tr.inspectionNote}
            </p>
          </div>
        </div>

        {/* Right Column: Inquiry & Visit Request Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-400 font-semibold block">{tr.rateLabel}</span>
              <div className="text-2xl font-black text-slate-900">
                {rental.pricePerMonthAMD ? (
                  <span>
                    {rental.pricePerMonthAMD.toLocaleString()}{' '}
                    <span className="text-xs font-bold text-blue-700">{tr.rateMonthly}</span>
                  </span>
                ) : (
                  <span>
                    {rental.pricePerNightAMD?.toLocaleString()}{' '}
                    <span className="text-xs font-bold text-blue-700">{tr.rateNightly}</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                {rental.commissionAmountText}
              </span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr.requestTypeLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('visit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      requestType === 'visit'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{tr.typeVisitBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('rent')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      requestType === 'rent'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{tr.typeRentBtn}</span>
                  </button>
                </div>
              </div>

              {/* Applicant Name & Contact */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">{tr.nameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder="Ali / John"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">{tr.contactLabel}</label>
                <input
                  type="text"
                  required
                  placeholder="+374 91 ... / email@domain.com"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 ltr-isolate text-left"
                />
              </div>

              {requestType === 'visit' ? (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">{tr.visitDateLabel}</label>
                  <input
                    type="text"
                    value={proposedVisitDate}
                    onChange={e => setProposedVisitDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">{tr.startDateLabel}</label>
                    <input
                      type="date"
                      value={desiredStartDate}
                      onChange={e => setDesiredStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">{tr.durationLabel}</label>
                    <input
                      type="text"
                      placeholder="6 months"
                      value={desiredDurationText}
                      onChange={e => setDesiredDurationText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-600 mb-1">{tr.residentsCountLabel}</label>
                <select
                  value={residentsCount}
                  onChange={e => setResidentsCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4+</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">{tr.notesLabel}</label>
                <textarea
                  rows={2}
                  placeholder={tr.notesPlaceholder}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? tr.submittingBtn : tr.submitBtn}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {tr.disclaimer}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
