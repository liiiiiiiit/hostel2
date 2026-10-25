import React from 'react';
import { AppLanguage, Booking, Hostel } from '../types';
import {
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Bed,
  ExternalLink,
} from 'lucide-react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  currentLang?: AppLanguage;
  onNavigate: (view: string, params?: any) => void;
}

export const ManagerPanelView: React.FC<Props> = ({ onNavigate }) => {
  const { currentLang, tManager, getLocalized, isRtl } = useLanguage();
  const store = appStore.getState();
  const currentUser = store.currentUser;
  const assignedHostelId = currentUser?.assignedHostelIds?.[0] || store.hostels[0].id;
  const hostel = store.hostels.find(h => h.id === assignedHostelId) || store.hostels[0];

  const hostelBookings = store.bookings.filter(b => b.hostelId === hostel.id);
  const pendingBookings = hostelBookings.filter(b => b.status === 'pending');

  const statusLabels: Record<string, Record<AppLanguage, string>> = {
    confirmed: { fa: 'تأییدشده', en: 'Confirmed', ru: 'Подтверждено', hy: 'Հաստատված' },
    pending: { fa: 'در انتظار بررسی', en: 'Pending', ru: 'В ожидании', hy: 'Սպասվող' },
    completed: { fa: 'تکمیل‌شده', en: 'Completed', ru: 'Завершено', hy: 'Ավարտված' },
    rejected: { fa: 'ردشده', en: 'Rejected', ru: 'Отклонено', hy: 'Մերժված' },
    cancelled: { fa: 'لغوشده', en: 'Cancelled', ru: 'Отменено', hy: 'Չեղարկված' },
    no_show: { fa: 'عدم حضور', en: 'No Show', ru: 'Не заехал', hy: 'Չներկայացավ' },
  };

  const getStatusText = (status: string) => {
    return statusLabels[status]?.[currentLang] || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Key className="w-4 h-4" />
            <span>{tManager.panelTitle}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {getLocalized(hostel.name, hostel.name.fa)}
          </h1>
          <p className="text-xs text-slate-500">{getLocalized(hostel.address, hostel.address.fa)}</p>
        </div>

        {/* Hostel Quick Stats & Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('hostel-detail', { id: hostel.id })}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>
              {currentLang === 'fa' ? 'مشاهده صفحه عمومی هاستل' : currentLang === 'en' ? 'View Public Page' : currentLang === 'ru' ? 'Страница хостела' : 'Դիտել էջը'}
            </span>
          </button>
        </div>
      </div>

      {/* Pending requests alert */}
      {pendingBookings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs sm:text-sm text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{tManager.pendingBookingsAlert.replace('{count}', String(pendingBookings.length))}</span>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">
          {tManager.bookingsListTitle.replace('{count}', String(hostelBookings.length))}
        </h2>
        <div className="space-y-3">
          {hostelBookings.map(b => (
            <div key={b.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-emerald-700">{b.trackingCode}</span>
                  <span className="font-bold text-slate-900">{b.guestName}</span>
                  <span className="text-xs text-slate-500 ltr-isolate">{b.guestContact}</span>
                  {b.isImmediateArrival && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
                      {tManager.immediateBadge}
                    </span>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                  b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  b.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {getStatusText(b.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">{tManager.roomLabel} </span>
                  <strong className="text-slate-900">{b.roomTypeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{tManager.datesLabel} </span>
                  <strong className="text-slate-900 ltr-isolate">{b.checkIn} → {b.checkOut}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{tManager.quantityLabel} </span>
                  <strong className="text-slate-900">
                    {b.quantity} {tManager.bedsCountText} ({b.guestsCount} {tManager.personsCountText})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">{tManager.amountOnArrivalLabel} </span>
                  <strong className="text-slate-900">{b.finalAmountAMD.toLocaleString()} AMD</strong>
                </div>
              </div>

              {b.specialRequests && (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="font-bold">{tManager.guestRequestLabel}</span> {b.specialRequests}
                </div>
              )}

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{tManager.passengerLinkBtn}</span>
                </button>

                {b.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'confirmed')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {tManager.confirmBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'rejected', 'عدم ظرفیت')}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {tManager.rejectBtn}
                    </button>
                  </>
                )}

                {b.status === 'confirmed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'completed')}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {tManager.completeBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'no_show', 'عدم حضور مسافر')}
                      className="px-4 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      {tManager.noShowBtn}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
