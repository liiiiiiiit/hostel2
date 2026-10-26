import React, { useState } from 'react';
import { ArrowUpRight, Heart, Columns3 } from 'lucide-react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { useSavedPlaces, type PlaceKey } from '../context/SavedPlacesContext';
import { PlaceActions } from '../components/PlaceActions';
import { featureText } from '../i18n/features';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import { calculateNights } from '../utils/pricing';

export function SavedPlacesView({ onNavigate }: { onNavigate: (view: string, params?: unknown) => void }) {
  const { currentLang, getLocalized } = useLanguage(), t = featureText(currentLang);
  const { saved, compared, toggleSaved, toggleCompared } = useSavedPlaces();
  const [checkIn, setCheckIn] = useState(yerevanToday), [checkOut, setCheckOut] = useState(() => addCalendarDays(yerevanToday(), 2));
  const nights = calculateNights(checkIn, checkOut);
  const copy = {
    fa: { subtitle: 'گزینه‌های دلخواهتان را نگه دارید و با هم مقایسه کنید.', comparison: 'مقایسهٔ اقامتگاه‌ها', comparisonHint: 'از دکمهٔ مقایسه روی کارت‌ها استفاده کنید؛ حداکثر ۳ گزینه.', favourites: 'علاقه‌مندی‌های شما', browse: 'مشاهدهٔ اقامتگاه‌ها', open: 'مشاهدهٔ جزئیات', unavailable: 'این اقامتگاه دیگر در دسترس نیست.', empty: 'برای سفر بعدی‌تان انتخاب کنید', emptyHint: 'با لمس نشان قلب، اقامتگاه را اینجا ذخیره کنید.', invalid: 'تاریخ خروج باید بعد از ورود باشد.' },
    en: { subtitle: 'Keep your favourites together and compare the details.', comparison: 'Compare your shortlist', comparisonHint: 'Use Compare on a stay card to choose up to 3 places.', favourites: 'Your saved stays', browse: 'Explore stays', open: 'View details', unavailable: 'This stay is no longer available.', empty: 'Start your next trip here', emptyHint: 'Tap the heart on a stay to save it here.', invalid: 'Check-out must be after check-in.' },
    ru: { subtitle: 'Сохраните любимые варианты и сравните детали.', comparison: 'Сравните варианты', comparisonHint: 'Выберите до 3 объектов кнопкой сравнения на карточке.', favourites: 'Сохранённое', browse: 'Найти жильё', open: 'Подробнее', unavailable: 'Этот объект больше недоступен.', empty: 'Начните планировать поездку', emptyHint: 'Нажмите на сердце, чтобы сохранить вариант.', invalid: 'Выезд должен быть позже заезда.' },
    hy: { subtitle: 'Պահպանեք նախընտրած տարբերակներն ու համեմատեք։', comparison: 'Համեմատեք ձեր ընտրածը', comparisonHint: 'Համեմատելու կոճակով ընտրեք մինչև 3 կացություն։', favourites: 'Ձեր պահպանվածը', browse: 'Գտնել կացություն', open: 'Մանրամասներ', unavailable: 'Այս կացությունն այլևս հասանելի չէ։', empty: 'Պլանավորեք հաջորդ ուղևորությունը', emptyHint: 'Սրտի նշանով պահպանեք կացությունն այստեղ։', invalid: 'Ելքը պետք է լինի մուտքից հետո։' },
  }[currentLang];
  const resolve = (key: PlaceKey) => {
    const [kind,id] = key.split(':');
    const hostel = kind==='hostel' ? appStore.getHostelByIdOrSlug(id) : undefined;
    const rental = kind==='rental' ? appStore.getRentalByIdOrSlug(id) : undefined;
    if (!hostel?.isPublished && rental?.status!=='published') return undefined;
    return { key, kind: kind as 'hostel'|'rental', id, photo: hostel?.photos[0] ?? rental?.photos[0], name: hostel ? getLocalized(hostel.name) : getLocalized(rental!.title), city: hostel?.city ?? rental!.city, nightly: hostel?.minPricePerNightAMD ?? rental?.pricePerNightAMD, monthly: rental?.pricePerMonthAMD, deposit: rental?.refundableDepositAMD, verified: hostel ? hostel.verification?.status==='verified' : rental!.verifiedBadge, wifi: hostel?.amenities.wifi ?? rental!.amenities.wifi };
  };
  const selected=compared.map(resolve).filter(item=>item!==undefined), favourites=saved.map(resolve).filter(item=>item!==undefined);
  const unavailable=saved.filter(key=>!resolve(key));
  const open=(item: NonNullable<ReturnType<typeof resolve>>)=>onNavigate(item.kind==='hostel'?'hostel-detail':'rental-detail',{id:item.id,checkIn,checkOut});
  return <div className="page-shell py-8 sm:py-12 space-y-9">
    <header className="space-y-3"><p className="eyebrow">YEREVANHUB</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t.saved}</h1><p className="text-slate-500">{copy.subtitle}</p></header>
    <section className="space-y-4" aria-labelledby="comparison-title"><div className="flex gap-3 items-center"><Columns3 size={21}/><h2 id="comparison-title" className="text-xl font-semibold">{copy.comparison}</h2><span className="text-sm text-slate-400">{selected.length} / 3</span></div>
      {!selected.length ? <div className="surface p-5 text-sm text-slate-500">{copy.comparisonHint}</div> : <div className="surface overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4"><label htmlFor="compare-in" className="text-sm font-medium">{t.checkIn}<input id="compare-in" aria-label={t.checkIn} className="field mt-2" type="date" min={yerevanToday()} max={addCalendarDays(yerevanToday(),88)} value={checkIn} onChange={event=>{setCheckIn(event.target.value);if(event.target.value&&event.target.value>=checkOut)setCheckOut(addCalendarDays(event.target.value,1));}}/></label><label htmlFor="compare-out" className="text-sm font-medium">{t.checkOut}<input id="compare-out" aria-label={t.checkOut} className="field mt-2" type="date" min={addCalendarDays(checkIn||yerevanToday(),1)} max={addCalendarDays(yerevanToday(),89)} value={checkOut} onChange={event=>setCheckOut(event.target.value)}/></label></div>
        {nights<1&&<p role="alert" className="px-5 pt-4 text-sm text-red-700">{copy.invalid}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-sm"><thead><tr><th scope="col" className="p-5 text-start text-slate-500 font-medium">{t.compare}</th>{selected.map(item=><th scope="col" className="p-5 min-w-52 text-start" key={item.key}><button className="font-semibold text-base text-start hover:text-emerald-800" onClick={()=>open(item)}>{item.name}</button><button className="block mt-3 text-xs text-slate-400 underline" onClick={()=>toggleCompared(item.key)}>{t.remove}</button></th>)}</tr></thead><tbody>
          {([['city',t.city],['nightly',t.nightly],['monthly',t.monthly],['deposit',t.deposit],['verified',t.verified],['wifi',t.wifi]] as const).map(([key,label])=><tr key={key} className="border-t border-slate-100 even:bg-slate-50/40"><th scope="row" className="p-5 text-start font-medium text-slate-500">{label}</th>{selected.map(item=><td className="p-5 text-start" key={item.key}>{typeof item[key]==='boolean'?item[key]?t.yes:t.no:typeof item[key]==='number'?item[key].toLocaleString():item[key]??'—'}</td>)}</tr>)}
          <tr className="border-t border-slate-100 bg-emerald-50/30"><th scope="row" className="p-5 text-start font-semibold">{t.total} · {nights}</th>{selected.map(item=><td key={item.key} className="p-5 font-semibold">{nights>0&&item.nightly!==undefined?`${(nights*item.nightly).toLocaleString()} AMD`:'—'}</td>)}</tr>
        </tbody></table></div><p className="p-5 text-xs text-slate-500 border-t border-slate-100 leading-relaxed">{t.feesNotice}</p>
      </div>}
    </section>
    <section className="space-y-4" aria-labelledby="saved-title"><h2 id="saved-title" className="text-xl font-semibold">{copy.favourites} <span className="text-slate-400 font-normal">({favourites.length})</span></h2>
      {!favourites.length&&<div className="surface py-14 px-6 text-center space-y-4"><Heart className="mx-auto text-slate-300" size={34}/><h3 className="text-xl font-semibold">{copy.empty}</h3><p className="text-slate-500 text-sm">{copy.emptyHint}</p><button className="button-primary mx-auto" onClick={()=>onNavigate('hostels')}>{copy.browse}<ArrowUpRight size={17}/></button></div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{favourites.map(item=><article key={item.key} className="surface overflow-hidden"><img src={item.photo} alt={item.name} className="aspect-[16/10] w-full object-cover bg-slate-100" loading="lazy"/><div className="p-5 space-y-3"><p className="eyebrow">{item.city}</p><button type="button" className="text-lg font-semibold text-start hover:text-emerald-800" onClick={()=>open(item)}>{item.name}</button><PlaceActions kind={item.kind} id={item.id}/></div></article>)}</div>
      {unavailable.map(key=><div key={key} className="surface p-4 flex gap-3 items-center justify-between text-sm text-slate-500"><span>{copy.unavailable}</span><button className="underline" onClick={()=>{toggleSaved(key);if(compared.includes(key))toggleCompared(key);}}>{t.remove}</button></div>)}
    </section>
  </div>;
}
