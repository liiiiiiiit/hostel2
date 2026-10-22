import React, { useState } from 'react';
import { AppLanguage, Booking, Hostel } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized } from '../utils/i18n';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Phone,
  Send,
  Star,
  MapPin,
  Key,
  Shield,
  ArrowRight,
  ArrowLeft,
  Navigation,
} from 'lucide-react';
import { appStore } from '../services/store';

interface Props {
  currentLang: AppLanguage;
  booking: Booking;
  hostel?: Hostel;
  onNavigate: (view: string, params?: any) => void;
}

const TRACKING_TEXTS = {
  fa: {
    trackingCodeLabel: 'کد پیگیری اختصاصی:',
    bookedFor: 'ثبت‌شده برای:',
    confirmedBadge: 'رزرو شما تأیید شد (تخت آماده پذیرش است)',
    pendingBadge: 'در انتظار بررسی و تأیید هاستلدار',
    rejectedBadge: 'درخواست به دلیل تکمیل ظرفیت یا عدم امکان پذیرش رد شد',
    cancelledBadge: 'این رزرو لغو گردیده است',
    completedBadge: 'اقامت شما در هاستل با موفقیت تکمیل شد',
    pendingNoticeTitle: 'درخواست شما برای هاستل ارسال شده است.',
    pendingNoticeDesc: 'این صفحه به صورت خودکار وضعیت را به شما نشان می‌دهد. لطفاً تا قبل از سبز شدن وضعیت «تأییدشده» به محل مراجعه نکنید. در صورت عدم پاسخگویی تا پایان مهلت، رزرو لغو و گزینه‌های جایگزین پیشنهاد خواهد شد.',
    rejectionReasonPrefix: 'علت:',
    defaultRejectionReason: 'عدم امکان پذیرش در تاریخ انتخابی',
    viewOtherHostelsNotice: 'می‌توانید هاستل‌های دیگر دارای ظرفیت آزاد را مشاهده کنید.',
    viewOtherHostelsBtn: 'مشاهده سایر هاستل‌های ایروان',
    taxiPassHeader: 'کارت راهنمای مسافر YEREVANHUB (مخصوص موبایل و راننده تاکسی)',
    verifiedPassTag: 'تأییدشده ✓',
    armenianAddressPrompt: 'نشانی به زبان ارمنی (برای نشان دادن به راننده تاکسی یا جستجو در نقشه):',
    copyArmenianAddress: 'کپی نشانی ارمنی',
    copiedCheck: 'کپی شد ✓',
    navigateInMaps: 'مسیریابی در نقشه',
    entranceGuideTitle: 'راهنمای یافتن درب ورودی:',
    doorCodeTitle: 'طبقه و رمز درب ورودی ساختمان:',
    doorCodePrivateNote: 'این کد فقط در لینک پیگیری اختصاصی به مسافر تأییدشده نمایش داده می‌شود.',
    hostelPhoneLabel: 'تلفن هاستل:',
    whatsappLabel: 'واتساپ:',
    emergencyIssueBtn: 'هاستل پاسخ نمی‌دهد / مشکل ورود دارم',
    emergencySentTitle: 'پیام اضطراری شما برای تیم پشتیبانی مقیم ایروان ثبت شد.',
    emergencySentDesc: 'کارشناس پشتیبانی ظرف چند دقیقه مستقیماً با مدیریت هاستل تماس گرفته و مشکل شما را پیگیری خواهد کرد.',
    summaryTitle: 'خلاصه رزرو شما:',
    hostelLabel: 'هاستل:',
    roomTypeLabel: 'نوع اقامت:',
    checkInLabel: 'تاریخ ورود:',
    checkOutLabel: 'تاریخ خروج:',
    nightsCount: 'شب',
    guestsCountLabel: 'تعداد مهمانان:',
    guestsUnit: 'نفر',
    arrivalTimeLabel: 'ساعت تقریبی ورود:',
    finalAmountLabel: 'مبلغ نهایی پرداخت در محل:',
    cancelThisBooking: 'لغو این رزرو',
    reviewTitle: 'نظر و امتیاز شما درباره این اقامت',
    reviewSuccessNote: 'نظر شما با موفقیت ثبت شد و پس از بررسی تیم مدیریت YEREVANHUB در صفحه هاستل نمایش داده خواهد شد.',
    ratingPrompt: 'امتیاز به هاستل (۱ تا ۵ ستاره):',
    reviewPlaceholder: 'نظرتان درباره تمیزی، برخورد پرسنل، امنیت و موقعیت هاستل...',
    submitReviewBtn: 'ثبت نظر برای بررسی مدیریت',
    cancelModalTitle: 'لغو رزرو هاستل',
    cancelModalPrompt: 'آیا از لغو این رزرو اطمینان دارید؟ در صورت لغو، ظرفیت آزاد خواهد شد.',
    cancelReasonPlaceholder: 'دلیل لغو (اختیاری)',
    keepBookingBtn: 'انصراف',
    confirmCancelBtn: 'تأیید و لغو رزرو',
    issueModalTitle: 'گزارش مشکل در محل یا عدم پاسخگویی',
    issueModalPrompt: 'اگر در پشت درب هاستل هستید و زنگ پاسخ داده نمی‌شود یا مشکلی در ورود دارید، به ما اطلاع دهید تا فوراً پیگیری کنیم.',
    issuePlaceholder: 'شرح مشکل (مثلاً: جلوی درب هستم زنگ پاسخ داده نمی‌شود...)',
    closeModalBtn: 'بستن',
    submitReportBtn: 'ارسال گزارش به پشتیبانی',
  },
  en: {
    trackingCodeLabel: 'Private Tracking Code:',
    bookedFor: 'Booked for:',
    confirmedBadge: 'Booking Confirmed (Bed ready for check-in)',
    pendingBadge: 'Awaiting Hostel Approval',
    rejectedBadge: 'Request declined due to lack of capacity',
    cancelledBadge: 'This booking has been cancelled',
    completedBadge: 'Your stay was completed successfully',
    pendingNoticeTitle: 'Your booking request is sent to the hostel.',
    pendingNoticeDesc: 'This page updates automatically. Please wait for the green "Confirmed" status before heading to the address.',
    rejectionReasonPrefix: 'Reason:',
    defaultRejectionReason: 'Capacity unavailable for requested dates',
    viewOtherHostelsNotice: 'You can check other hostels with available beds.',
    viewOtherHostelsBtn: 'Browse Other Yerevan Hostels',
    taxiPassHeader: 'YEREVANHUB Arrival Pass (For Mobile & Taxi Driver)',
    verifiedPassTag: 'Confirmed ✓',
    armenianAddressPrompt: 'Address in Armenian (Show this screen to your taxi driver or search in navigation):',
    copyArmenianAddress: 'Copy Armenian Address',
    copiedCheck: 'Copied ✓',
    navigateInMaps: 'Open in Google Maps',
    entranceGuideTitle: 'Entrance & Finding the Door:',
    doorCodeTitle: 'Floor & Building Entrance Code:',
    doorCodePrivateNote: 'This code is strictly visible on this private guest link.',
    hostelPhoneLabel: 'Hostel Phone:',
    whatsappLabel: 'WhatsApp:',
    emergencyIssueBtn: 'No Answer at Door / Arrival Issue',
    emergencySentTitle: 'Your emergency alert was sent to Yerevan support team.',
    emergencySentDesc: 'Our local agent is contacting the hostel manager immediately to resolve your entrance.',
    summaryTitle: 'Booking Details Summary:',
    hostelLabel: 'Hostel:',
    roomTypeLabel: 'Accommodation:',
    checkInLabel: 'Check-in:',
    checkOutLabel: 'Check-out:',
    nightsCount: 'nights',
    guestsCountLabel: 'Guests:',
    guestsUnit: 'guest(s)',
    arrivalTimeLabel: 'Estimated Arrival:',
    finalAmountLabel: 'Final Total to Pay on Arrival:',
    cancelThisBooking: 'Cancel this reservation',
    reviewTitle: 'Review & Rating for your Stay',
    reviewSuccessNote: 'Your review was submitted and will appear on the hostel page after approval.',
    ratingPrompt: 'Rating (1 to 5 stars):',
    reviewPlaceholder: 'Share your thoughts on cleanliness, staff friendliness, location and safety...',
    submitReviewBtn: 'Submit Review',
    cancelModalTitle: 'Cancel Hostel Booking',
    cancelModalPrompt: 'Are you sure you want to cancel this booking? This will release your bed.',
    cancelReasonPlaceholder: 'Cancellation reason (optional)',
    keepBookingBtn: 'Keep Booking',
    confirmCancelBtn: 'Confirm Cancellation',
    issueModalTitle: 'Report Arrival Issue / Unresponsive Desk',
    issueModalPrompt: 'If you are at the hostel door and the bell is not answered, let us know immediately.',
    issuePlaceholder: 'Describe the issue (e.g. at front door, no one answers doorbell...)',
    closeModalBtn: 'Close',
    submitReportBtn: 'Send Urgent Alert',
  },
  ru: {
    trackingCodeLabel: 'Код отслеживания:',
    bookedFor: 'Оформлено на:',
    confirmedBadge: 'Бронирование подтверждено (место готово)',
    pendingBadge: 'Ожидает подтверждения хостела',
    rejectedBadge: 'Отклонено из-за отсутствия свободных мест',
    cancelledBadge: 'Это бронирование отменено',
    completedBadge: 'Проживание успешно завершено',
    pendingNoticeTitle: 'Запрос на бронирование отправлен в хостел.',
    pendingNoticeDesc: 'Статус на этой странице обновляется автоматически. Пожалуйста, дождитесь зеленого статуса подтверждения перед поездкой.',
    rejectionReasonPrefix: 'Причина:',
    defaultRejectionReason: 'Нет свободных мест на выбранные даты',
    viewOtherHostelsNotice: 'Вы можете посмотреть другие хостелы со свободными местами.',
    viewOtherHostelsBtn: 'Смотреть другие хостелы в Ереване',
    taxiPassHeader: 'Карточка прибытия YEREVANHUB (для таксиста и телефона)',
    verifiedPassTag: 'Подтверждено ✓',
    armenianAddressPrompt: 'Адрес на армянском языке (покажите экран водителю такси):',
    copyArmenianAddress: 'Скопировать адрес на армянском',
    copiedCheck: 'Скопировано ✓',
    navigateInMaps: 'Маршрут на карте',
    entranceGuideTitle: 'Как найти вход:',
    doorCodeTitle: 'Этаж и код домофона/двери:',
    doorCodePrivateNote: 'Этот код отображается только по персональной ссылке гостя.',
    hostelPhoneLabel: 'Телефон хостела:',
    whatsappLabel: 'WhatsApp:',
    emergencyIssueBtn: 'Не открывают дверь / проблема со входом',
    emergencySentTitle: 'Ваш срочный сигнал передан службе поддержки в Ереване.',
    emergencySentDesc: 'Наш дежурный оператор связывается с администратором хостела для вашего заселения.',
    summaryTitle: 'Детали бронирования:',
    hostelLabel: 'Хостел:',
    roomTypeLabel: 'Тип размещения:',
    checkInLabel: 'Дата заезда:',
    checkOutLabel: 'Дата выезда:',
    nightsCount: 'ночей',
    guestsCountLabel: 'Количество гостей:',
    guestsUnit: 'чел.',
    arrivalTimeLabel: 'Примерное время прибытия:',
    finalAmountLabel: 'Итоговая сумма к оплате на месте:',
    cancelThisBooking: 'Отменить это бронирование',
    reviewTitle: 'Отзыв и оценка вашего проживания',
    reviewSuccessNote: 'Ваш отзыв успешно сохранен и будет опубликован после проверки модератором.',
    ratingPrompt: 'Оценка хостела (от 1 до 5 звезд):',
    reviewPlaceholder: 'Напишите о чистоте, персонале, удобстве кроватей и расположении...',
    submitReviewBtn: 'Отправить отзыв',
    cancelModalTitle: 'Отмена бронирования',
    cancelModalPrompt: 'Вы уверены, что хотите отменить бронирование? Место будет освобождено.',
    cancelReasonPlaceholder: 'Причина отмены (необязательно)',
    keepBookingBtn: 'Назад',
    confirmCancelBtn: 'Подтвердить отмену',
    issueModalTitle: 'Сообщить о проблеме со входом',
    issueModalPrompt: 'Если вы стоите у двери хостела и вам не открывают, сообщите нам немедленно.',
    issuePlaceholder: 'Опишите ситуацию (стою у двери, звонок не отвечает...)',
    closeModalBtn: 'Закрыть',
    submitReportBtn: 'Отправить сигнал помощи',
  },
  hy: {
    trackingCodeLabel: 'Ամրագրման անհատական կոդ՝',
    bookedFor: 'Գրանցված է՝',
    confirmedBadge: 'Ամրագրումը հաստատված է (տեղը պատրաստ է)',
    pendingBadge: 'Սպասում է հոսթելի հաստատմանը',
    rejectedBadge: 'Հարցումը մերժված է ազատ տեղերի բացակայության պատճառով',
    cancelledBadge: 'Այս ամրագրումը չեղարկված է',
    completedBadge: 'Կեցությունը հաջողությամբ ավարտվել է',
    pendingNoticeTitle: 'Հարցումն ուղարկված է հոսթելին:',
    pendingNoticeDesc: 'Այս էջն ավտոմատ թարմացնում է կարգավիճակը: Խնդրում ենք չմոտենալ հասցեին մինչև կանաչ «Հաստատված» նշանը:',
    rejectionReasonPrefix: 'Պատճառ՝',
    defaultRejectionReason: 'Ընտրված օրերին ազատ տեղեր չկան',
    viewOtherHostelsNotice: 'Կարող եք դիտել այլ հոսթելներ:',
    viewOtherHostelsBtn: 'Դիտել Երևանի այլ հոսթելները',
    taxiPassHeader: 'YEREVANHUB Ժամանման քարտ (տաքսու վարորդին ցույց տալու համար)',
    verifiedPassTag: 'Հաստատված է ✓',
    armenianAddressPrompt: 'Հասցեն հայերենով (ցույց տվեք տաքսու վարորդին կամ որոնեք քարտեզում)՝',
    copyArmenianAddress: 'Պատճենել հայերեն հասցեն',
    copiedCheck: 'Պատճենված է ✓',
    navigateInMaps: 'Բացել քարտեզում',
    entranceGuideTitle: 'Ինչպես գտնել մուտքը՝',
    doorCodeTitle: 'Հարկը և դռան/դոմոֆոնի կոդը՝',
    doorCodePrivateNote: 'Այս կոդը տեսանելի է միայն հաստատված հյուրի անձնական էջում:',
    hostelPhoneLabel: 'Հոսթելի հեռախոս՝',
    whatsappLabel: 'WhatsApp՝',
    emergencyIssueBtn: 'Դուռը չեն բացում / Մուտքի խնդիր',
    emergencySentTitle: 'Ձեր շտապ ահազանգն ուղարկվեց Երևանի աջակցության թիմին:',
    emergencySentDesc: 'Մեր մասնագետը րոպեների ընթացքում կկապվի հոսթելի տնօրինության հետ:',
    summaryTitle: 'Ամրագրման ամփոփագիր՝',
    hostelLabel: 'Հոսթել՝',
    roomTypeLabel: 'Կացության տեսակ՝',
    checkInLabel: 'Մուտք՝',
    checkOutLabel: 'Ելք՝',
    nightsCount: 'գիշեր',
    guestsCountLabel: 'Հյուրերի քանակ՝',
    guestsUnit: 'անձ',
    arrivalTimeLabel: 'Մոտավոր ժամանում՝',
    finalAmountLabel: 'Վճարման ենթակա գումարը տեղում՝',
    cancelThisBooking: 'Չեղարկել այս ամրագրումը',
    reviewTitle: 'Ձեր կարծիքը և գնահատականը այս կեցության մասին',
    reviewSuccessNote: 'Ձեր կարծիքը գրանցվեց և կհրապարակվի հաստատումից հետո:',
    ratingPrompt: 'Գնահատական (1-ից 5 աստղ)՝',
    reviewPlaceholder: 'Ձեր կարծիքը մաքրության, սպասարկման, անվտանգության մասին...',
    submitReviewBtn: 'Ուղարկել կարծիքը',
    cancelModalTitle: 'Հոսթելի ամրագրման չեղարկում',
    cancelModalPrompt: 'Վստա՞հ եք, որ ցանկանում եք չեղարկել: Տեղը կազատվի:',
    cancelReasonPlaceholder: 'Չեղարկման պատճառը (ըստ ցանկության)',
    keepBookingBtn: 'Հետ',
    confirmCancelBtn: 'Հաստատել չեղարկումը',
    issueModalTitle: 'Հաղորդել մուտքի խնդրի մասին',
    issueModalPrompt: 'Եթե գտնվում եք դռան մոտ և զանգին չեն պատասխանում, տեղեկացրեք մեզ:',
    issuePlaceholder: 'Նկարագրեք խնդիրը (օրինակ՝ դռան մոտ եմ, զանգին չեն պատասխանում...)',
    closeModalBtn: 'Փակել',
    submitReportBtn: 'Ուղարկել ահազանգը',
  },
};

export const BookingTrackingView: React.FC<Props> = ({
  currentLang,
  booking,
  hostel,
  onNavigate,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const tr = TRACKING_TEXTS[currentLang] || TRACKING_TEXTS.fa;
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueNote, setIssueNote] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(Boolean(booking.reviewId));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.cancelBookingByGuest(booking.privateToken, cancelReason || 'Cancelled by guest');
    setShowCancelModal(false);
  };

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.reportEntranceIssue(booking.privateToken, issueNote);
    setShowIssueModal(false);
    setIssueSubmitted(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    appStore.submitReview(booking.privateToken, rating, reviewComment);
    setReviewSubmitted(true);
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{tr.confirmedBadge}</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs sm:text-sm animate-pulse">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>{tr.pendingBadge}</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs sm:text-sm">
            <XCircle className="w-4 h-4 text-rose-700" />
            <span>{tr.rejectedBadge}</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm">
            <span>{tr.cancelledBadge}</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            <span>{tr.completedBadge}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const hostelDisplayName = hostel ? getLocalized(hostel.name, currentLang) : booking.hostelName;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold text-slate-400">{tr.trackingCodeLabel}</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider">
              {booking.trackingCode}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {tr.bookedFor} <span className="font-bold text-slate-800">{booking.guestName}</span>
            </div>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Pending Notice */}
        {booking.status === 'pending' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
            <p className="font-bold text-amber-900">
              {tr.pendingNoticeTitle}
            </p>
            <p>
              {tr.pendingNoticeDesc}
            </p>
          </div>
        )}

        {/* Rejected or Cancelled Notice */}
        {(booking.status === 'rejected' || booking.status === 'cancelled') && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2">
            <p className="font-bold text-slate-900">
              {tr.rejectionReasonPrefix} {booking.rejectionReason || booking.cancellationReason || tr.defaultRejectionReason}
            </p>
            <p>{tr.viewOtherHostelsNotice}</p>
            <button
              type="button"
              onClick={() => onNavigate('hostels')}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              {tr.viewOtherHostelsBtn}
            </button>
          </div>
        )}

        {/* Confirmed Arrival Pass Card (کارت راهنمای رسیدن به هاستل) */}
        {(booking.status === 'confirmed' || booking.status === 'completed') && hostel && (
          <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>{tr.taxiPassHeader}</span>
              </div>
              <span className="text-xs text-slate-400">{tr.verifiedPassTag}</span>
            </div>

            {/* Armenian Address Big Box for Taxi Driver */}
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 space-y-2">
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">
                {tr.armenianAddressPrompt}
              </span>
              <p className="text-xl sm:text-2xl font-bold text-white armenian-text tracking-wide leading-relaxed" dir="ltr">
                {hostel.addressArmenianForTaxi}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(hostel.addressArmenianForTaxi)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedAddress ? tr.copiedCheck : tr.copyArmenianAddress}</span>
                </button>

                <a
                  href={`https://maps.google.com/?q=${hostel.coordinates.lat},${hostel.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{tr.navigateInMaps}</span>
                </a>
              </div>
            </div>

            {/* Entrance Details & Door Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{tr.entranceGuideTitle}</span>
                </span>
                <p>{hostel.directionsFa}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Key className="w-4 h-4" />
                  <span>{tr.doorCodeTitle}</span>
                </span>
                <p className="font-mono text-sm font-bold text-white">
                  {hostel.floorAndDoorCode || 'Reception desk on ground floor'}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  {tr.doorCodePrivateNote}
                </span>
              </div>
            </div>

            {/* Contact Host & Emergency delay button */}
            <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300 flex items-center gap-3">
                <span>{tr.hostelPhoneLabel} <strong className="text-white ltr-isolate">{hostel.phone}</strong></span>
                {hostel.whatsapp && (
                  <span>{tr.whatsappLabel} <strong className="text-white ltr-isolate">{hostel.whatsapp}</strong></span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{tr.emergencyIssueBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Issue submitted confirmation */}
        {issueSubmitted && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-900 space-y-1">
            <p className="font-bold">{tr.emergencySentTitle}</p>
            <p>{tr.emergencySentDesc}</p>
          </div>
        )}

        {/* Booking Details Summary */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">{tr.summaryTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
            <div>{tr.hostelLabel} <strong className="text-slate-900">{hostelDisplayName}</strong></div>
            <div>{tr.roomTypeLabel} <strong className="text-slate-900">{booking.roomTypeName}</strong></div>
            <div>{tr.checkInLabel} <strong className="text-slate-900">{booking.checkIn}</strong></div>
            <div>{tr.checkOutLabel} <strong className="text-slate-900">{booking.checkOut}</strong> ({booking.nights} {tr.nightsCount})</div>
            <div>{tr.guestsCountLabel} <strong className="text-slate-900">{booking.guestsCount} {tr.guestsUnit}</strong></div>
            <div>{tr.arrivalTimeLabel} <strong className="text-slate-900">{booking.estimatedArrivalTime}</strong></div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-800">{tr.finalAmountLabel}</span>
            <span className="text-lg font-black text-amber-700">
              {booking.finalAmountAMD.toLocaleString()} AMD ֏
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        {booking.status === 'pending' || booking.status === 'confirmed' ? (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline"
            >
              {tr.cancelThisBooking}
            </button>
          </div>
        ) : null}

        {/* Review Form (if completed and not reviewed) */}
        {booking.status === 'completed' && (
          <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {tr.reviewTitle}
            </h3>

            {reviewSubmitted ? (
              <p className="text-xs text-emerald-800 font-semibold">
                {tr.reviewSuccessNote}
              </p>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {tr.ratingPrompt}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea
                    required
                    rows={3}
                    placeholder={tr.reviewPlaceholder}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {tr.submitReviewBtn}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base text-slate-900">{tr.cancelModalTitle}</h3>
            <p className="text-xs text-slate-600">
              {tr.cancelModalPrompt}
            </p>
            <textarea
              rows={2}
              placeholder={tr.cancelReasonPlaceholder}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {tr.keepBookingBtn}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
              >
                {tr.confirmCancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {tr.issueModalTitle}
            </h3>
            <p className="text-xs text-slate-600">
              {tr.issueModalPrompt}
            </p>
            <textarea
              rows={3}
              placeholder={tr.issuePlaceholder}
              value={issueNote}
              onChange={e => setIssueNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {tr.closeModalBtn}
              </button>
              <button
                type="button"
                onClick={handleReportIssue}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
              >
                {tr.submitReportBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
