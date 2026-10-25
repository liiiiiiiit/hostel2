import React, { useState } from 'react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { useSavedPlaces, type PlaceKey } from '../context/SavedPlacesContext';
import { PlaceActions } from '../components/PlaceActions';
import { featureText } from '../i18n/features';
import { addCalendarDays, yerevanToday } from '../utils/dates';
import { calculateNights } from '../utils/pricing';
export function SavedPlacesView({ onNavigate }: { onNavigate: (view: string, params?: unknown) => void }) {
  const { currentLang, getLocalized } = useLanguage(); const t = featureText(currentLang);
  const { saved, compared } = useSavedPlaces();
  const [checkIn, setCheckIn] = useState(yerevanToday); const [checkOut, setCheckOut] = useState(() => addCalendarDays(yerevanToday(), 2));
  const nights = calculateNights(checkIn, checkOut);
  const resolve = (key: PlaceKey) => {
    const [kind, id] = key.split(':');
    const hostel = kind === 'hostel' ? appStore.getHostelByIdOrSlug(id) : undefined;
    const rental = kind === 'rental' ? appStore.getRentalByIdOrSlug(id) : undefined;
    if (!hostel && !rental) return undefined;
    return { key, kind: kind as 'hostel' | 'rental', id, name: hostel ? getLocalized(hostel.name) : getLocalized(rental!.title), city: hostel?.city ?? rental!.city, nightly: hostel?.minPricePerNightAMD ?? rental?.pricePerNightAMD, monthly: rental?.pricePerMonthAMD, deposit: rental?.refundableDepositAMD, verified: hostel ? hostel.verification?.status === 'verified' : rental!.verifiedBadge, wifi: hostel?.amenities.wifi ?? rental!.amenities.wifi, hostel };
  };
  const selected = compared.map(resolve).filter(item => item !== undefined);
  const favourites = saved.map(resolve).filter(item => item !== undefined);
  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
    <h1 className="text-2xl font-bold">{t.saved}</h1>
    <div className="flex flex-wrap gap-4">
      <label>{t.checkIn}<input aria-label={t.checkIn} className="block p-2 border rounded-xl" type="date" value={checkIn} onChange={event => setCheckIn(event.target.value)} /></label>
      <label>{t.checkOut}<input aria-label={t.checkOut} className="block p-2 border rounded-xl" type="date" value={checkOut} onChange={event => setCheckOut(event.target.value)} /></label>
    </div>
    {selected.length > 0 && <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[550px] text-sm"><thead><tr><th className="p-4">{t.compare}</th>{selected.map(item => <th className="p-4" key={item.key}>{item.name}<PlaceActions kind={item.kind} id={item.id} /></th>)}</tr></thead><tbody>
      {([['city', t.city], ['nightly', t.nightly], ['monthly', t.monthly], ['deposit', t.deposit], ['verified', t.verified], ['wifi', t.wifi]] as const).map(([key,label]) => <tr key={key} className="border-t"><th className="p-4 text-start">{label}</th>{selected.map(item => <td className="p-4 text-center" key={item.key}>{typeof item[key] === 'boolean' ? item[key] ? t.yes : t.no : typeof item[key] === 'number' ? item[key].toLocaleString() : item[key] ?? '—'}</td>)}</tr>)}
      <tr className="border-t"><th className="p-4 text-start">{t.total} ({nights})</th>{selected.map(item => <td key={item.key} className="p-4 text-center">{nights > 0 && item.nightly ? `${(nights * item.nightly).toLocaleString()} AMD` : '—'}</td>)}</tr>
    </tbody></table><p className="p-4 text-xs text-slate-500">{t.feesNotice}</p></div>}
    {!favourites.length && <p>{t.empty}</p>}
    <div className="grid md:grid-cols-3 gap-4">{favourites.map(item => <div className="p-5 bg-white border rounded-2xl" key={item.key}><button className="font-bold underline" onClick={() => onNavigate(item.kind === 'hostel' ? 'hostel-detail' : 'rental-detail', { id: item.id })}>{item.name}</button><PlaceActions kind={item.kind} id={item.id} /></div>)}</div>
  </div>;
}
