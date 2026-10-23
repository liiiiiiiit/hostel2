import React, { useState, useMemo } from 'react';
import { AppLanguage, Hostel } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized, getCityName, getAmenityLabel, getRoomTypeFilterName } from '../utils/i18n';
import {
  Building2,
  Filter,
  Star,
  Zap,
  Shield,
  Wifi,
  Lock,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  hostels: Hostel[];
  onNavigate: (view: string, params?: any) => void;
  getHostelRating: (hostelId: string) => { avg: number; count: number };
  initialFilter?: any;
}

export const HostelsView: React.FC<Props> = ({
  currentLang,
  hostels,
  onNavigate,
  getHostelRating,
  initialFilter,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  // Filters
  const [city, setCity] = useState(initialFilter?.city || 'all');
  const [district, setDistrict] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<'all' | 'dorm_mixed' | 'dorm_female' | 'private'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(30000);
  const [onlyTonightCapacity, setOnlyTonightCapacity] = useState(false);
  const [onlyImmediateStay, setOnlyImmediateStay] = useState(false);
  const [only24hReception, setOnly24hReception] = useState(false);
  const [onlyElevator, setOnlyElevator] = useState(false);
  const [onlyCoworking, setOnlyCoworking] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating'>('recommended');
  const [showMobileFilterModal, setShowMobileFilterModal] = useState(false);

  const filteredHostels = useMemo(() => {
    return hostels
      .filter(h => {
        if (city !== 'all' && h.city.toLowerCase() !== city.toLowerCase()) return false;
        if (district !== 'all' && h.district !== district) return false;
        if (h.minPricePerNightAMD > maxPrice) return false;
        if (onlyImmediateStay && !h.immediateStayEnabled) return false;
        if (onlyTonightCapacity && !(h.reception24h || h.lateArrivalAvailable || h.immediateStayEnabled)) return false;
        if (only24hReception && !h.reception24h) return false;
        if (onlyElevator && !h.amenities.elevator) return false;
        if (onlyCoworking && !h.amenities.coworking) return false;
        if (roomTypeFilter !== 'all') {
          const hasType = h.roomTypes.some(rt => rt.type === roomTypeFilter);
          if (!hasType) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.minPricePerNightAMD - b.minPricePerNightAMD;
        if (sortBy === 'price_desc') return b.minPricePerNightAMD - a.minPricePerNightAMD;
        if (sortBy === 'rating') {
          return getHostelRating(b.id).avg - getHostelRating(a.id).avg;
        }
        return 0; // recommended order
      });
  }, [
    hostels,
    city,
    district,
    roomTypeFilter,
    maxPrice,
    onlyTonightCapacity,
    onlyImmediateStay,
    only24hReception,
    onlyElevator,
    onlyCoworking,
    sortBy,
    getHostelRating,
  ]);

  const clearFilters = () => {
    setCity('all');
    setDistrict('all');
    setRoomTypeFilter('all');
    setMaxPrice(30000);
    setOnlyTonightCapacity(false);
    setOnlyImmediateStay(false);
    setOnly24hReception(false);
    setOnlyElevator(false);
    setOnlyCoworking(false);
    setSortBy('recommended');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>{t.navHostels}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {t.featuredHostelsTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.payOnArrivalText}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setShowMobileFilterModal(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>{t.filtersLabel} ({filteredHostels.length})</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">{t.sortByLabel}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="recommended">{t.sortRecommended}</option>
              <option value="price_asc">{t.sortPriceAsc}</option>
              <option value="price_desc">{t.sortPriceDesc}</option>
              <option value="rating">{t.sortRating}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-600" />
                <span>{t.filtersLabel}</span>
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
              >
                {t.clearFilters}
              </button>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.cityLabel}</label>
              <select
                value={city}
                onChange={e => {
                  setCity(e.target.value);
                  setDistrict('all');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">{t.allCities}</option>
                <option value="Yerevan">{getCityName('Yerevan', currentLang)}</option>
                <option value="Gyumri">{getCityName('Gyumri', currentLang)}</option>
                <option value="Dilijan">{getCityName('Dilijan', currentLang)}</option>
              </select>
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.amenitiesLabel}</label>
              <div className="space-y-1.5 text-xs">
                {(['all', 'dorm_mixed', 'dorm_female', 'private'] as const).map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer p-1">
                    <input
                      type="radio"
                      name="roomTypeFilter"
                      checked={roomTypeFilter === item}
                      onChange={() => setRoomTypeFilter(item)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700">{getRoomTypeFilterName(item, currentLang)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Max Price Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                <span>{t.stayTotal}:</span>
                <span className="text-amber-700">{maxPrice.toLocaleString()} {t.currencyAMD}</span>
              </div>
              <input
                type="range"
                min="4000"
                max="30000"
                step="1000"
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>4,000 {t.currencyAMD}</span>
                <span>30,000 {t.currencyAMD}</span>
              </div>
            </div>

            {/* Urgent & Capacity Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="block text-xs font-bold text-slate-700">{t.amenitiesLabel}</span>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyImmediateStay}
                  onChange={e => setOnlyImmediateStay(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="font-semibold text-red-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-red-600" />
                  <span>{t.immediateCheckInBadge}</span>
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyTonightCapacity}
                  onChange={e => setOnlyTonightCapacity(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>{t.payOnArrivalBadge}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={only24hReception}
                  onChange={e => setOnly24hReception(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>{t.reception24hBadge}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyElevator}
                  onChange={e => setOnlyElevator(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>{getAmenityLabel('elevator', currentLang)}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyCoworking}
                  onChange={e => setOnlyCoworking(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>{getAmenityLabel('coworking', currentLang)}</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Results List */}
        <div className="lg:col-span-3 space-y-5">
          {filteredHostels.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">{t.filtersLabel}</h3>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs cursor-pointer"
              >
                {t.clearFilters}
              </button>
            </div>
          ) : (
            filteredHostels.map(hostel => {
              const { avg, count } = getHostelRating(hostel.id);
              const localizedName = getLocalized(hostel.name, currentLang);
              const localizedAddress = getLocalized(hostel.address, currentLang);

              return (
                <div
                  key={hostel.id}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col md:flex-row group"
                >
                  {/* Photo & Badges */}
                  <div className="md:w-72 relative aspect-16/10 md:aspect-auto overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={hostel.photos[0]}
                      alt={localizedName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Tags */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                      {hostel.immediateStayEnabled && (
                        <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-white" />
                          <span>{t.immediateCheckIn}</span>
                        </span>
                      )}
                      {hostel.reception24h && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium">
                          {t.reception24hBadge}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{avg}</span>
                      <span className="text-slate-400 font-normal">({count} {t.reviewsCountText})</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                          {getCityName(hostel.city, currentLang)} • {hostel.district}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t.staffLanguagesText} {hostel.languagesSpoken.map(l => l.toUpperCase()).join(', ')}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {localizedName}
                      </h2>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {localizedAddress}
                      </p>
                    </div>

                    {/* Room Types summary */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-2">
                        {hostel.roomTypes.map(rt => (
                          <span
                            key={rt.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5"
                          >
                            <span>{getLocalized(rt.name, currentLang)}</span>
                            <span className="text-amber-700 font-bold">
                              {rt.pricePerNightAMD.toLocaleString()} {t.currencyAMD}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Amenities Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                      {hostel.amenities.wifi && (
                        <span className="flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5 text-slate-400" /> {getAmenityLabel('wifi', currentLang)}
                        </span>
                      )}
                      {hostel.amenities.lockers && (
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-slate-400" /> {getAmenityLabel('lockers', currentLang)}
                        </span>
                      )}
                      {hostel.freeLuggageStorage && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-emerald-600" /> {getAmenityLabel('freeLuggageStorage', currentLang)}
                        </span>
                      )}
                    </div>

                    {/* Pricing & CTA */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-normal">
                          {t.startingFrom}
                        </span>
                        <div className="text-xl font-black text-slate-900">
                          {hostel.minPricePerNightAMD.toLocaleString()}{' '}
                          <span className="text-xs font-semibold text-amber-700">{t.currencyAMD}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          ≈ {Math.round(hostel.minPricePerNightAMD * 160).toLocaleString()} تومان {t.perBedPerNight}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('hostel-detail', { id: hostel.id })}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                        >
                          {t.detailsButton}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">{t.filtersLabel}</h3>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.cityLabel}</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm"
              >
                <option value="all">{t.allCities}</option>
                <option value="Yerevan">{getCityName('Yerevan', currentLang)}</option>
                <option value="Gyumri">{getCityName('Gyumri', currentLang)}</option>
                <option value="Dilijan">{getCityName('Dilijan', currentLang)}</option>
              </select>
            </div>

            {/* Action */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
              >
                {t.clearFilters}
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="flex-1 py-3 rounded-xl bg-amber-500 font-bold text-xs text-slate-950 cursor-pointer shadow-md"
              >
                {t.searchButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
