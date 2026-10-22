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

export const RentalDetailView: React.FC<Props> = ({
  currentLang,
  rental,
  onNavigate,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  // Inquiry form state
  const [requestType, setRequestType] = useState<'visit' | 'rent'>('visit');
  const [guestName, setGuestName] = useState('');
  const [contact, setContact] = useState('');
  const [proposedVisitDate, setProposedVisitDate] = useState('2026-10-24 ساعت ۱۷:۰۰');
  const [desiredStartDate, setDesiredStartDate] = useState('2026-11-01');
  const [desiredDurationText, setDesiredDurationText] = useState('۶ ماه');
  const [residentsCount, setResidentsCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!guestName.trim()) {
      setFormError('نام و نام خانوادگی الزامی است.');
      return;
    }
    if (!contact.trim()) {
      setFormError('شماره تماس یا ایمیل معتبر الزامی است.');
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
      setFormError(result.error || 'خطایی در ارسال درخواست رخ داد.');
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
          صفحه اصلی
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
        <span className="text-slate-900 font-semibold truncate">{getLocalized(rental.title, currentLang)}</span>
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
          <span className="text-xs text-slate-400">
            {rental.lastCheckedAt.split('T')[0]}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900">
          {getLocalized(rental.title, currentLang)}
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{rental.approximateLocationLabel}</span>
        </p>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-3xl overflow-hidden bg-slate-100">
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
            <h2 className="text-lg font-bold text-slate-900">مشخصات کلیدی ملک</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">متراژ زیربنا</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.areaSqm} متر مربع</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">اتاق خواب</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.bedroomsCount} خوابه</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">طبقه و آسانسور</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  طبقه {rental.floor} {rental.hasElevator ? '(آسانسور دارد)' : '(بدون آسانسور)'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50">
                <span className="text-slate-400 block mb-1">حداکثر ساکنین</span>
                <span className="font-extrabold text-slate-900 text-sm">{rental.maxResidents} نفر</span>
              </div>
            </div>
          </div>

          {/* Refundable Security Deposit terms (شرایط ودیعه) */}
          <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>ودیعه تضمینی و شرایط استرداد (Deposit Terms)</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-800 space-y-2 leading-relaxed">
              <p>
                <strong>مبلغ ودیعه:</strong> {rental.refundableDepositAMD.toLocaleString()} درام ارمنستان.
              </p>
              <p>{rental.depositTerms}</p>
              <p className="text-slate-600 text-xs">
                ودیعه جدا از اجاره نگهداری می‌شود و در پایان دوره قرارداد پس از تسویه قبض‌ها مستقیماً به مستاجر بازگردانده خواهد شد.
              </p>
            </div>
          </div>

          {/* Utilities status breakdown (آب، برق، گاز، اینترنت، شارژ ساختمان) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">وضعیت هزینه‌های ماهانه و قبوض (کومونال)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>برق:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.electricity === 'included' ? 'رایگان (روی اجاره)' : 'طبق کنتور و مصرف مستاجر'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>گاز و گرمایش:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.gas === 'included' ? 'رایگان' : 'بر اساس کنتور اختصاصی گاز'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Droplet className="w-4 h-4 text-blue-500" />
                  <span>آب مصرفی:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {rental.utilitiesBreakdown.water === 'included' ? 'شامل اجاره' : 'به عهده مستاجر (معمولاً اندک)'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <Wifi className="w-4 h-4 text-emerald-500" />
                  <span>اینترنت وای‌فای:</span>
                </span>
                <span className="font-bold text-emerald-700">
                  {rental.utilitiesBreakdown.internet === 'included' ? 'اینترنت فعال و رایگان' : 'اشتراک با مستاجر'}
                </span>
              </div>
            </div>
          </div>

          {/* Inspection Verification Badge Details */}
          <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <span className="font-bold block flex items-center gap-1.5 text-sm text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>توضیحات بازرسی YEREVANHUB:</span>
            </span>
            <p>{rental.verifiedExplanation}</p>
            <p className="text-slate-600 text-[11px] pt-1">
              آدرس دقیق و مشخصات تماس مالک پس از ارسال درخواست هماهنگی و بررسی اولیه توسط مدیریت با شما به اشتراک گذاشته خواهد شد.
            </p>
          </div>
        </div>

        {/* Right Column: Inquiry & Visit Request Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-400 font-semibold block">نرخ اجاره:</span>
              <div className="text-2xl font-black text-slate-900">
                {rental.pricePerMonthAMD ? (
                  <span>
                    {rental.pricePerMonthAMD.toLocaleString()}{' '}
                    <span className="text-xs font-bold text-blue-700">AMD ֏ ماهانه</span>
                  </span>
                ) : (
                  <span>
                    {rental.pricePerNightAMD?.toLocaleString()}{' '}
                    <span className="text-xs font-bold text-blue-700">AMD ֏ هر شب</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع درخواست شما:</label>
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
                    <span>هماهنگی بازدید</span>
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
                    <span>درخواست اجاره</span>
                  </button>
                </div>
              </div>

              {/* Applicant Name & Contact */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کامران بهرامی"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">شماره تماس یا ایمیل *</label>
                <input
                  type="text"
                  required
                  placeholder="+98 912 ... یا +374 91 ..."
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 ltr-isolate text-left"
                />
              </div>

              {requestType === 'visit' ? (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">زمان پیشنهادی جهت بازدید حضوری</label>
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
                    <label className="block text-xs text-slate-600 mb-1">تاریخ شروع</label>
                    <input
                      type="date"
                      value={desiredStartDate}
                      onChange={e => setDesiredStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">مدت مورد نظر</label>
                    <input
                      type="text"
                      placeholder="مثلاً ۶ ماه"
                      value={desiredDurationText}
                      onChange={e => setDesiredDurationText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-600 mb-1">تعداد ساکنین</label>
                <select
                  value={residentsCount}
                  onChange={e => setResidentsCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                >
                  <option value={1}>۱ نفر</option>
                  <option value={2}>۲ نفر</option>
                  <option value={3}>۳ نفر</option>
                  <option value={4}>۴ نفر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">توضیحات تکمیلی (اختیاری)</label>
                <textarea
                  rows={2}
                  placeholder="حیوان خانگی، نیاز به پارکینگ یا شرایط ویژه..."
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
                <span>{isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست (دریافت پیوند پیگیری)'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                ثبت درخواست اولیه تعهدی ایجاد نمی‌کند. تیم پشتیبانی جهت هماهنگی با مالک با شما تماس خواهد گرفت.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
