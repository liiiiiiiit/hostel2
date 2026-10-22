import React, { useState } from 'react';
import { AppLanguage, Booking, Hostel } from '../types';
import {
  Key,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Bed,
  ExternalLink,
} from 'lucide-react';
import { appStore } from '../services/store';

interface Props {
  currentLang: AppLanguage;
  onNavigate: (view: string, params?: any) => void;
}

export const ManagerPanelView: React.FC<Props> = ({ currentLang, onNavigate }) => {
  const store = appStore.getState();
  const currentUser = store.currentUser;
  const assignedHostelId = currentUser?.assignedHostelIds?.[0] || store.hostels[0].id;
  const hostel = store.hostels.find(h => h.id === assignedHostelId) || store.hostels[0];

  const hostelBookings = store.bookings.filter(b => b.hostelId === hostel.id);
  const pendingBookings = hostelBookings.filter(b => b.status === 'pending');

  const [immediateDuration, setImmediateDuration] = useState(6);

  const handleToggleImmediate = () => {
    appStore.toggleImmediateStay(hostel.id, !hostel.immediateStayEnabled, immediateDuration);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Key className="w-4 h-4" />
            <span>پنل اختصاصی هاستل‌دار</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {hostel.name.fa}
          </h1>
          <p className="text-xs text-slate-500">{hostel.address.fa}</p>
        </div>

        {/* Immediate check-in mode toggle widget */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
              <Zap className={`w-4 h-4 ${hostel.immediateStayEnabled ? 'text-red-600 fill-red-600' : 'text-slate-400'}`} />
              <span>پذیرش ورود فوری (برای مسافران تازه‌رسیده):</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {hostel.immediateStayEnabled ? 'فعال است تا پایان موعد' : 'غیرفعال است'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleImmediate}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              hostel.immediateStayEnabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {hostel.immediateStayEnabled ? 'غیرفعال کردن ورود فوری' : 'فعال‌سازی ورود فوری'}
          </button>
        </div>
      </div>

      {/* Pending requests alert */}
      {pendingBookings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs sm:text-sm text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>شما <strong>{pendingBookings.length}</strong> درخواست رزرو جدید در انتظار بررسی دارید.</span>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">رزروهای این هاستل ({hostelBookings.length})</h2>
        <div className="space-y-3">
          {hostelBookings.map(b => (
            <div key={b.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-emerald-700">{b.trackingCode}</span>
                  <span className="font-bold text-slate-900">{b.guestName}</span>
                  <span className="text-xs text-slate-500 ltr-isolate">{b.guestContact}</span>
                  {b.isImmediateArrival && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
                      ورود فوری
                    </span>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                  b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {b.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                <div>اتاق: <strong className="text-slate-900">{b.roomTypeName}</strong></div>
                <div>تاریخ: <strong className="text-slate-900">{b.checkIn} تا {b.checkOut}</strong></div>
                <div>تعداد: <strong className="text-slate-900">{b.quantity} تخت ({b.guestsCount} نفر)</strong></div>
                <div>مبلغ دریافتی در محل: <strong className="text-slate-900">{b.finalAmountAMD.toLocaleString()} AMD</strong></div>
              </div>

              {b.specialRequests && (
                <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-xl">
                  درخواست مسافر: {b.specialRequests}
                </div>
              )}

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>پیوند اختصاصی مسافر</span>
                </button>

                {b.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'confirmed')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                    >
                      تأیید رزرو
                    </button>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'rejected', 'عدم ظرفیت')}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer"
                    >
                      رد
                    </button>
                  </>
                )}

                {b.status === 'confirmed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'completed')}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                    >
                      تکمیل اقامت
                    </button>
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'no_show', 'عدم حضور مسافر')}
                      className="px-4 py-1.5 rounded-xl border border-rose-200 text-rose-700 font-semibold text-xs cursor-pointer"
                    >
                      عدم حضور (No Show)
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
