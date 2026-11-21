import React, { useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { tourBookingText } from '../i18n/tourBookings';
import { toursText } from '../i18n/tours';
import { appStore } from '../services/store';
import type { Tour, TourBooking } from '../types';
import { isTourPhone } from '../utils/tour-contact';
import { createRequestId } from '../utils/request-id';
import { yerevanToday } from '../utils/dates';

export function TourBookingForm({ tour }: { tour: Tour }) {
  const { currentLang } = useLanguage();
  const t = tourBookingText[currentLang];
  const [open, setOpen] = useState(false);
  const [guests, setGuests] = useState('1');
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef({ body: '', id: '' });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const contact = String(form.get('contact')).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !isTourPhone(contact)) {
      setError(t.invalidContact); return;
    }
    const input = { tourId: tour.id, tourVersion: tour.version, guests: Number(guests), contact,
      name:String(form.get('name')).trim(), travelDate:String(form.get('travelDate')), notes:String(form.get('notes')).trim() };
    const body = JSON.stringify(input);
    if (attempt.current.body !== body) attempt.current = { body, id: createRequestId() };
    setBusy(true); setError('');
    try {
      const result = await appStore.action('bookTour', [{...input, requestId:attempt.current.id}]);
      if (result.success && result.tourReference) setReceipt(result.tourReference);
      else setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  if (receipt) return <div role="status" className="rounded-xl border p-4 space-y-2">
    <p>{t.received}</p><p>{t.reference} · <code dir="ltr" className="select-all break-all">{receipt}</code></p>
  </div>;
  if (!open) return <button className="button-primary" onClick={() => setOpen(true)}>{t.book}</button>;
  return <form onSubmit={submit} className="space-y-4 border-t pt-4">
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <label>{t.name}<input required name="name" autoComplete="name" maxLength={120} className="field w-full"/></label>
      <label>{t.contact}<input required name="contact" maxLength={250} className="field w-full" dir="auto"/></label>
      <label>{t.date}<input required type="date" name="travelDate" min={yerevanToday()} className="field w-full"/></label>
      <label>{t.guests}<input required type="number" min={1} max={100} value={guests} onChange={e=>setGuests(e.target.value)} className="field w-full"/></label>
      <label className="sm:col-span-2">{t.notes}<textarea name="notes" maxLength={1500} className="field w-full"/></label>
    </fieldset>
    <p>{t.total} · {tour.price === null ? toursText[currentLang].ask : guests && Number(guests)>0 ? (Number(guests)*tour.price).toLocaleString(currentLang) : '—'}</p>
    <p>{t.pending}</p>{error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} className="button-primary">{t.send}</button>
      <button type="button" disabled={busy} className="button-secondary" onClick={()=>setOpen(false)}>{toursText[currentLang].cancel}</button></div>
  </form>;
}

export function TourBookingTracker() {
  const { currentLang } = useLanguage();
  const t = tourBookingText[currentLang];
  const [reference,setReference] = useState('');
  const [status,setStatus] = useState<TourBooking['status']>();
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function lookup(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setStatus(undefined);
    try {
      const result = await appStore.action('trackTour',[reference.trim().toLowerCase()]);
      if (result.success) setStatus(result.tourStatus);
      else setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  return <details className="surface p-4"><summary className="cursor-pointer font-semibold">{t.tracking}</summary>
    <form onSubmit={lookup} className="mt-3 space-y-3"><label>{t.reference}<input required maxLength={40} dir="ltr" disabled={busy} value={reference} onChange={e=>{setReference(e.target.value);setStatus(undefined);setError('');}} className="field w-full"/></label>
      <button className="button-secondary" disabled={busy}>{t.check}</button>
      {status && <p role="status">{t[status]}</p>}{error && <p role="alert">{error}</p>}
    </form></details>;
}

export function AdminTourBookings({ bookings }: { bookings: TourBooking[] }) {
  const { currentLang } = useLanguage();
  const t = tourBookingText[currentLang], tour = toursText[currentLang];
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function update(booking: TourBooking, next: TourBooking['status']) {
    setBusy(true);setError('');
    try {
      const result = await appStore.action('changeTourBooking',[booking.reference,booking.status,next]);
      if (!result.success) setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  return <section className="space-y-4"><h3 className="text-xl font-bold">{t.dashboard} ({bookings.length.toLocaleString(currentLang)})</h3>
    {error && <p role="alert">{error}</p>}{!bookings.length && <p>{t.empty}</p>}
    <div className="grid gap-4 md:grid-cols-2">{bookings.map(b=><article key={b.reference} className="surface p-4 space-y-2 min-w-0 [overflow-wrap:anywhere]">
      <h4 className="font-semibold"><bdi>{b.title}</bdi> · <bdi>{b.name}</bdi></h4>
      <dl>{[[tour.organizer,b.organizer],[t.contact,b.contact],[t.date,b.travelDate],[t.guests,b.guests.toLocaleString(currentLang)],
        [tour.price,b.price===null?tour.ask:b.price.toLocaleString(currentLang)],[t.total,b.price===null?tour.ask:(b.price*b.guests).toLocaleString(currentLang)],
        [t.notes,b.notes || '—'],[t.created,new Date(b.createdAt).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})],[t.reference,b.reference]].map(([label,value])=>
          <div key={label}><dt className="inline font-medium">{label} · </dt><dd className="inline whitespace-pre-line"><bdi>{value}</bdi></dd></div>)}</dl>
      <label>{t.status}<select className="field w-full" disabled={busy} value={b.status} onChange={e=>void update(b,e.target.value as TourBooking['status'])}>
        {(['pending','confirmed','cancelled'] as const).map(s=><option key={s} value={s}>{t[s]}</option>)}</select></label>
    </article>)}</div></section>;
}
