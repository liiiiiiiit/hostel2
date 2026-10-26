import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, Building2, Home, MapPin, Search, Star, ArrowUpRight, Languages } from 'lucide-react';
import type { AppLanguage, Hostel, RentalProperty, Article, TravelPhrase } from '../types';
import { getLocalized, getCityName } from '../utils/i18n';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import { calculateNights } from '../utils/pricing';
import { PlaceActions } from '../components/PlaceActions';
import { publicSiteText } from '../i18n/publicSite';

interface Props {
  currentLang: AppLanguage;
  hostels: Hostel[];
  rentals: RentalProperty[];
  articles: Article[];
  phrases?: TravelPhrase[];
  onNavigate: (view: string, params?: any) => void;
  getHostelRating: (hostelId: string) => { avg: number; count: number };
}

function StayImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`relative overflow-hidden bg-[#e5ece5] ${className}`}>
    <Building2 aria-hidden="true" className="absolute start-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-[#aabfb0]" strokeWidth={1} />
    {src && !failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="relative size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
  </div>;
}

export const HomeView: React.FC<Props> = ({ currentLang, hostels, rentals, articles, onNavigate, getHostelRating }) => {
  const text = publicSiteText(currentLang);
  const Arrow = currentLang === 'fa' ? ArrowLeft : ArrowRight;
  const [tab, setTab] = useState<'hostels' | 'rentals'>('hostels');
  const [city, setCity] = useState('all');
  const [checkIn, setCheckIn] = useState(yerevanToday);
  const [checkOut, setCheckOut] = useState(() => addCalendarDays(yerevanToday(), 2));
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState('');
  const cities = [...new Set([...hostels.map(hostel => hostel.city), ...rentals.map(rental => rental.city)])];
  const format = (amount: number) => amount.toLocaleString(currentLang === 'fa' ? 'fa-IR' : currentLang);
  const quickDate = (offset: number) => { const start = addCalendarDays(yerevanToday(), offset); setCheckIn(start); setCheckOut(addCalendarDays(start,2)); setError(''); };
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    if (tab === 'hostels' && calculateNights(checkIn, checkOut) < 1) { setError(text.datesError); return; }
    setError(''); onNavigate(tab, tab === 'hostels' ? { city, checkIn, checkOut, guests } : { city });
  };
  const sectionHeading = (eyebrow: string, title: string, description: string, action: string, view: string) => <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p className="mb-2 text-xs font-semibold tracking-[0.13em] text-[#8e7044]">{eyebrow}</p><h2 className="text-2xl font-bold tracking-tight text-[#142f2a] sm:text-3xl">{title}</h2><p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p></div>
    <button type="button" onClick={() => onNavigate(view)} className="flex min-h-10 shrink-0 items-center gap-2 self-start text-sm font-semibold text-[#142f2a] hover:text-[#89703d] sm:self-auto">{action}<Arrow className="size-4" /></button>
  </div>;
  return <div className="pb-3">
    <section className="relative overflow-hidden bg-[#142f2a]">
      <div className="absolute inset-y-0 end-0 hidden w-[54%] overflow-hidden md:block">
        <img src="https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1400&q=85" alt="" className="size-full object-cover opacity-85" fetchPriority="high" />
        <div className={`absolute inset-0 ${currentLang === 'fa' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[#142f2a] via-[#142f2a]/15 to-transparent`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#142f2a]/35 via-transparent to-transparent" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-24 pt-12 sm:px-6 sm:pb-28 sm:pt-16 md:grid-cols-2 lg:px-8 lg:pb-32 lg:pt-20">
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-[#e4be7d]"><span className="h-px w-7 bg-[#e4be7d]" />{text.eyebrow}</div>
          <h1 className="text-[2.7rem] font-bold leading-[1.35] tracking-tight text-[#f6f7f5] sm:text-6xl sm:leading-[1.25]"><span className="block">{text.heroFirst}</span><span className="block text-[#e4be7d]">{text.heroSecond}</span></h1>
          <p className="mt-5 max-w-md text-sm leading-8 text-[#bfcec2] sm:text-base">{text.intro}</p>
          <div className="mt-7 flex items-center gap-2 text-xs text-[#b3c7b9]"><MapPin className="size-4 text-[#e4be7d]" />{text.explore}</div>
        </div>
      </div>
    </section>

    <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.4rem] border border-[#142f2a]/8 bg-white p-4 shadow-[0_16px_60px_-24px_rgba(20,47,42,0.25)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex rounded-xl bg-[#f1f4f0] p-1" role="group" aria-label={text.search}>
            {(['hostels','rentals'] as const).map(value => { const Icon = value === 'hostels' ? BedDouble : Home; return <button type="button" key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setError(''); }} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors sm:px-5 ${tab === value ? 'bg-[#142f2a] text-white shadow-sm' : 'text-slate-500 hover:text-[#142f2a]'}`}><Icon className="size-4" />{text[value]}</button>; })}
          </div>
          {tab === 'hostels' && <div className="flex items-center gap-2 text-xs text-slate-500"><span className="hidden sm:inline">{text.quickDates}</span><button type="button" onClick={() => quickDate(0)} className="rounded-lg px-2 py-2 font-medium hover:bg-slate-50 hover:text-[#142f2a]">{text.tonight}</button><span className="text-slate-200">/</span><button type="button" onClick={() => quickDate(1)} className="rounded-lg px-2 py-2 font-medium hover:bg-slate-50 hover:text-[#142f2a]">{text.tomorrow}</button></div>}
        </div>
        <form onSubmit={search} className={`grid items-end gap-3 sm:grid-cols-2 ${tab === 'hostels' ? 'lg:grid-cols-[1.2fr_1fr_1fr_.7fr_auto]' : 'lg:grid-cols-[1fr_auto]'}`}>
          <label htmlFor="home-destination" className="text-xs font-medium text-slate-500">{text.destination}<select id="home-destination" value={city} onChange={event => setCity(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#142f2a]/12 bg-[#f8faf7] px-3 text-sm font-semibold text-[#142f2a]"><option value="all">{text.allCities}</option>{cities.map(value => <option key={value} value={value}>{getCityName(value,currentLang)}</option>)}</select></label>
          {tab === 'hostels' && <>
            <label htmlFor="home-checkin" className="text-xs font-medium text-slate-500">{text.checkIn}<input id="home-checkin" type="date" required min={yerevanToday()} max={addCalendarDays(yerevanToday(),88)} value={checkIn} onChange={event => { setCheckIn(event.target.value); if (event.target.value >= checkOut) setCheckOut(addCalendarDays(event.target.value,1)); }} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[#142f2a]/12 bg-[#f8faf7] px-3 text-sm font-semibold text-[#142f2a]" /></label>
            <label htmlFor="home-checkout" className="text-xs font-medium text-slate-500">{text.checkOut}<input id="home-checkout" type="date" required min={addCalendarDays(checkIn || yerevanToday(),1)} max={addCalendarDays(yerevanToday(),89)} value={checkOut} onChange={event => setCheckOut(event.target.value)} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[#142f2a]/12 bg-[#f8faf7] px-3 text-sm font-semibold text-[#142f2a]" /></label>
            <label htmlFor="home-guests" className="text-xs font-medium text-slate-500">{text.guests}<select id="home-guests" value={guests} onChange={event => setGuests(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-[#142f2a]/12 bg-[#f8faf7] px-3 text-sm font-semibold text-[#142f2a]">{[1,2,3,4,5,6].map(value => <option key={value} value={value}>{format(value)}</option>)}</select></label>
          </>}
          <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6a65c] px-6 text-sm font-bold text-[#142f2a] transition-colors hover:bg-[#e1b876] sm:col-span-2 lg:col-span-1"><Search className="size-4" />{text.search}</button>
          {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-full">{error}</p>}
        </form>
      </div>
    </div>

    <div className="mx-auto max-w-7xl space-y-14 px-4 pt-14 sm:space-y-20 sm:px-6 sm:pt-20 lg:px-8">
      <section>
        {sectionHeading(text.hostelEyebrow,text.hostelTitle,text.hostelDesc,text.allHostels,'hostels')}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {hostels.slice(0,3).map(hostel => { const rating = getHostelRating(hostel.id); return <article key={hostel.id} className="group overflow-hidden rounded-[1.4rem] border border-[#142f2a]/10 bg-white transition-shadow hover:shadow-[0_12px_40px_-20px_rgba(20,47,42,0.25)]">
            <button type="button" onClick={() => onNavigate('hostel-detail',{id:hostel.id})} className="relative block w-full text-start" aria-label={getLocalized(hostel.name,currentLang)}><StayImage src={hostel.photos[0]} alt={getLocalized(hostel.name,currentLang)} className="aspect-[4/2.8]" /><span className="absolute bottom-4 start-4 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-[#142f2a]">{hostel.district}</span>{rating.count > 0 && <span className="absolute end-4 top-4 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#142f2a]"><Star className="size-3.5 fill-[#d6a65c] text-[#d6a65c]" />{rating.avg} <span className="font-normal text-slate-500">({rating.count})</span></span>}</button>
            <div className="p-5"><p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5" />{getCityName(hostel.city,currentLang)}</p><h3 className="min-h-14 text-lg font-semibold leading-7 text-[#142f2a]"><button type="button" onClick={() => onNavigate('hostel-detail',{id:hostel.id})} className="text-start hover:underline">{getLocalized(hostel.name,currentLang)}</button></h3><div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-500">{text.from}</p><p className="mt-1 text-lg font-bold text-[#142f2a]"><span className="ltr-isolate">{format(hostel.minPricePerNightAMD)} AMD</span><span className="ms-2 text-xs font-normal text-slate-500">{text.perNight}</span></p></div><ArrowUpRight className="mb-1 size-5 text-[#8c9f90]" /></div><PlaceActions kind="hostel" id={hostel.id} /><button type="button" onClick={() => onNavigate('hostel-detail',{id:hostel.id})} className="mt-2 min-h-11 w-full rounded-xl bg-[#f0f4ef] text-sm font-semibold text-[#142f2a] transition-colors hover:bg-[#142f2a] hover:text-white">{text.details}</button></div>
          </article>; })}
          {!hostels.length && <p className="py-10 text-sm text-slate-500">{text.noStays}</p>}
        </div>
      </section>

      {rentals.length > 0 && <section>
        {sectionHeading(text.rentalEyebrow,text.rentalTitle,text.rentalDesc,text.allRentals,'rentals')}
        <div className="grid gap-5 md:grid-cols-2">{rentals.slice(0,2).map(rental => <article key={rental.id} className="group grid overflow-hidden rounded-[1.4rem] border border-[#142f2a]/10 bg-white sm:grid-cols-[.9fr_1fr] md:grid-cols-1 lg:grid-cols-[.9fr_1fr]">
          <button type="button" onClick={() => onNavigate('rental-detail',{id:rental.id})} aria-label={getLocalized(rental.title,currentLang)} className="block min-h-56"><StayImage src={rental.photos[0]} alt={getLocalized(rental.title,currentLang)} className="h-full min-h-56" /></button>
          <div className="flex flex-col p-5"><p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5" />{rental.neighborhood}</p><h3 className="text-lg font-semibold leading-7 text-[#142f2a]">{getLocalized(rental.title,currentLang)}</h3><p className="mt-3 text-sm text-slate-500"><span className="ltr-isolate">{rental.areaSqm} m²</span></p><div className="mt-auto pt-4"><p className="text-lg font-bold text-[#142f2a]"><span className="ltr-isolate">{format(rental.pricePerNightAMD ?? rental.pricePerMonthAMD ?? 0)} AMD</span><span className="ms-2 text-xs font-normal text-slate-500">{rental.pricePerNightAMD ? text.perNight : text.perMonth}</span></p><PlaceActions kind="rental" id={rental.id} /><button type="button" onClick={() => onNavigate('rental-detail',{id:rental.id})} className="mt-1 flex min-h-10 items-center gap-2 text-sm font-semibold text-[#142f2a] hover:underline">{text.propertyDetails}<Arrow className="size-4" /></button></div></div>
        </article>)}</div>
      </section>}

      {articles.length > 0 && <section>
        {sectionHeading(text.journalEyebrow,text.journalTitle,'',text.allArticles,'guide')}
        <div className="grid gap-6 md:grid-cols-3">{articles.slice(0,3).map(article => <article key={article.id} className="group"><button type="button" className="block w-full overflow-hidden rounded-2xl text-start" onClick={() => onNavigate('article-detail',{slug:article.slug})} aria-label={article.title}><StayImage src={article.featuredImage} alt="" className="aspect-[4/2.5]" /></button><p className="mt-4 text-xs font-semibold text-[#8e7044]">{article.category}</p><h3 className="mt-2 text-base font-semibold leading-7 text-[#142f2a]"><button type="button" className="text-start hover:underline" onClick={() => onNavigate('article-detail',{slug:article.slug})}>{article.title}</button></h3><button type="button" onClick={() => onNavigate('article-detail',{slug:article.slug})} className="mt-3 flex min-h-9 items-center gap-2 text-sm text-slate-500 hover:text-[#142f2a]">{text.readArticle}<Arrow className="size-3.5" /></button></article>)}</div>
      </section>}

      <section className="flex flex-col items-start justify-between gap-6 rounded-[1.5rem] border border-[#142f2a]/10 bg-[#eaf0e7] p-6 sm:flex-row sm:items-center sm:p-9">
        <div className="flex items-center gap-5"><span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#467452] sm:flex"><Languages className="size-7" strokeWidth={1.4} /></span><div><h2 className="text-xl font-semibold text-[#142f2a]">{text.translatorTitle}</h2><p className="mt-2 text-sm leading-7 text-[#5f7566]">{text.translatorDesc}</p></div></div><button type="button" onClick={() => onNavigate('translator')} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#142f2a]/20 px-5 text-sm font-semibold text-[#142f2a] transition-colors hover:bg-[#142f2a] hover:text-white">{text.translatorAction}<Arrow className="size-4" /></button>
      </section>
    </div>
  </div>;
};
