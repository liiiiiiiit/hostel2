import {AccountSettings} from '../components/AccountSettings';
import {PlatformSettings} from '../components/PlatformSettings';
import {ReceptionPanel} from '../components/ReceptionPanel';
import {FinancePanel} from '../components/FinancePanel';
import {workflowText} from '../i18n/workflows';
import React, { useState } from 'react';
import { Building2, CalendarDays, Clock3, BedDouble, LayoutDashboard, Settings2, Search, ArrowUpRight, Loader2 } from 'lucide-react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { PropertyOperationsPanel } from '../components/PropertyOperationsPanel';
import { DashboardLayout, DashboardStat, DashboardEmpty, BookingStatusBadge } from '../components/DashboardLayout';
import { dashboardText, bookingStatusText } from '../i18n/dashboard';
import { yerevanToday } from '../utils/dates';
import type { AppLanguage, Booking, BookingStatus } from '../types';

interface Props { currentLang?: AppLanguage; onNavigate: (view: string, params?: any) => void }
const textField = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50';
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#142f2a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#244b41] disabled:opacity-50';

export const ManagerPanelView: React.FC<Props> = ({ onNavigate }) => {
  const { currentLang, getLocalized } = useLanguage(); const t = dashboardText(currentLang);
  const state = appStore.getState(); const today = yerevanToday();
  const hostels = state.hostels.filter(h => state.currentUser?.assignedHostelIds?.includes(h.id));
  const assignedIds = new Set(hostels.map(h => h.id));
  const allBookings = state.bookings.filter(b => assignedIds.has(b.hostelId));
  const [active, setActive] = useState('overview'); const [hostelId, setHostelId] = useState('all');
  const [status, setStatus] = useState<BookingStatus | 'all'>('all'); const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState('');
  const scoped = allBookings.filter(b => hostelId === 'all' || b.hostelId === hostelId);
  const pending = scoped.filter(b => b.status === 'pending');
  const arrivals = scoped.filter(b => b.status === 'confirmed' && b.checkIn === today);
  const staying = scoped.filter(b => b.status === 'confirmed' && b.checkIn <= today && b.checkOut > today);
  const available = state.availability.filter(day => assignedIds.has(day.hostelId) && (hostelId === 'all' || day.hostelId === hostelId) && day.date === today).reduce((sum,day) => sum + day.available,0);
  const filtered = scoped.filter(b => (status === 'all' || b.status === status) && (!search.trim() || `${b.guestName} ${b.trackingCode} ${b.guestContact}`.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.createdAt.localeCompare(a.createdAt));
  const selectedHostel = hostels.find(h => h.id === hostelId);
  const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : currentLang, { timeZone:'UTC',month:'short',day:'numeric' });
  const update = async (booking: Booking, next: BookingStatus) => {
    if (busy) return; setBusy(booking.id); setError('');
    try { const reason=['rejected','cancelled','no_show'].includes(next)?window.prompt(workflowText(currentLang)('reason')):undefined;if(reason===null||reason!==undefined&&!reason.trim())return;const result=await appStore.updateBookingStatus(booking.id,next,reason); if(!result.success)setError(result.error || t.noResults); }
    catch { setError(t.noResults); } finally { setBusy(null); }
  };
  const showBookings = (filter: BookingStatus | 'all' = 'all') => { setStatus(filter); setActive('bookings'); };
  const cards = (bookings: Booking[]) => bookings.length ? <div className="space-y-3">{bookings.map(b => <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-base font-bold text-[#142f2a]">{b.guestName}</h3><p className="mt-1 text-sm text-slate-500">{getLocalized(hostels.find(h=>h.id===b.hostelId)?.name) || b.hostelName} · {b.roomTypeName}</p></div><BookingStatusBadge status={b.status} /></div>
    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 xl:grid-cols-4 text-sm"><div><dt className="text-xs text-slate-500">{{fa:'ورود / خروج',en:'Check-in / Check-out',ru:'Заезд / Выезд',hy:'Մուտք / Ելք'}[currentLang]}</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(b.checkIn)} — {formatDate(b.checkOut)}</dd></div><div><dt className="text-xs text-slate-500">{t.guests}</dt><dd className="mt-1 font-medium text-slate-800">{b.guestsCount} · {b.nights} {t.nights}</dd></div><div><dt className="text-xs text-slate-500">{t.amount}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-800">{b.finalAmountAMD.toLocaleString(currentLang === 'fa' ? 'fa-IR' : currentLang)} AMD</dd></div><div><dt className="text-xs text-slate-500">{t.contact}</dt><dd className="mt-1 break-all text-slate-800" dir="ltr">{b.guestContact}</dd></div></dl>
    {b.specialRequests && <div className="mt-4 rounded-xl bg-amber-50/60 px-3.5 py-3 text-sm text-amber-950"><span className="font-semibold">{t.guestNote}: </span>{b.specialRequests}</div>}
    {b.entranceIssueReported && <div className="mt-3 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800"><strong>{t.unresolved}</strong>{b.entranceIssueNote && <p className="mt-1">{b.entranceIssueNote}</p>}</div>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="max-w-48 truncate font-mono text-xs text-slate-400" title={b.trackingCode}>{b.trackingCode}</span><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>onNavigate('booking-track',{token:b.privateToken})}>{t.viewBooking}<ArrowUpRight className="h-4 w-4" /></button>{b.status === 'pending' && <><button type="button" disabled={Boolean(busy)} className={primary} onClick={()=>void update(b,'confirmed')}>{busy === b.id && <Loader2 className="h-4 w-4 animate-spin" />}{t.confirm}</button><button type="button" disabled={Boolean(busy)} className={`${button} text-rose-700`} onClick={()=>void update(b,'rejected')}>{t.reject}</button></>}{b.status === 'confirmed' && <><button type="button" disabled={Boolean(busy)} className={primary} onClick={()=>setActive('reception')}>{t.finish}</button><button type="button" disabled={Boolean(busy)} className={`${button} text-rose-700`} onClick={()=>void update(b,'no_show')}>{t.noShow}</button></>}</div></div>
  </article>)}</div> : <DashboardEmpty title={t.noResults}><p className="text-sm text-slate-500">{t.tryFilter}</p></DashboardEmpty>;

  return <div data-testid="manager-dashboard"><DashboardLayout title={t.manager} subtitle={state.currentUser?.name} active={active} onChange={value=>{setActive(value);setError('');if(['operations','reception'].includes(value)&&hostelId==='all'&&hostels[0])setHostelId(hostels[0].id);}} nav={[{id:'profile',label:workflowText(currentLang)('profile'),icon:<Building2 size={17}/>},{id:'reception',label:workflowText(currentLang)('operations'),icon:<CalendarDays size={17}/>},{id:'finance',label:workflowText(currentLang)('finance'),icon:<Building2 size={17}/>},
    {id:'overview',label:t.overview,icon:<LayoutDashboard className="h-4 w-4"/>},
    {id:'bookings',label:t.bookings,icon:<CalendarDays className="h-4 w-4"/>,count:allBookings.filter(b=>b.status==='pending').length},
    {id:'operations',label:t.operations,icon:<Settings2 className="h-4 w-4"/>},
    {id:'properties',label:t.properties,icon:<Building2 className="h-4 w-4"/>},
  ]} actions={<label className="min-w-48 text-sm"><span className="sr-only">{t.chooseHostel}</span><select data-testid="workspace-property" aria-label={t.chooseHostel} className={textField} value={hostelId} onChange={event=>setHostelId(event.target.value)}><option disabled={active==='operations'||active==='reception'} value="all">{t.all} · {t.properties}</option>{hostels.map(hostel=><option key={hostel.id} value={hostel.id}>{getLocalized(hostel.name)}</option>)}</select></label>}>
    {error && <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</div>}
    {!hostels.length && <DashboardEmpty title={t.noResults}><p className="text-sm text-slate-500">{currentLang === 'fa' ? 'برای اختصاص اقامتگاه با مدیر سایت تماس بگیرید.' : currentLang === 'ru' ? 'Обратитесь к администратору для назначения объекта.' : currentLang === 'hy' ? 'Օբյեկտի նշանակման համար կապվեք ադմինիստրատորի հետ։' : 'Contact the administrator to assign a property.'}</p></DashboardEmpty>}
    {active === 'overview' && hostels.length > 0 && <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><DashboardStat label={t.needsAction} value={pending.length} icon={<Clock3 className="h-4 w-4"/>} onClick={()=>showBookings('pending')}/><DashboardStat label={t.todayArrivals} value={arrivals.length} icon={<CalendarDays className="h-4 w-4"/>}/><DashboardStat label={t.activeStays} value={staying.length} icon={<BedDouble className="h-4 w-4"/>}/><DashboardStat label={currentLang === 'fa' ? 'ظرفیت آزاد امروز' : currentLang === 'ru' ? 'Свободно сегодня' : currentLang === 'hy' ? 'Այսօր ազատ տեղեր' : 'Available today'} value={available} icon={<Building2 className="h-4 w-4"/>}/></div><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[#142f2a]">{pending.length ? t.needsAction : t.recentBookings}</h2><button type="button" className="text-sm font-medium underline underline-offset-4" onClick={()=>showBookings()}>{t.all} {t.bookings}</button></div>{cards((pending.length ? pending : scoped).slice(0,5))}</>}
    {active === 'bookings' && <><div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_200px]"><label className="relative"><Search className="pointer-events-none absolute start-3.5 top-3.5 h-4 w-4 text-slate-400"/><span className="sr-only">{t.search}</span><input className={`${textField} ps-10`} placeholder={t.search} value={search} onChange={event=>setSearch(event.target.value)}/></label><select aria-label={t.bookings} className={textField} value={status} onChange={event=>setStatus(event.target.value as typeof status)}><option value="all">{t.all}</option>{(['pending','confirmed','completed','cancelled','rejected','expired','no_show'] as const).map(value=><option value={value} key={value}>{bookingStatusText(value,currentLang)}</option>)}</select></div>{cards(filtered)}</>}
    {active==='profile'&&<AccountSettings/>}
    {active==='reception'&&<ReceptionPanel key={hostelId} hostelId={hostelId==='all'?undefined:hostelId}/>}
    {active==='finance'&&<FinancePanel hostelId={hostelId==='all'?undefined:hostelId}/>}
    {active === 'operations' && <PropertyOperationsPanel selectedHostelId={hostelId==='all'?hostels[0]?.id:hostelId} onHostelChange={setHostelId}/>}
    {active === 'properties' && <div className="grid gap-4 xl:grid-cols-2">{(selectedHostel ? [selectedHostel] : hostels).map(hostel=><article key={hostel.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><img src={hostel.photos[0]} alt="" className="h-40 w-full object-cover"/><div className="space-y-4 p-5"><div><h2 className="font-bold text-[#142f2a]">{getLocalized(hostel.name)}</h2><p className="mt-1 text-sm text-slate-500">{getLocalized(hostel.address)}</p></div><div className="flex flex-wrap gap-2"><button className={primary} type="button" onClick={()=>{setHostelId(hostel.id);setActive('operations');}}>{t.manageProperty}</button><button className={button} type="button" onClick={()=>onNavigate('hostel-detail',{id:hostel.id})}>{t.open}<ArrowUpRight className="h-4 w-4"/></button></div></div></article>)}</div>}
  </DashboardLayout></div>;
};
