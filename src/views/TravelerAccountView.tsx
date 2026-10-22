import React from 'react';
import { AppLanguage, User, Booking } from '../types';
import { User as UserIcon, Calendar, Building2, ExternalLink } from 'lucide-react';
import { appStore } from '../services/store';

interface Props {
  currentLang: AppLanguage;
  currentUser: User;
  onNavigate: (view: string, params?: any) => void;
}

const TRAVELER_TEXTS = {
  fa: {
    accountBadge: 'حساب مسافر',
    myStaysTitle: 'اقامت‌ها و رزروهای شما',
    emptyTitle: 'شما هنوز هیچ رزروی ثبت نکرده‌اید.',
    browseHostelsBtn: 'مشاهده هاستل‌های ایروان',
    payOnArrival: 'پرداخت در محل',
    nights: 'شب',
    statusConfirmed: 'تأییدشده',
    statusPending: 'در انتظار تأیید',
    statusCompleted: 'تکمیل‌شده',
    statusCancelled: 'لغو شده',
    statusRejected: 'رد شده',
  },
  en: {
    accountBadge: 'Traveler Account',
    myStaysTitle: 'Your Bookings & Stays',
    emptyTitle: 'You have no bookings recorded yet.',
    browseHostelsBtn: 'Browse Yerevan Hostels',
    payOnArrival: 'Pay on arrival',
    nights: 'nights',
    statusConfirmed: 'Confirmed',
    statusPending: 'Pending',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusRejected: 'Rejected',
  },
  ru: {
    accountBadge: 'Аккаунт путешественника',
    myStaysTitle: 'Ваши бронирования и поездки',
    emptyTitle: 'У вас пока нет оформленных бронирований.',
    browseHostelsBtn: 'Смотреть хостелы Еревана',
    payOnArrival: 'Оплата на месте',
    nights: 'ночей',
    statusConfirmed: 'Подтверждено',
    statusPending: 'Ожидает',
    statusCompleted: 'Завершено',
    statusCancelled: 'Отменено',
    statusRejected: 'Отклонено',
  },
  hy: {
    accountBadge: 'Ճանապարհորդի հաշիվ',
    myStaysTitle: 'Ձեր ամրագրումները և կեցությունները',
    emptyTitle: 'Դուք դեռ չունեք գրանցված ամրագրումներ:',
    browseHostelsBtn: 'Դիտել Երևանի հոսթելները',
    payOnArrival: 'Վճարում տեղում',
    nights: 'գիշեր',
    statusConfirmed: 'Հաստատված',
    statusPending: 'Սպասում է',
    statusCompleted: 'Ավարտված',
    statusCancelled: 'Չեղարկված',
    statusRejected: 'Մերժված',
  },
};

export const TravelerAccountView: React.FC<Props> = ({
  currentLang,
  currentUser,
  onNavigate,
}) => {
  const tr = TRAVELER_TEXTS[currentLang] || TRAVELER_TEXTS.fa;
  const store = appStore.getState();
  const myBookings = store.bookings.filter(
    b => b.travelerUserId === currentUser.id || b.guestContact === currentUser.email || (currentUser.phone && b.guestContact === currentUser.phone)
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return tr.statusConfirmed;
      case 'pending': return tr.statusPending;
      case 'completed': return tr.statusCompleted;
      case 'cancelled': return tr.statusCancelled;
      case 'rejected': return tr.statusRejected;
      default: return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* User profile card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md">
            <UserIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
            <p className="text-xs text-slate-500 ltr-isolate">{currentUser.email}</p>
            {currentUser.phone && <p className="text-xs text-slate-500 ltr-isolate">{currentUser.phone}</p>}
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          {tr.accountBadge}
        </span>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">{tr.myStaysTitle} ({myBookings.length})</h2>

        {myBookings.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">{tr.emptyTitle}</p>
            <button
              type="button"
              onClick={() => onNavigate('hostels')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              {tr.browseHostelsBtn}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myBookings.map(b => (
              <div
                key={b.id}
                onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-500 transition-colors shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-700">{b.trackingCode}</span>
                    <h3 className="font-bold text-slate-900 text-base">{b.hostelName}</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {b.roomTypeName} • {b.checkIn} — {b.checkOut} ({b.nights} {tr.nights})
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="font-bold text-slate-900 text-sm block">
                      {b.finalAmountAMD.toLocaleString()} AMD ֏
                    </span>
                    <span className="text-[11px] text-slate-400">{tr.payOnArrival}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {getStatusLabel(b.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
