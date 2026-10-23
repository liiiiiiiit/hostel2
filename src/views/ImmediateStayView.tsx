import React, { useState, useMemo } from 'react';
import { AppLanguage, Hostel } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized, getCityName } from '../utils/i18n';
import { appStore } from '../services/store';
import {
  Zap,
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  Send,
  Building2,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  hostels: Hostel[];
  onNavigate: (view: string, params?: any) => void;
}

export const ImmediateStayView: React.FC<Props> = ({
  currentLang,
  hostels,
  onNavigate,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  const ARRIVAL_HUBS = useMemo(() => [
    {
      id: 'kilikia',
      name: t.kilikiaStation,
      lat: 40.1718,
      lng: 44.4842,
    },
    {
      id: 'zvartnots',
      name: t.zvartnotsAirport,
      lat: 40.1534,
      lng: 44.3975,
    },
    {
      id: 'republic_square',
      name: t.republicSquare,
      lat: 40.1776,
      lng: 44.5126,
    },
    {
      id: 'sasuntsi_davit',
      name: t.sasuntsiDavitStation,
      lat: 40.1554,
      lng: 44.5097,
    },
    {
      id: 'north_bus',
      name: t.northernBusStation,
      lat: 40.2185,
      lng: 44.5422,
    },
  ], [t]);

  const [selectedHub, setSelectedHub] = useState<string>('kilikia');
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedHubObj = ARRIVAL_HUBS.find(h => h.id === selectedHub) || ARRIVAL_HUBS[0];

  function calculateRoughDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Filter hostels ready for immediate reception
  const immediateHostels = useMemo(() => {
    return hostels
      .filter(h => h.immediateStayEnabled || h.reception24h)
      .sort((a, b) => {
        const distA = calculateRoughDistanceKm(
          selectedHubObj.lat,
          selectedHubObj.lng,
          a.coordinates.lat,
          a.coordinates.lng
        );
        const distB = calculateRoughDistanceKm(
          selectedHubObj.lat,
          selectedHubObj.lng,
          b.coordinates.lat,
          b.coordinates.lng
        );
        return distA - distB;
      });
  }, [hostels, selectedHubObj]);

  const handleInstantBooking = (hostel: Hostel) => {
    setErrorMessage('');
    if (!guestName.trim()) {
      setErrorMessage(currentLang === 'fa' ? 'لطفاً نام مسافر را وارد کنید.' : 'Please enter guest name.');
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMessage(currentLang === 'fa' ? 'لطفاً شماره تماس را وارد کنید.' : 'Please enter contact phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Pick first available dorm room
      const room = hostel.roomTypes[0];
      const now = new Date();
      const checkInStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const checkOutStr = tomorrow.toISOString().split('T')[0];

      const arrivalNote = currentLang === 'fa'
        ? `رسیدن از ${selectedHubObj.name} - نیازمند ورود فوری`
        : `Arriving from ${selectedHubObj.name} - Urgent immediate stay`;

      const result = appStore.createBooking({
        hostelId: hostel.id,
        roomTypeId: room.id,
        guestName: guestName.trim(),
        contactType: 'phone',
        guestContact: guestPhone.trim(),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestsCount: guestsCount,
        quantity: 1,
        estimatedArrivalTime: 'همین حالا / ورود فوری',
        specialRequests: arrivalNote,
        isImmediateArrival: true,
      });

      if (result.success && result.booking) {
        onNavigate('booking-track', { token: result.booking.privateToken });
      } else {
        setErrorMessage(result.error || 'خطا در ثبت درخواست');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ثبت درخواست');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Urgent Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-amber-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
          <Zap className="w-4 h-4 fill-white" />
          <span>YEREVANHUB</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
          {t.immediateStayPageTitle}
        </h1>

        <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
          {t.immediateStaySubtitle}
        </p>

        <div className="p-4 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t.immediateStayWarning}
          </p>
        </div>
      </div>

      {/* Step 1: Where are you right now? */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <span>{t.whereAreYouNow}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ARRIVAL_HUBS.map(hub => {
            const isSelected = selectedHub === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedHub(hub.id)}
                className={`p-3.5 rounded-2xl text-xs font-semibold text-right transition-all flex items-center justify-between cursor-pointer border ${
                  isSelected
                    ? 'bg-red-50/70 border-red-500 text-red-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>{hub.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Guests count */}
        <div className="pt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">{t.guestsLabel}:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setGuestsCount(n)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  guestsCount === n
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {n === 1 ? t.guestCount1 : n === 2 ? t.guestCount2 : n === 3 ? t.guestCount3 : t.guestCount4Plus}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Available hostels sorted by distance to selected hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            {t.urgentHostelsReadyCount} ({immediateHostels.length})
          </h2>
          <span className="text-xs text-slate-400">
            {t.sortByLabel} {t.airDistance}
          </span>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {immediateHostels.map(hostel => {
            const distance = calculateRoughDistanceKm(
              selectedHubObj.lat,
              selectedHubObj.lng,
              hostel.coordinates.lat,
              hostel.coordinates.lng
            );
            const estTaxiAMD = Math.round(800 + distance * 120);
            const localizedName = getLocalized(hostel.name, currentLang);
            const localizedAddress = getLocalized(hostel.address, currentLang);

            return (
              <div
                key={hostel.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        {t.immediateCheckInBadge}
                      </span>
                      {hostel.reception24h && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-medium">
                          {t.reception24hBadge}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {getCityName(hostel.city, currentLang)} • {hostel.district}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {localizedName}
                    </h3>
                    <p className="text-xs text-slate-500">{localizedAddress}</p>
                  </div>

                  {/* Distance & Taxi estimate */}
                  <div className="sm:text-left shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center sm:justify-end gap-1">
                      <Navigation className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.airDistance}: {distance} km</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t.estTaxiFare}: ~{estTaxiAMD.toLocaleString()} {t.currencyAMD}
                    </div>
                  </div>
                </div>

                {/* Minimal Fast Booking Form */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block">{t.stayTotal}:</span>
                    <div className="text-xl font-black text-slate-900">
                      {(hostel.minPricePerNightAMD * guestsCount).toLocaleString()}{' '}
                      <span className="text-xs text-amber-700">{t.currencyAMD}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {t.payOnArrivalNote}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder={t.guestNamePlaceholder}
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="tel"
                      placeholder={t.phonePlaceholder}
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-red-500 ltr-isolate text-left"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleInstantBooking(hostel)}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer whitespace-nowrap"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>{t.urgentBookingButton}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
