import { publicSiteText } from '../i18n/publicSite';
import { stayExperience } from '../i18n/stayExperience';
import { StayPhoto } from '../components/StayPhoto';
import { PublicPreviewNotice } from '../components/PublicPreviewNotice';
import {workflowText} from '../i18n/workflows';
import { calculateBookingPrice } from '../utils/pricing';
import { requiredUnits } from '../utils/occupancy';
import React, { useMemo, useState } from 'react';
import { Building2, MapPin, SlidersHorizontal, Star, Wifi, Lock, ArrowUpRight, X, BedDouble, DoorOpen, Users } from 'lucide-react';
import type { AppLanguage, Hostel } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { featureText } from '../i18n/features';
import { getLocalized, getCityName, getAmenityLabel, getRoomTypeFilterName } from '../utils/i18n';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import { calculateNights } from '../utils/pricing';
import { appStore } from '../services/store';
import { PlaceActions } from '../components/PlaceActions';

interface Props {
  currentLang: AppLanguage; hostels: Hostel[]; onNavigate: (view: string, params?: any) => void;
  getHostelRating: (id: string) => { avg: number; count: number }; initialFilter?: any;
}
const TEXT = {
  fa: { title: 'اقامت مناسب سفر شما', subtitle: 'تاریخ و نیازتان را انتخاب کنید؛ گزینه‌های موجود را ببینید.', results: 'اقامتگاه موجود', empty: 'اقامتگاهی با این شرایط پیدا نشد', emptyHint: 'تاریخ یا فیلترها را تغییر دهید.', perNight: 'هر شب', room: 'نوع اقامت', maxNightly: 'بودجهٔ هر شب', tonight: 'ظرفیت امشب', noReviews: 'بدون نظر ثبت‌شده', filters: 'فیلترهای بیشتر', less: 'بستن فیلترها', nights: 'شب', invalid: 'تاریخ خروج باید بعد از تاریخ ورود باشد.' },
  en: { title: 'Find your place in Armenia', subtitle: 'Choose your dates and find a stay that fits.', results: 'stays available', empty: 'No stays match these choices', emptyHint: 'Try different dates or fewer filters.', perNight: 'per night', room: 'Stay type', maxNightly: 'Nightly budget', tonight: 'Available tonight', noReviews: 'No reviews yet', filters: 'More filters', less: 'Hide filters', nights: 'nights', invalid: 'Check-out must be after check-in.' },
  ru: { title: 'Ваше место в Армении', subtitle: 'Выберите даты и подходящий вариант проживания.', results: 'вариантов доступно', empty: 'Нет подходящих вариантов', emptyHint: 'Измените даты или фильтры.', perNight: 'за ночь', room: 'Тип проживания', maxNightly: 'Бюджет за ночь', tonight: 'Есть места сегодня', noReviews: 'Пока нет отзывов', filters: 'Все фильтры', less: 'Скрыть фильтры', nights: 'ночей', invalid: 'Выезд должен быть позже заезда.' },
  hy: { title: 'Գտեք ձեր տեղը Հայաստանում', subtitle: 'Ընտրեք ամսաթվերն ու ձեզ հարմար տարբերակը։', results: 'հասանելի տարբերակ', empty: 'Հարմար տարբերակ չկա', emptyHint: 'Փոխեք ամսաթվերը կամ ֆիլտրերը։', perNight: 'մեկ գիշեր', room: 'Կացության տեսակ', maxNightly: 'Գիշերվա բյուջե', tonight: 'Հասանելի է այսօր', noReviews: 'Կարծիքներ դեռ չկան', filters: 'Այլ ֆիլտրեր', less: 'Թաքցնել ֆիլտրերը', nights: 'գիշեր', invalid: 'Ելքը պետք է լինի մուտքից հետո։' },
};

export const HostelsView: React.FC<Props> = ({ currentLang, hostels, onNavigate, getHostelRating, initialFilter }) => {
  const t = UI_TRANSLATIONS[currentLang], ft = featureText(currentLang), copy = TEXT[currentLang];
  const design = stayExperience(currentLang);
  const [checkIn, setCheckIn] = useState(initialFilter?.checkIn || yerevanToday());
  const [checkOut, setCheckOut] = useState(initialFilter?.checkOut || addCalendarDays(initialFilter?.checkIn || yerevanToday(), 2));
  const [quantity, setQuantity] = useState(initialFilter?.guests || 1);
  const [city, setCity] = useState(initialFilter?.city || 'all');
  const [district, setDistrict] = useState(initialFilter?.district || 'all');
  const [roomType, setRoomType] = useState(initialFilter?.type||'all');
  const [maxPrice, setMaxPrice] = useState<number|null>(initialFilter?.budget??null);
  const [amenities, setAmenities] = useState<string[]>((initialFilter?.amenities||'').split(',').filter((key:string)=>['kitchen','metro','monthly','24h','elevator','coworking','tonight'].includes(key)));
  const [sort, setSort] = useState('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const nights = calculateNights(checkIn, checkOut);
  const quote=(room:Hostel['roomTypes'][number])=>calculateBookingPrice({pricePerNight:room.pricePerNightAMD,checkIn,checkOut,quantity:requiredUnits(room,quantity)??0,rules:room.pricingRules});
  const rooms=(hostel:Hostel)=>hostel.roomTypes.filter(room=>(roomType==='all'||room.type===roomType)&&quote(room).isValidDates&&(maxPrice===null||quote(room).finalAmountToPayOnArrival/nights<=maxPrice)&&appStore.remainingCapacity(hostel,room.id,checkIn,checkOut)>=(requiredUnits(room,quantity)??Infinity));
  const bestRoom=(hostel:Hostel)=>rooms(hostel).sort((a,b)=>quote(a).finalAmountToPayOnArrival-quote(b).finalAmountToPayOnArrival)[0];
  const nightly=(hostel:Hostel)=>{const room=bestRoom(hostel);return room?quote(room).finalAmountToPayOnArrival/nights:Infinity;};
  const filtered = useMemo(() => hostels.filter(h => {
    if (nights < 1 || quantity < 1 || !Number.isInteger(quantity) || (!h.publicPreview && !rooms(h).length)) return false;
    if (city !== 'all' && h.city.toLowerCase() !== city.toLowerCase()) return false;
    if (district !== 'all' && h.district !== district) return false;
    if (h.publicPreview) return roomType === 'all' && maxPrice === null && amenities.length === 0;
    return amenities.every(key => key === 'kitchen' ? h.amenities.kitchen : key === 'metro' ? h.nearMetro : key === 'monthly' ? h.monthlyStayAvailable : key === '24h' ? h.reception24h : key === 'elevator' ? h.amenities.elevator : key === 'coworking' ? h.amenities.coworking : h.roomTypes.some(room => appStore.remainingCapacity(h, room.id, yerevanToday(), addCalendarDays(yerevanToday(),1)) >= quantity));
  }).sort((a,b) => sort === 'price_asc' ? nightly(a)-nightly(b) : sort === 'price_desc' ? nightly(b)-nightly(a) : sort === 'rating' ? getHostelRating(b.id).avg-getHostelRating(a.id).avg : 0),
  [hostels, checkIn, checkOut, quantity, city, district, roomType, maxPrice, amenities, sort, getHostelRating]);
  const budgetMax=Math.ceil(Math.max(30000,...hostels.flatMap(hostel=>hostel.roomTypes.map(room=>{const amount=quote(room).finalAmountToPayOnArrival/Math.max(1,nights);return Number.isFinite(amount)?amount:0;})))/1000)*1000;
  const clear = () => { setCity('all'); setDistrict('all'); setRoomType('all'); setMaxPrice(null); setAmenities([]); };
  const filterCount = amenities.length + Number(city !== 'all') + Number(district !== 'all') + Number(roomType !== 'all') + Number(maxPrice !== null);
  const toggle = (key: string) => setAmenities(items => items.includes(key) ? items.filter(item => item !== key) : [...items,key]);
  const options = [['kitchen',ft.kitchen],['metro',ft.metro],['monthly',ft.monthlyStay],['24h',t.reception24hBadge],['elevator',getAmenityLabel('elevator',currentLang)],['coworking',getAmenityLabel('coworking',currentLang)],['tonight',copy.tonight]];
  const activeFilters = [
    ...(city !== 'all' ? [{ key: 'city', label: getCityName(city,currentLang), remove: () => { setCity('all'); setDistrict('all'); } }] : []),
    ...(district !== 'all' ? [{ key: 'district', label: district, remove: () => setDistrict('all') }] : []),
    ...(roomType !== 'all' ? [{ key: 'room', label: getRoomTypeFilterName(roomType,currentLang), remove: () => setRoomType('all') }] : []),
    ...(maxPrice !== null ? [{ key: 'budget', label: `${copy.maxNightly}: ${maxPrice.toLocaleString(currentLang)} AMD`, remove: () => setMaxPrice(null) }] : []),
    ...amenities.map(key => ({ key, label: options.find(option => option[0] === key)?.[1] || key, remove: () => toggle(key) })),
  ];
  const openStay = (hostel: Hostel) => onNavigate('hostel-detail', {id:hostel.id,checkIn,checkOut,guests:quantity,city,district,type:roomType,budget:maxPrice??undefined,amenities:amenities.join(','),roomTypeId:bestRoom(hostel)?.id});
  return <div className="page-shell py-8 sm:py-12 space-y-7">
    <header className="max-w-2xl space-y-3"><p className="eyebrow">{t.navHostels}</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{copy.title}</h1><p className="text-slate-500 text-base leading-relaxed">{copy.subtitle}</p></header>
    <div className="flex flex-wrap gap-2" role="group" aria-label={copy.room}>
      {([{value:'all',label:design.all,Icon:BedDouble},{value:'private',label:design.private,Icon:DoorOpen},{value:'dorm_female',label:design.female,Icon:Users},{value:'dorm_mixed',label:design.shared,Icon:BedDouble}]).map(({value,label,Icon}) => <button key={value} type="button" className="stay-category" aria-pressed={roomType===value} onClick={()=>setRoomType(value)}><Icon size={17}/>{label}</button>)}
    </div>
    <section className="surface p-4 sm:p-5 space-y-4" aria-label={t.searchButton}>
      <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.7fr_auto] gap-3 items-end">
        <label htmlFor="stay-city" className="text-sm font-medium">{t.cityLabel}<select id="stay-city" className="field mt-2" value={city} onChange={event => { setCity(event.target.value); setDistrict('all'); }}><option value="all">{t.allCities}</option>{[...new Set(hostels.map(h=>h.city))].map(item=><option key={item} value={item}>{getCityName(item,currentLang)}</option>)}</select></label>
        <label htmlFor="stay-check-in" className="date-field-label text-sm font-medium">{ft.checkIn}<input id="stay-check-in" aria-label={ft.checkIn} type="date" min={yerevanToday()} max={addCalendarDays(yerevanToday(),88)} className="field mt-2" value={checkIn} onChange={event=>{setCheckIn(event.target.value);if(event.target.value && event.target.value >= checkOut)setCheckOut(addCalendarDays(event.target.value,1));}} /></label>
        <label htmlFor="stay-check-out" className="date-field-label text-sm font-medium">{ft.checkOut}<input id="stay-check-out" aria-label={ft.checkOut} type="date" min={addCalendarDays(checkIn || yerevanToday(),1)} max={addCalendarDays(yerevanToday(),89)} className="field mt-2" value={checkOut} onChange={event=>setCheckOut(event.target.value)} /></label>
        <label htmlFor="stay-quantity" className="text-sm font-medium">{publicSiteText(currentLang).guests}<input id="stay-quantity" className="field mt-2" type="number" min={1} max={100} value={quantity} onChange={event=>setQuantity(Number(event.target.value))}/></label>
        <button type="button" className="button-secondary col-span-2 lg:col-span-1" aria-expanded={filtersOpen} aria-controls="stay-extra-filters" onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17}/>{filtersOpen ? copy.less : copy.filters}{filterCount > 0 && <span className="rounded-full bg-slate-100 px-2">{filterCount}</span>}</button>
      </div>
      {filtersOpen && <div id="stay-extra-filters" className="border-t border-slate-100 pt-5 space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <label htmlFor="stay-district" className="text-sm">{ft.location}<select id="stay-district" className="field mt-2" value={district} onChange={event=>setDistrict(event.target.value)}><option value="all">{t.allCities}</option>{[...new Set(hostels.filter(h=>city==='all'||h.city===city).map(h=>h.district))].map(value=><option key={value}>{value}</option>)}</select></label>
          <label htmlFor="stay-room-type" className="text-sm">{copy.room}<select id="stay-room-type" className="field mt-2" value={roomType} onChange={event=>setRoomType(event.target.value)}>{['all','dorm_mixed','dorm_female','dorm_male','private'].map(value=><option key={value} value={value}>{getRoomTypeFilterName(value,currentLang)}</option>)}</select></label>
          <label htmlFor="stay-budget" className="text-sm">{copy.maxNightly}<div className="mt-3 font-semibold ltr-isolate">{maxPrice===null?workflowText(currentLang)('all'):maxPrice.toLocaleString()+' AMD'}</div><input id="stay-budget" className="w-full accent-emerald-700 mt-3" type="range" min={0} max={budgetMax} step={1000} value={maxPrice??budgetMax} onChange={event=>setMaxPrice(Number(event.target.value))}/></label>
        </div>
        <div className="flex gap-3 flex-wrap">{options.map(([key,label])=><label key={key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm cursor-pointer"><input type="checkbox" checked={amenities.includes(key)} onChange={()=>toggle(key)}/>{label}</label>)}</div>
        <button type="button" className="text-sm underline underline-offset-4" onClick={clear}>{t.clearFilters}</button>
      </div>}
      {nights < 1 && <p role="alert" className="text-sm text-red-700">{copy.invalid}</p>}
    </section>
    {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2">{activeFilters.map(filter => <button key={filter.key} type="button" className="active-filter" aria-label={`${design.remove}: ${filter.label}`} onClick={filter.remove}>{filter.label}<X size={14}/></button>)}<button type="button" className="min-h-11 px-2 text-sm underline underline-offset-4" onClick={clear}>{t.clearFilters}</button></div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-slate-500"><strong className="text-xl text-slate-900">{filtered.length.toLocaleString(currentLang)}</strong> {copy.results}</p><button type="button" className="mt-1 min-h-11 text-xs text-slate-600 underline underline-offset-4" onClick={()=>onNavigate('recommendations',{checkIn,checkOut,guests:quantity,type:roomType,city,district,budget:maxPrice??undefined,amenities:amenities.join(',')})}>{workflowText(currentLang)('recommend')}</button></div>
      <label className="flex min-w-0 max-w-full items-center gap-2 text-sm" htmlFor="stay-sort"><span className="hidden sm:inline text-slate-500">{t.sortByLabel}</span><select id="stay-sort" className="field !w-auto max-w-full" value={sort} onChange={event=>setSort(event.target.value)}><option value="recommended">{t.sortRecommended}</option><option value="price_asc">{t.sortPriceAsc}</option><option value="price_desc">{t.sortPriceDesc}</option><option value="rating">{t.sortRating}</option></select></label>
    </div>
    {!filtered.length ? <div className="surface px-6 py-16 text-center space-y-3"><Building2 className="mx-auto text-slate-400" size={36}/><h2 className="text-xl font-semibold">{copy.empty}</h2><p className="text-slate-500">{copy.emptyHint}</p><button type="button" className="button-secondary mx-auto" onClick={clear}>{t.clearFilters}</button></div> : <div className="grid gap-5">{filtered.map(hostel=>{
      const rating=getHostelRating(hostel.id),name=getLocalized(hostel.name,currentLang),price=nightly(hostel);
      return <article key={hostel.id} className="stay-result surface overflow-hidden grid md:grid-cols-[32%_1fr] group">
        <button type="button" onClick={()=>openStay(hostel)} aria-label={name} className="relative min-h-56 overflow-hidden text-start"><StayPhoto src={hostel.photos[0]} alt={name} className="aspect-[16/10] h-full md:aspect-auto"/>{hostel.verification?.status==='verified' && <span className="absolute top-4 start-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-800">✓ {ft.verified}</span>}</button>
        <div className="p-5 sm:p-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow">{getCityName(hostel.city,currentLang)} · {hostel.district}</p><span className="inline-flex items-center gap-1 text-sm text-slate-500">{rating.count>0 ? <><Star size={15} className="text-amber-600 fill-amber-500"/><strong className="text-slate-900">{rating.avg}</strong> ({rating.count})</> : copy.noReviews}</span></div>
          <div><h2><button type="button" className="text-start text-xl sm:text-2xl font-semibold hover:text-emerald-800" onClick={()=>openStay(hostel)}>{name}</button></h2><p className="mt-2 text-sm text-slate-500 flex gap-1.5"><MapPin size={16} className="shrink-0 mt-0.5"/>{getLocalized(hostel.address,currentLang)}</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">{hostel.amenities.wifi&&<span className="inline-flex gap-1.5 items-center"><Wifi size={16}/>{getAmenityLabel('wifi',currentLang)}</span>}{hostel.amenities.lockers&&<span className="inline-flex gap-1.5 items-center"><Lock size={16}/>{getAmenityLabel('lockers',currentLang)}</span>}{hostel.reception24h&&<span>{t.reception24hBadge}</span>}</div>
          <div className="mt-auto border-t border-slate-100 pt-4 flex flex-wrap gap-4 justify-between items-end">{hostel.publicPreview ? <PublicPreviewNotice lang={currentLang}/> : <div><div className="text-2xl font-semibold tracking-tight ltr-isolate">{(price*nights).toLocaleString()} <span className="text-sm font-normal text-slate-500">AMD</span></div><p className="text-sm text-slate-500 mt-1">{ft.total} · {nights} {copy.nights}</p><p className="text-xs text-slate-400 mt-1 ltr-isolate">{price.toLocaleString()} AMD / {copy.perNight}</p></div>}<div className="flex flex-wrap items-center gap-3"><PlaceActions kind="hostel" id={hostel.id}/><button type="button" className="button-primary" onClick={()=>openStay(hostel)}>{hostel.publicPreview ? ({fa: 'مشاهدهٔ اطلاعات', en: 'View information', ru: 'Информация', hy: 'Տեղեկություններ'}[currentLang]) : t.detailsButton}<ArrowUpRight size={17}/></button></div></div>
        </div>
      </article>;
    })}</div>}
    <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">{ft.feesNotice}</p>
  </div>;
};
