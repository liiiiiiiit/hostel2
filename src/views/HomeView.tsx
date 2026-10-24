import React, { useState, useEffect } from 'react';
import { AppLanguage, Hostel, RentalProperty, Article, TravelPhrase } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized, getCityName } from '../utils/i18n';
import {
  Building2,
  Home,
  Search,
  Star,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Compass,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  hostels: Hostel[];
  rentals: RentalProperty[];
  articles: Article[];
  phrases?: TravelPhrase[];
  onNavigate: (view: string, params?: any) => void;
  getHostelRating: (hostelId: string) => { avg: number; count: number };
}

export const HomeView: React.FC<Props> = ({
  currentLang,
  hostels,
  rentals,
  articles,
  onNavigate,
  getHostelRating,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  // Search state
  const [searchTab, setSearchTab] = useState<'hostels' | 'rentals'>('hostels');
  const [selectedCity, setSelectedCity] = useState('all');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  // Live Yerevan Clock
  const [yerevanTime, setYerevanTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const yerevanDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Yerevan' }));
        const hh = String(yerevanDate.getHours()).padStart(2, '0');
        const mm = String(yerevanDate.getMinutes()).padStart(2, '0');
        setYerevanTime(`${hh}:${mm}`);
      } catch {
        setYerevanTime('15:30');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const AMD_TO_TOMAN = 160;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTab === 'hostels') {
      onNavigate('hostels', { city: selectedCity, checkIn, checkOut, guests });
    } else {
      onNavigate('rentals', { city: selectedCity });
    }
  };

  // Quick date presets
  const setQuickDate = (daysFromToday: number, duration: number = 2) => {
    const start = new Date();
    start.setDate(start.getDate() + daysFromToday);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    setCheckIn(start.toISOString().split('T')[0]);
    setCheckOut(end.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {/* 1. HERO SECTION - Modern Ambient Glow & Editorial Presence */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-amber-500/5 via-slate-50/50 to-white">
        {/* Subtle Warm Backdrop Glow */}
        <div 
          aria-hidden="true" 
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-amber-400/15 via-rose-300/10 to-transparent blur-3xl pointer-events-none rounded-full"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Live Status Ribbon */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>🇦🇲 {t.yerevanLiveStatus}</span>
              {yerevanTime && (
                <>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span className="font-mono font-bold text-slate-900">{yerevanTime}</span>
                </>
              )}
            </div>

            {/* Header Kicker Tag */}
            <div className="flex items-center justify-center gap-2 text-xs font-black tracking-widest text-amber-700 uppercase">
              <span className="brand-name">YEREVANHUB</span>
              <span aria-hidden="true" className="text-amber-400">·</span>
              <span>{t.officialPlatformBadge}</span>
            </div>

            {/* High-Contrast Modern Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.18]">
              {t.heroTitle}
            </h1>

            {/* Primary Action CTA */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onNavigate('hostels')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>{t.ctaSearchHostels}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Single Honest Guarantee */}
            <div className="pt-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.payOnArrivalText}</span>
            </div>
          </div>

          {/* SEARCH CONSOLE - High Elevation Floating Card */}
          <div className="mt-12 sm:mt-14 max-w-4xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/8 border border-slate-200/90 p-5 sm:p-7">
            {/* Segmented Switcher & Quick Date Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setSearchTab('hostels')}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    searchTab === 'hostels'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>{t.navHostels}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTab('rentals')}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    searchTab === 'rentals'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-600" />
                  <span>{t.navRentals}</span>
                </button>
              </div>

              {/* Quick Date Presets (Hostels only) */}
              {searchTab === 'hostels' && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto pb-1 sm:pb-0">
                  <span className="hidden md:inline text-slate-400">{t.quickDatesLabel}</span>
                  <button
                    type="button"
                    onClick={() => setQuickDate(0, 1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition-colors cursor-pointer"
                  >
                    {t.tonight}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1, 2)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition-colors cursor-pointer"
                  >
                    {t.tomorrowNight}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3, 3)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition-colors cursor-pointer"
                  >
                    {t.thisWeekend}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.cityLabel}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute top-3.5 right-3 pointer-events-none" />
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden pr-9 transition-colors"
                  >
                    <option value="all">{t.allCities}</option>
                    <option value="Yerevan">{getCityName('Yerevan', currentLang)}</option>
                    <option value="Gyumri">{getCityName('Gyumri', currentLang)}</option>
                    <option value="Dilijan">{getCityName('Dilijan', currentLang)}</option>
                  </select>
                </div>
              </div>

              {searchTab === 'hostels' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t.checkInLabel}
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute top-3.5 right-3 pointer-events-none" />
                      <input
                        type="date"
                        value={checkIn}
                        onChange={e => setCheckIn(e.target.value)}
                        className="w-full bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden pr-9 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t.checkOutLabel}
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute top-3.5 right-3 pointer-events-none" />
                      <input
                        type="date"
                        value={checkOut}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden pr-9 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t.guestsLabel}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Users className="w-4 h-4 text-slate-400 absolute top-3.5 right-3 pointer-events-none" />
                        <select
                          value={guests}
                          onChange={e => setGuests(Number(e.target.value))}
                          className="w-full bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden pr-9 transition-colors"
                        >
                          <option value={1}>{t.guestCount1}</option>
                          <option value={2}>{t.guestCount2}</option>
                          <option value={3}>{t.guestCount3}</option>
                          <option value={4}>{t.guestCount4Plus}</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-102"
                      >
                        <Search className="w-4 h-4 text-slate-950" />
                        <span>{t.searchButton}</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t.rentalTypeLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('rentals', { type: 'long_term' })}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold text-slate-700 hover:bg-blue-50/50 text-center transition-colors cursor-pointer"
                      >
                        {t.longTermRental}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('rentals', { type: 'short_term' })}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold text-slate-700 hover:bg-blue-50/50 text-center transition-colors cursor-pointer"
                      >
                        {t.shortTermRental}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5 hover:scale-102"
                    >
                      <Search className="w-4 h-4" />
                      <span>{t.ctaSearchRentals}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </section>


      {/* 3. YEREVAN NEIGHBORHOODS EXPLORER - Architectural District Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">
              {t.neighborhoodsTag}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.neighborhoodsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.neighborhoodsSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kentron */}
          <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div>
              <div className="relative aspect-16/9 overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80"
                  alt="Kentron Yerevan"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-bold">
                  {t.distToRepublicSquare}: ۲ {t.minsWalk}
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                  {t.neighborhoodKentronName}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.neighborhoodKentronDesc}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <button
                type="button"
                onClick={() => onNavigate('hostels', { district: 'Kentron' })}
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.viewHostelsInDistrict}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Arabkir */}
          <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div>
              <div className="relative aspect-16/9 overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1541971875076-8f970d573be6?auto=format&fit=crop&w=800&q=80"
                  alt="Arabkir Yerevan"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-bold">
                  {t.directMetroAccess}
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                  {t.neighborhoodArabkirName}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.neighborhoodArabkirDesc}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <button
                type="button"
                onClick={() => onNavigate('hostels', { district: 'Arabkir' })}
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.viewHostelsInDistrict}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Avan & Nork */}
          <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div>
              <div className="relative aspect-16/9 overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  alt="Avan & Nork Yerevan"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-bold">
                  {t.freshMountainAir}
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {t.neighborhoodAvanName}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.neighborhoodAvanDesc}
                </p>
              </div>
            </div>
            <div className="p-5 pt-0">
              <button
                type="button"
                onClick={() => onNavigate('rentals', { city: 'Yerevan' })}
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t.viewAllRentals}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED HOSTELS - Clean Aspect Ratios & Tactile Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">
              {t.navHostels}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.featuredHostelsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.featuredHostelsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('hostels')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            <span>{t.viewAllHostels} ({hostels.length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {hostels.slice(0, 3).map(hostel => {
            const { avg, count } = getHostelRating(hostel.id);
            const localizedName = getLocalized(hostel.name, currentLang);
            const localizedAddress = getLocalized(hostel.address, currentLang);

            return (
              <div
                key={hostel.id}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Photo & Clean Overlays */}
                <div>
                  <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                    <img
                      src={hostel.photos[0]}
                      alt={localizedName}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      loading="lazy"
                    />


                    {/* Rating Tag */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{avg}</span>
                      <span className="text-slate-400 font-normal text-[11px]">({count})</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                      <span>{getCityName(hostel.city, currentLang)}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>{hostel.district}</span>
                      {hostel.reception24h && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-500 font-normal">{t.hours24}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {localizedName}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {localizedAddress}
                    </p>

                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 pt-3 border-t border-slate-100">
                      {hostel.amenities.wifi && <span>{t.wifi}</span>}
                      {hostel.amenities.wifi && hostel.amenities.lockers && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {hostel.amenities.lockers && <span>{t.lockers}</span>}
                      {hostel.freeLuggageStorage && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {hostel.freeLuggageStorage && <span>{t.luggageStorage}</span>}
                    </div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="p-6 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {t.startingFrom}
                      </span>
                      <div className="text-lg font-black text-slate-900 tracking-tight">
                        {hostel.minPricePerNightAMD.toLocaleString()}{' '}
                        <span className="text-xs font-bold text-amber-700">֏ AMD</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        ≈ {Math.round(hostel.minPricePerNightAMD * AMD_TO_TOMAN).toLocaleString()} {t.approxTomanSuffix}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('hostel-detail', { id: hostel.id })}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs hover:scale-102"
                    >
                      {t.detailsButton}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FEATURED RENTALS - Architectural Presentation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">
              {t.navRentals}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.featuredRentalsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.featuredRentalsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rentals')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
          >
            <span>{t.viewAllRentals} ({rentals.length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {rentals.slice(0, 2).map(rental => {
            const localizedTitle = getLocalized(rental.title, currentLang);

            return (
              <div
                key={rental.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row group"
              >
                <div className="sm:w-2/5 relative aspect-16/10 sm:aspect-auto overflow-hidden bg-slate-100">
                  <img
                    src={rental.photos[0]}
                    alt={localizedTitle}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                    loading="lazy"
                  />
                  {rental.verifiedBadge && (
                    <div className="absolute top-3 right-3 bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xs flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.verifiedBadge}</span>
                    </div>
                  )}
                </div>

                <div className="sm:w-3/5 p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold">
                      <span>{getCityName(rental.city, currentLang)}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>{rental.neighborhood}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                      {localizedTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{rental.areaSqm} m²</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>{rental.bedroomsCount} {t.bedsLabel}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>{t.floorLabel} {rental.floor} {rental.hasElevator ? `(${t.elevatorShort})` : ''}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">{t.stayTotal}:</span>{' '}
                    <strong className="text-slate-900">{rental.refundableDepositAMD.toLocaleString()} {t.currencyAMD}</strong>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {rental.pricePerMonthAMD ? (
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {rental.pricePerMonthAMD.toLocaleString()}{' '}
                            <span className="text-xs font-bold text-blue-700">{t.currencyAMD}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">{t.perMonth}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {rental.pricePerNightAMD?.toLocaleString()}{' '}
                            <span className="text-xs font-bold text-blue-700">{t.currencyAMD}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">{t.perNight}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('rental-detail', { id: rental.id })}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs hover:scale-102"
                    >
                      {t.viewPropertyButton}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. ARMENIA GUIDE HIGHLIGHTS - Editorial Quality */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">
              {t.navGuide}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.guideHighlightsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.guidePageSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            <span>{t.readMoreButton} ({articles.filter(a => a.status === 'published').length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {articles
            .filter(a => a.status === 'published')
            .slice(0, 3)
            .map(article => (
              <div
                key={article.id}
                onClick={() => onNavigate('article-detail', { slug: article.slug })}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-16/10 overflow-hidden bg-slate-100">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 space-y-2.5">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{article.category}</span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span>{t.lastVerifiedLabel} {article.lastVerifiedDate}</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <span>{t.readMoreButton}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 8. WHY YEREVANHUB - 4 Structured Pillars with Hairline Borders */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t.whyChooseTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t.whyChooseSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <span className="font-mono text-xs font-black text-amber-700">01</span>
            <h3 className="text-base font-bold text-slate-900">{t.feature1Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {t.feature1Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <span className="font-mono text-xs font-black text-red-700">02</span>
            <h3 className="text-base font-bold text-slate-900">{t.feature2Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {t.feature2Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <span className="font-mono text-xs font-black text-blue-700">03</span>
            <h3 className="text-base font-bold text-slate-900">{t.feature3Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {t.feature3Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <span className="font-mono text-xs font-black text-emerald-700">04</span>
            <h3 className="text-base font-bold text-slate-900">{t.feature4Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {t.feature4Desc}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
