import React, { useState, useMemo } from 'react';
import { AppLanguage, RentalProperty } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getLocalized, getCityName } from '../utils/i18n';
import {
  Home,
  ShieldCheck,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  rentals: RentalProperty[];
  onNavigate: (view: string, params?: any) => void;
  initialFilter?: any;
}

export const RentalsView: React.FC<Props> = ({
  currentLang,
  rentals,
  onNavigate,
  initialFilter,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  const [rentalType, setRentalType] = useState<string>(initialFilter?.type || 'all');
  const [city, setCity] = useState(initialFilter?.city || 'all');
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyPetFriendly, setOnlyPetFriendly] = useState(false);
  const [onlyElevator, setOnlyElevator] = useState(false);

  const filtered = useMemo(() => {
    return rentals.filter(r => {
      if (city !== 'all' && r.city.toLowerCase() !== city.toLowerCase()) return false;
      if (rentalType !== 'all' && r.rentalType !== 'both' && r.rentalType !== rentalType) return false;
      if (bedrooms > 0 && r.bedroomsCount < bedrooms) return false;
      if (onlyVerified && !r.verifiedBadge) return false;
      if (onlyPetFriendly && !r.amenities.petFriendly) return false;
      if (onlyElevator && !r.hasElevator) return false;
      return true;
    });
  }, [rentals, city, rentalType, bedrooms, onlyVerified, onlyPetFriendly, onlyElevator]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Home className="w-4 h-4" />
            <span>{t.navRentals}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {t.featuredRentalsTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.featuredRentalsSubtitle}
          </p>
        </div>

        {/* Rental Type switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setRentalType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              rentalType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.viewAllRentals}
          </button>
          <button
            type="button"
            onClick={() => setRentalType('long_term')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              rentalType === 'long_term' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.longTermRental}
          </button>
          <button
            type="button"
            onClick={() => setRentalType('short_term')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              rentalType === 'short_term' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            {t.shortTermRental}
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">{t.cityLabel}:</span>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium"
            >
              <option value="all">{t.allCities}</option>
              <option value="Yerevan">{getCityName('Yerevan', currentLang)}</option>
              <option value="Gyumri">{getCityName('Gyumri', currentLang)}</option>
              <option value="Dilijan">{getCityName('Dilijan', currentLang)}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">خواب:</span>
            <select
              value={bedrooms}
              onChange={e => setBedrooms(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium"
            >
              <option value={0}>همه</option>
              <option value={1}>حداقل ۱ خواب</option>
              <option value={2}>حداقل ۲ خواب</option>
              <option value={3}>حداقل ۳ خواب</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={e => setOnlyVerified(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>{t.verifiedBadge}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyPetFriendly}
              onChange={e => setOnlyPetFriendly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>حیوان خانگی مجاز</span>
          </label>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          {filtered.length} {t.viewAllRentals}
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map(rental => {
          const localizedTitle = getLocalized(rental.title, currentLang);

          return (
            <div
              key={rental.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col group"
            >
              {/* Gallery Image */}
              <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                <img
                  src={rental.photos[0]}
                  alt={localizedTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                  {rental.verifiedBadge && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.verifiedBadge}</span>
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium">
                    {rental.rentalType === 'long_term' ? t.longTermRental : rental.rentalType === 'short_term' ? t.shortTermRental : `${t.longTermRental} / ${t.shortTermRental}`}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
                  {rental.commissionAmountText}
                </div>
              </div>

              {/* Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-xs text-blue-700 font-bold uppercase">
                    {getCityName(rental.city, currentLang)} • {rental.neighborhood}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {localizedTitle}
                  </h2>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {rental.approximateLocationLabel}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-600 pt-1">
                    <span className="px-2 py-1 rounded-lg bg-slate-100">
                      {rental.areaSqm} m²
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-slate-100">
                      {rental.bedroomsCount} {t.bedsLabel}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-slate-100">
                      {t.floorLabel} {rental.floor} {rental.hasElevator ? `(${t.elevatorShort})` : ''}
                    </span>
                  </div>
                </div>

                {/* Deposit & Commission Note */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-bold text-slate-800">{t.stayTotal}:</span>{' '}
                    {rental.refundableDepositAMD.toLocaleString()} {t.currencyAMD}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {rental.verifiedExplanation}
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {rental.pricePerMonthAMD ? (
                      <div>
                        <div className="text-xl font-black text-slate-900">
                          {rental.pricePerMonthAMD.toLocaleString()}{' '}
                          <span className="text-xs font-semibold text-blue-700">{t.currencyAMD}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {t.perMonth}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xl font-black text-slate-900">
                          {rental.pricePerNightAMD?.toLocaleString()}{' '}
                          <span className="text-xs font-semibold text-blue-700">{t.currencyAMD}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {t.perNight}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('rental-detail', { id: rental.id })}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    {t.viewPropertyButton}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
