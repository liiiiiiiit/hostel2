import React, { useState } from 'react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { featureText } from '../i18n/features';
import { addCalendarDays, yerevanToday } from '../utils/dates';
export function PropertyOperationsPanel() {
  const { currentLang, getLocalized } = useLanguage(); const t = featureText(currentLang);
  const state = appStore.getState(); const admin = state.currentUser?.role === 'admin';
  const hostels = state.hostels.filter(h => admin || state.currentUser?.assignedHostelIds?.includes(h.id));
  const [hostelId, setHostel] = useState(hostels[0]?.id ?? '');
  const hostel = hostels.find(h => h.id === hostelId);
  const [roomId, setRoom] = useState(hostel?.roomTypes[0]?.id ?? '');
  const [date, setDate] = useState(yerevanToday);
  const [capacity, setCapacity] = useState(0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [queue, setQueue] = useState<{ notifications?: { status: string; count: number }[]; configured?: { email: boolean; telegram: boolean } }>({});
  const [guide, setGuide] = useState({ addressArmenianForTaxi: hostel?.addressArmenianForTaxi ?? '', directionsFa: hostel?.directionsFa ?? '', directionsHy: hostel?.directionsHy ?? '', entrancePhoto: hostel?.entrancePhoto ?? '', floorAndDoorCode: hostel?.floorAndDoorCode ?? '', phone: hostel?.phone ?? '' });
  const run = async (task: () => Promise<import('../types').ActionResult>, success = '✓') => { setBusy(true); setMessage(''); try { const result = await task(); setMessage(result.success ? success : result.error ?? 'Error'); } finally { setBusy(false); } };
  return <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5">
    <h2 className="text-lg font-bold">{t.manage}</h2>
    <div className="flex flex-wrap gap-3">
      <label>{t.city}<select className="block p-2 border rounded-xl" value={hostelId} onChange={event => { const next = hostels.find(h => h.id === event.target.value); setHostel(event.target.value); setRoom(next?.roomTypes[0]?.id ?? ''); setGuide({ addressArmenianForTaxi: next?.addressArmenianForTaxi ?? '', directionsFa: next?.directionsFa ?? '', directionsHy: next?.directionsHy ?? '', entrancePhoto: next?.entrancePhoto ?? '', floorAndDoorCode: next?.floorAndDoorCode ?? '', phone: next?.phone ?? '' }); }}>{hostels.map(h => <option value={h.id} key={h.id}>{getLocalized(h.name)}</option>)}</select></label>
      <label>{t.room}<select className="block p-2 border rounded-xl" value={roomId} onChange={event => setRoom(event.target.value)}>{hostel?.roomTypes.map(room => <option key={room.id} value={room.id}>{getLocalized(room.name)}</option>)}</select></label>
    </div>
    {hostel && <>
      <form onSubmit={event => { event.preventDefault(); void run(() => appStore.setCapacity(hostelId, roomId, date, capacity), t.capacitySaved); }} className="flex flex-wrap items-end gap-3">
        <label>{t.date}<input required aria-label={t.date} type="date" min={yerevanToday()} max={addCalendarDays(yerevanToday(),89)} className="block p-2 border rounded-xl" value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>{t.capacity}<input required aria-label={t.capacity} type="number" min={0} max={hostel.roomTypes.find(r => r.id === roomId)?.totalBedsOrRooms} className="block p-2 border rounded-xl w-28" value={capacity} onChange={event => setCapacity(Number(event.target.value))} /></label>
        <button disabled={busy} className="px-4 py-2 bg-emerald-700 text-white rounded-xl">{busy ? t.processing : t.saveCapacity}</button>
      </form>
      <div className="overflow-auto max-h-64"><table className="w-full text-sm"><thead><tr><th>{t.date}</th><th>{t.capacity}</th><th>{t.available}</th></tr></thead><tbody>{state.availability.filter(day => day.hostelId === hostelId && day.roomTypeId === roomId).slice(0,30).map(day => <tr className="border-t text-center" key={day.date}><td className="p-2">{day.date}</td><td>{day.capacity}</td><td>{day.available}</td></tr>)}</tbody></table></div>
      <form className="space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); void run(() => appStore.action('updateArrivalGuide', [hostelId, guide])); }}>
        <h3 className="font-bold">{currentLang === 'fa' ? 'راهنمای ورود مهمان' : 'Guest arrival guide'}</h3>
        <div className="grid md:grid-cols-2 gap-3">{Object.entries(guide).map(([key,value]) => <label key={key} className="text-xs">{({ addressArmenianForTaxi: currentLang === 'fa' ? 'آدرس ارمنی برای تاکسی' : 'Armenian taxi address', directionsFa: 'راهنمای فارسی', directionsHy: 'Հայերեն ուղեցույց', entrancePhoto: currentLang === 'fa' ? 'لینک عکس در ورودی' : 'Entrance photo URL', floorAndDoorCode: currentLang === 'fa' ? 'طبقه و رمز در — فقط مهمان تأییدشده' : 'Floor / door code — confirmed guests only', phone: currentLang === 'fa' ? 'تلفن پذیرش' : 'Reception phone' } as Record<string,string>)[key]}<input className="block w-full p-2 border rounded-xl" value={value} onChange={event => setGuide({ ...guide, [key]: event.target.value })} /></label>)}</div>
        <button disabled={busy} className="px-4 py-2 border rounded-xl">{t.save}</button>
      </form>
    </>}
    {admin && <div className="border-t pt-4 space-y-4">
      <label className="block">{t.note}<input className="block p-2 border rounded-xl w-full" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} /></label>
      {[...hostels.map(h => ({ kind: 'hostel' as const, id: h.id, name: getLocalized(h.name), verified: h.verification?.status === 'verified' })), ...state.rentals.map(r => ({ kind: 'rental' as const, id: r.id, name: getLocalized(r.title), verified: r.verifiedBadge }))].map(item => <div className="flex justify-between gap-3 border-b py-2 text-sm" key={item.id}><span>{item.name} · {item.verified ? t.verified : t.unverified}</span><button disabled={busy || (!item.verified && !note.trim())} className="underline disabled:opacity-40" onClick={() => void run(() => appStore.setVerification(item.kind, item.id, !item.verified, note))}>{item.verified ? t.revoke : t.verify}</button></div>)}
      {hostel && <div className="flex flex-wrap gap-4">{(['nearMetro','monthlyStayAvailable'] as const).map(key => <label key={key}><input type="checkbox" checked={Boolean(hostel[key])} onChange={event => void run(() => appStore.saveHostel({ ...hostel, [key]: event.target.checked }))} /> {key === 'nearMetro' ? t.metro : t.monthlyStay}</label>)}</div>}
      <button className="px-4 py-2 border rounded-xl" onClick={async () => { const result = await appStore.action('notificationStatus', []); setQueue(result as typeof queue); }}>{t.notifications}</button>
      {queue.configured && <div className="space-y-2 text-sm"><p>{queue.configured.email ? 'Email ✓' : `Email: ${t.notConfigured}`} · {queue.configured.telegram ? 'Telegram ✓' : `Telegram: ${t.notConfigured}`}</p>{queue.notifications?.map(row => <p key={row.status}>{row.status === 'sent' ? t.sent : row.status === 'pending' || row.status === 'retry' ? t.pending : row.status}: {row.count}</p>)}<button disabled={busy || (!queue.configured.email && !queue.configured.telegram)} onClick={() => void run(() => appStore.action('sendNotifications', []))} className="border px-4 py-2 rounded-xl disabled:opacity-40">{currentLang === 'fa' ? 'ارسال اعلان‌های در صف' : 'Send queued notifications'}</button></div>}
    </div>}
    {message && <p role="status" className="text-sm p-3 rounded-xl bg-slate-50">{message}</p>}
  </section>;
}
