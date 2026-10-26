import React, { useMemo, useState } from 'react';
import { Building2, BedDouble, MapPin, SlidersHorizontal, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { AppLanguage, RentalProperty } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { getCityName, getLocalized } from '../utils/i18n';
import { PlaceActions } from '../components/PlaceActions';

interface Props { currentLang: AppLanguage; rentals: RentalProperty[]; onNavigate: (view: string, params?: any) => void; initialFilter?: any }
const COPY = {
  fa: { title: 'خانه‌ای برای ماندن', intro: 'اجارهٔ کوتاه‌مدت و ماهانه، با شرایط روشن.', all: 'همه', bedrooms: 'اتاق خواب', pets: 'حیوان خانگی مجاز', elevator: 'آسانسور', reset: 'پاک‌کردن فیلترها', empty: 'ملکی با این شرایط پیدا نشد.', results: 'اقامتگاه', deposit: 'ودیعه', perMonth: 'در ماه', perNight: 'هر شب', details: 'مشاهدهٔ ملک', checked: 'بررسی‌شده' },
  en: { title: 'A place to settle in', intro: 'Short stays and monthly rentals, with clear terms.', all: 'All', bedrooms: 'Bedrooms', pets: 'Pets welcome', elevator: 'Elevator', reset: 'Clear filters', empty: 'No properties match these filters.', results: 'stays', deposit: 'Deposit', perMonth: 'per month', perNight: 'per night', details: 'View property', checked: 'Reviewed' },
  ru: { title: 'Место, где можно обосноваться', intro: 'Посуточная и помесячная аренда с понятными условиями.', all: 'Все', bedrooms: 'Спальни', pets: 'Можно с питомцами', elevator: 'Лифт', reset: 'Сбросить фильтры', empty: 'По этим фильтрам ничего не найдено.', results: 'вариантов', deposit: 'Залог', perMonth: 'в месяц', perNight: 'за ночь', details: 'Посмотреть объект', checked: 'Проверено' },
  hy: { title: 'Տուն՝ հարմարավետ կացության համար', intro: 'Կարճաժամկետ և ամսական վարձակալություն՝ հստակ պայմաններով։', all: 'Բոլորը', bedrooms: 'Ննջասենյակներ', pets: 'Կենդանիները թույլատրվում են', elevator: 'Վերելակ', reset: 'Մաքրել զտիչները', empty: 'Այս պայմաններով տարբերակներ չկան։', results: 'տարբերակ', deposit: 'Ավանդ', perMonth: 'ամսական', perNight: 'մեկ գիշեր', details: 'Դիտել բնակարանը', checked: 'Ստուգված' },
};
export const RentalsView: React.FC<Props> = ({ currentLang, rentals, onNavigate, initialFilter }) => {
  const t = UI_TRANSLATIONS[currentLang]; const c = COPY[currentLang];
  const [rentalType, setRentalType] = useState(initialFilter?.type || 'all');
  const [city, setCity] = useState(initialFilter?.city || 'all');
  const [bedrooms, setBedrooms] = useState(0);
  const [onlyVerified, setOnlyVerified] = useState(false); const [onlyPetFriendly, setOnlyPetFriendly] = useState(false); const [onlyElevator, setOnlyElevator] = useState(false);
  const filtered = useMemo(() => rentals.filter(r =>
    (city === 'all' || r.city.toLowerCase() === city.toLowerCase()) &&
    (rentalType === 'all' || r.rentalType === 'both' || r.rentalType === rentalType) &&
    r.bedroomsCount >= bedrooms && (!onlyVerified || r.verifiedBadge) && (!onlyPetFriendly || r.amenities.petFriendly) && (!onlyElevator || r.hasElevator)),
  [rentals, city, rentalType, bedrooms, onlyVerified, onlyPetFriendly, onlyElevator]);
  const clear = () => { setCity('all'); setRentalType('all'); setBedrooms(0); setOnlyVerified(false); setOnlyPetFriendly(false); setOnlyElevator(false); };
  return <div className="page-shell space-y-8 py-8 sm:py-12">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3"><p className="eyebrow">{t.navRentals}</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{c.title}</h1><p className="text-slate-500 max-w-xl">{c.intro}</p></div>
      <div className="inline-flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-2xl" aria-label={t.navRentals}>
        {[['all',c.all],['short_term',t.shortTermRental],['long_term',t.longTermRental]].map(([value,label]) => <button key={value} type="button" aria-pressed={rentalType===value} onClick={() => setRentalType(value)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${rentalType===value ? 'bg-[#142f2a] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
      </div>
    </header>
    <section className="surface p-5 space-y-4" aria-label={t.filtersLabel}>
      <div className="flex flex-wrap items-end gap-4">
        <SlidersHorizontal className="w-5 h-5 text-slate-400 self-center hidden sm:block" />
        <label htmlFor="rental-filter-city" className="space-y-1.5 text-sm flex-1 min-w-[130px]"><span className="text-slate-500">{t.cityLabel}</span><select id="rental-filter-city" className="field w-full" value={city} onChange={e => setCity(e.target.value)}><option value="all">{t.allCities}</option>{Array.from(new Set(rentals.map(r=>r.city))).map(value=><option key={value} value={value}>{getCityName(value,currentLang)}</option>)}</select></label>
        <label htmlFor="rental-filter-bedrooms" className="space-y-1.5 text-sm flex-1 min-w-[130px]"><span className="text-slate-500">{c.bedrooms}</span><select id="rental-filter-bedrooms" className="field w-full" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))}><option value={0}>{c.all}</option>{[1,2,3].map(n=><option key={n} value={n}>{n}+</option>)}</select></label>
        <button className="button-secondary text-sm" type="button" onClick={clear}>{c.reset}</button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm border-t border-slate-100 pt-4">
        {[[onlyVerified,setOnlyVerified,c.checked],[onlyPetFriendly,setOnlyPetFriendly,c.pets],[onlyElevator,setOnlyElevator,c.elevator]].map(([checked,setter,label])=><label key={String(label)} className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#142f2a] w-4 h-4" checked={checked as boolean} onChange={e=>(setter as (value:boolean)=>void)(e.target.checked)} /><span>{label as string}</span></label>)}
      </div>
    </section>
    <p className="text-sm text-slate-500" aria-live="polite">{filtered.length.toLocaleString(currentLang)} {c.results}</p>
    {!filtered.length && <div className="surface p-12 text-center space-y-4"><Building2 className="w-9 h-9 mx-auto text-slate-300" /><p className="text-lg">{c.empty}</p><button className="button-secondary" onClick={clear}>{c.reset}</button></div>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{filtered.map(rental=>{
      const title=getLocalized(rental.title,currentLang);
      const monthly = rentalType !== 'short_term' && Boolean(rental.pricePerMonthAMD);
      const price = monthly ? rental.pricePerMonthAMD : rental.pricePerNightAMD ?? rental.pricePerMonthAMD;
      return <article key={rental.id} className="surface overflow-hidden group flex flex-col">
        <button type="button" aria-label={title} className="relative block w-full aspect-[4/3] overflow-hidden bg-slate-100" onClick={()=>onNavigate('rental-detail',{id:rental.id})}>
          {rental.photos[0] && <img src={rental.photos[0]} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
          {rental.verifiedBadge && <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 bg-white/95 rounded-full px-3 py-1.5 text-xs font-semibold"><ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />{c.checked}</span>}
        </button>
        <div className="p-5 space-y-4 flex-1 flex flex-col">
          <div className="space-y-2"><p className="text-sm text-slate-500 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{getCityName(rental.city,currentLang)} · {rental.neighborhood}</p><h2 className="text-xl font-semibold leading-snug"><button className="text-start hover:text-emerald-800" onClick={()=>onNavigate('rental-detail',{id:rental.id})}>{title}</button></h2></div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500"><span>{rental.areaSqm} m²</span><span className="inline-flex items-center gap-1.5"><BedDouble className="w-4 h-4" />{rental.bedroomsCount} {c.bedrooms}</span><span>{t.floorLabel} {rental.floor}</span></div>
          <div className="pt-4 mt-auto border-t border-slate-100"><p className="text-2xl font-semibold tabular-nums">{price?.toLocaleString(currentLang) ?? '—'} <span className="text-sm font-normal text-slate-500">AMD / {monthly ? c.perMonth : c.perNight}</span></p><p className="text-sm text-slate-500 mt-1">{c.deposit}: {rental.refundableDepositAMD.toLocaleString(currentLang)} AMD</p></div>
          <PlaceActions kind="rental" id={rental.id} />
          <button className="button-primary w-full flex items-center justify-between" onClick={()=>onNavigate('rental-detail',{id:rental.id})}>{c.details}<ArrowUpRight className="w-4 h-4" /></button>
        </div>
      </article>;
    })}</div>
  </div>;
};
