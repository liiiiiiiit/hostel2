import {workflowText} from '../i18n/workflows';
import {AccountSettings} from '../components/AccountSettings';
import React, { useState } from 'react';
import { CalendarDays, History, UserRound, Heart, ArrowUpRight, Search, MapPin, Compass } from 'lucide-react';
import { appStore } from '../services/store';
import { DashboardLayout, DashboardEmpty, DashboardStat, BookingStatusBadge } from '../components/DashboardLayout';
import { dashboardText } from '../i18n/dashboard';
import { yerevanToday } from '../utils/dates';
import type { AppLanguage, User, Booking } from '../types';
interface Props { currentLang:AppLanguage;currentUser:User;onNavigate:(view:string,params?:any)=>void }
export const TravelerAccountView:React.FC<Props>=({currentLang,currentUser,onNavigate})=>{
  const t=dashboardText(currentLang);const [active,setActive]=useState('upcoming');const today=yerevanToday();
  // The server binds reservations to the authenticated user. Matching contact text is not ownership.
  const bookings=appStore.getState().bookings.filter(b=>b.travelerUserId===currentUser.id);
  const upcoming=bookings.filter(b=>['pending','confirmed'].includes(b.status)&&b.checkOut>=today);
  const history=bookings.filter(b=>!upcoming.some(item=>item.id===b.id));
  const nav=[{id:'recommend',label:workflowText(currentLang)('recommend'),icon:<Compass size={17}/>},{id:'upcoming',label:t.upcoming,icon:<CalendarDays size={17}/>,count:upcoming.length},{id:'history',label:t.history,icon:<History size={17}/>},{id:'profile',label:t.profile,icon:<UserRound size={17}/>},{id:'saved',label:t.savedPlaces,icon:<Heart size={17}/>}];
  const card=(booking:Booking)=>{
    const hostel=appStore.getHostelByIdOrSlug(booking.hostelId);
    return <article key={booking.id} className="surface overflow-hidden"><div className="grid sm:grid-cols-[160px_minmax(0,1fr)]"><div className="bg-slate-100 h-40 sm:h-full min-h-40">{hostel?.photos[0]?<img className="h-full w-full object-cover" src={hostel.photos[0]} alt=""/>:<div className="h-full grid place-items-center"><MapPin className="w-8 h-8 text-slate-300"/></div>}</div><div className="p-5 sm:p-6 space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-400 mb-2">{t.payArrival}</p><h2 className="font-semibold text-lg text-slate-950">{hostel?.name[currentLang]||booking.hostelName}</h2><p className="text-sm text-slate-500 mt-1">{booking.roomTypeName}</p></div><BookingStatusBadge status={booking.status}/></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm"><div><span className="text-xs text-slate-400 block mb-1">{tAdminDate(currentLang,'in')}</span><strong className="tabular-nums">{booking.checkIn}</strong></div><div><span className="text-xs text-slate-400 block mb-1">{tAdminDate(currentLang,'out')}</span><strong className="tabular-nums">{booking.checkOut}</strong></div><div><span className="text-xs text-slate-400 block mb-1">{t.amount}</span><strong>{booking.finalAmountAMD.toLocaleString(currentLang)} AMD</strong></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-400">{booking.nights} {t.nights} · {booking.guestsCount} {t.guests}</p><button className="button-primary" onClick={()=>onNavigate('booking-track',{token:booking.privateToken})}>{t.viewBooking}<ArrowUpRight size={16}/></button></div></div></div></article>;
  };
  return <div data-testid="traveler-dashboard"><DashboardLayout title={`${t.traveler}، ${currentUser.name.split(' ')[0]}`} subtitle={t.yourTrips} nav={nav} active={active} onChange={id=>id==='saved'?onNavigate('saved'):id==='recommend'?onNavigate('recommendations'):setActive(id)} actions={<button className="button-primary" onClick={()=>onNavigate('hostels')}><Compass size={17}/>{t.discover}</button>}>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3"><DashboardStat label={t.upcoming} value={upcoming.length}/><DashboardStat label={t.totalBookings} value={bookings.length}/><DashboardStat label={t.completed} value={bookings.filter(b=>b.status==='completed').length}/></div>
    {active==='profile'?<AccountSettings/>:<><h2 className="font-semibold text-lg">{active==='upcoming'?t.upcoming:t.history}</h2>{(active==='upcoming'?upcoming:history).length?(active==='upcoming'?upcoming:history).map(card):<DashboardEmpty title={t.noTrips}><button className="button-primary mx-auto" onClick={()=>onNavigate('hostels')}>{t.discover}<ArrowUpRight size={16}/></button></DashboardEmpty>}</>}
  </DashboardLayout></div>;
};
function tAdminDate(lang:AppLanguage,part:'in'|'out'){return ({fa:{in:'ورود',out:'خروج'},en:{in:'Check-in',out:'Check-out'},ru:{in:'Заезд',out:'Выезд'},hy:{in:'Մուտք',out:'Ելք'}})[lang][part];}
