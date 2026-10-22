import React, { useState } from 'react';
import { AppLanguage, Hostel, RentalProperty, Article, TravelPhrase } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized, getCityName, getAmenityLabel } from '../utils/i18n';
import {
  Building2,
  Home,
  Zap,
  Search,
  Star,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  Sparkles,
  Compass,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  hostels: Hostel[];
  rentals: RentalProperty[];
  articles: Article[];
  phrases: TravelPhrase[];
  onNavigate: (view: string, params?: any) => void;
  getHostelRating: (hostelId: string) => { avg: number; count: number };
}

export const HomeView: React.FC<Props> = ({
  currentLang,
  hostels,
  rentals,
  articles,
  phrases,
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTab === 'hostels') {
      onNavigate('hostels', { city: selectedCity, checkIn, checkOut, guests });
    } else {
      onNavigate('rentals', { city: selectedCity });
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-slate-50 to-slate-50 pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>{t.officialPlatformBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              {t.heroTitle}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {t.heroSubtitle}
            </p>

            {/* TWO MAIN CALL TO ACTIONS */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              {/* Action 1: Search & Book Hostels */}
              <button
                type="button"
                onClick={() => onNavigate('hostels')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-base shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <Building2 className="w-5 h-5 text-slate-950" />
                <span>{t.ctaSearchHostels}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>

              {/* Action 2: Urgent Just Arrived */}
              <button
                type="button"
                onClick={() => onNavigate('immediate-stay')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base shadow-lg shadow-red-600/25 transition-all cursor-pointer hover:-translate-y-0.5 animate-pulse"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>{t.ctaImmediateStay}</span>
              </button>
            </div>

            {/* Micro guarantees */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.payOnArrivalText}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.nightlyAdmissionText}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.noSmsCodeText}</span>
              </div>
            </div>
          </div>

          {/* QUICK SEARCH WIDGET */}
          <div className="mt-12 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200/80 p-4 sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <button
                type="button"
                onClick={() => setSearchTab('hostels')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  searchTab === 'hostels'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t.navHostels}</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchTab('rentals')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  searchTab === 'rentals'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>{t.navRentals}</span>
              </button>
            </div>

            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t.cityLabel}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden pr-9"
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
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.checkInLabel}
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
                      <input
                        type="date"
                        value={checkIn}
                        onChange={e => setCheckIn(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.checkOutLabel}
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
                      <input
                        type="date"
                        value={checkOut}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.guestsLabel}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Users className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
                        <select
                          value={guests}
                          onChange={e => setGuests(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden pr-9"
                        >
                          <option value={1}>{t.guestCount1}</option>
                          <option value={2}>{t.guestCount2}</option>
                          <option value={3}>{t.guestCount3}</option>
                          <option value={4}>{t.guestCount4Plus}</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.rentalTypeLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('rentals', { type: 'long_term' })}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold text-slate-700 hover:bg-blue-50/50 text-center"
                      >
                        {t.longTermRental}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('rentals', { type: 'short_term' })}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold text-slate-700 hover:bg-blue-50/50 text-center"
                      >
                        {t.shortTermRental}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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

      {/* 2. FEATURED HOSTELS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.featuredHostelsTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t.featuredHostelsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('hostels')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            <span>{t.viewAllHostels} ({hostels.length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostels.slice(0, 3).map(hostel => {
            const { avg, count } = getHostelRating(hostel.id);
            const localizedName = getLocalized(hostel.name, currentLang);
            const localizedAddress = getLocalized(hostel.address, currentLang);

            return (
              <div
                key={hostel.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col"
              >
                {/* Photo & Badges */}
                <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                  <img
                    src={hostel.photos[0]}
                    alt={localizedName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                    {hostel.immediateStayEnabled && (
                      <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-white" />
                        <span>{t.immediateCheckIn}</span>
                      </span>
                    )}
                    {hostel.reception24h && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium shadow-xs">
                        {t.hours24}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{avg}</span>
                    <span className="text-slate-400 font-normal">({count})</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-amber-700 font-bold uppercase tracking-wider">
                      {getCityName(hostel.city, currentLang)} • {hostel.district}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {localizedName}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {localizedAddress}
                    </p>
                  </div>

                  {/* Amenities highlights */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    {hostel.amenities.wifi && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">{t.wifi}</span>
                    )}
                    {hostel.amenities.lockers && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">{t.lockers}</span>
                    )}
                    {hostel.freeLuggageStorage && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">{t.luggageStorage}</span>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-normal">
                        {t.startingFrom}
                      </span>
                      <div className="text-lg font-extrabold text-slate-900">
                        {hostel.minPricePerNightAMD.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-amber-700">{t.currencyAMD}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {t.perBedPerNight}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('hostel-detail', { id: hostel.id })}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
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

      {/* 3. FEATURED RENTALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.featuredRentalsTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t.featuredRentalsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rentals')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
          >
            <span>{t.viewAllRentals} ({rentals.length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rentals.slice(0, 2).map(rental => {
            const localizedTitle = getLocalized(rental.title, currentLang);

            return (
              <div
                key={rental.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col sm:flex-row"
              >
                <div className="sm:w-2/5 relative aspect-16/10 sm:aspect-auto overflow-hidden bg-slate-100">
                  <img
                    src={rental.photos[0]}
                    alt={localizedTitle}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {rental.verifiedBadge && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.verifiedBadge}</span>
                    </span>
                  )}
                </div>

                <div className="sm:w-3/5 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-xs text-blue-600 font-bold uppercase">
                      {getCityName(rental.city, currentLang)} • {rental.neighborhood}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                      {localizedTitle}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {rental.areaSqm} m² • {rental.bedroomsCount} bed • floor {rental.floor}
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">{t.stayTotal}:</span>{' '}
                    {rental.refundableDepositAMD.toLocaleString()} {t.currencyAMD}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {rental.pricePerMonthAMD ? (
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {rental.pricePerMonthAMD.toLocaleString()}{' '}
                            <span className="text-xs font-semibold text-blue-700">{t.currencyAMD}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">{t.perMonth}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {rental.pricePerNightAMD?.toLocaleString()}{' '}
                            <span className="text-xs font-semibold text-blue-700">{t.currencyAMD}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">{t.perNight}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('rental-detail', { id: rental.id })}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
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

      {/* 4. ESSENTIAL TRAVEL PHRASES SPOTLIGHT */}
      <section className="bg-slate-900 text-white py-16 rounded-3xl max-w-7xl mx-auto px-6 sm:px-10 overflow-hidden relative">
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>{t.travelPhrasesTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t.travelPhrasesTitle}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {t.travelPhrasesSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {phrases.slice(0, 3).map(phrase => {
            const displayNative = currentLang === 'en' ? phrase.en : currentLang === 'ru' ? phrase.ru : phrase.fa;

            return (
              <div
                key={phrase.id}
                className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span>{phrase.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                    {phrase.phoneticHy}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">{displayNative}</p>
                <p className="text-base font-bold text-amber-300 armenian-text tracking-wide" dir="ltr">
                  {phrase.hy}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onNavigate('translator')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            <span>{t.openTranslatorWithPhrases}</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. ARMENIA GUIDE HIGHLIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.guideHighlightsTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t.guidePageSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            <span>{t.readMoreButton} ({articles.filter(a => a.status === 'published').length})</span>
            <ArrowIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles
            .filter(a => a.status === 'published')
            .slice(0, 3)
            .map(article => (
              <div
                key={article.id}
                onClick={() => onNavigate('article-detail', { slug: article.slug })}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-16/10 overflow-hidden bg-slate-100">
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-700">{article.category}</span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span>{t.lastVerifiedLabel} {article.lastVerifiedDate}</span>
                    <span className="font-semibold text-emerald-700">{t.readMoreButton}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 6. WHY YEREVANHUB */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t.whyChooseTitle}
          </h2>
          <p className="text-sm text-slate-500">
            {t.whyChooseSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.feature1Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.feature1Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-red-50/50 border border-red-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.feature2Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.feature2Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.feature3Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.feature3Desc}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.feature4Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.feature4Desc}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
