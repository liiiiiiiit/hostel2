import React, { useState, useSyncExternalStore } from 'react';
import { CalendarDays, Clock, Compass, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toursText } from '../i18n/tours';
import { appStore } from '../services/store';
import type { Tour } from '../types';
import { createRequestId } from '../utils/request-id';

type Draft = Omit<Tour, 'owned'>;
const limits = { title: 140, organizer: 140, destination: 200, departure: 200, schedule: 200, duration: 100, contact: 250 } as const;
const fields = Object.keys(limits) as (keyof typeof limits)[];
const newTour = (): Draft => ({
  id: createRequestId(), version: 0, title: '', organizer: '', destination: '', departure: '', schedule: '',
  duration: '', description: '', contact: '', price: null, published: true, hidden: false,
});

export function ToursView({ mode, onOrganizer, onLogin }: {
  mode: 'public' | 'organizer' | 'admin'; onOrganizer?: () => void; onLogin?: () => void;
}) {
  const { currentLang } = useLanguage();
  const t = toursText[currentLang];
  const state = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const admin = mode === 'admin' && state.currentUser?.role === 'admin';
  const managing = mode !== 'public';
  const tours = (state.tours ?? []).filter(tour => admin || (managing ? tour.owned : tour.published && !tour.hidden));
  function edit(tour?: Tour) {
    setMessage('');
    setDraft(tour ? { ...tour } : newTour());
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const result = await appStore.action('saveTour', [draft]);
      setMessage(result.success ? t.saved : result.error ?? '');
      if (result.success) setDraft(null);
    } finally { setBusy(false); }
  }
  async function remove(tour: Tour) {
    if (!admin || busy || !window.confirm(t.confirm + '\n' + tour.title)) return;
    setBusy(true);
    try {
      const result = await appStore.action('deleteTour', [tour.id, tour.version]);
      setMessage(result.success ? t.deleted : result.error ?? '');
    } finally { setBusy(false); }
  }
  const Heading = admin ? 'h2' : 'h1';
  return <section className={admin ? 'space-y-5' : 'page-shell py-8 space-y-5'}>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Heading className="text-2xl font-bold">{admin ? t.manage : managing ? t.panel : t.tours}</Heading>
      {!managing ? <button className="button-secondary" onClick={onOrganizer}><Compass size={18}/>{t.panel}</button>
        : state.currentUser && !draft && <button className="button-primary" disabled={busy} onClick={() => edit()}>{t.add}</button>}
    </header>
    {message && <p role="status">{message}</p>}
    {managing && !state.currentUser ? <button className="button-primary" onClick={onLogin}>{t.login}</button>
      : managing && draft ? <form className="surface space-y-5 p-5" onSubmit={save}>
        <h3 className="text-xl font-semibold">{draft.version ? t.edit : t.add}</h3>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {fields.map(key => <label key={key}>{t[key]}
            <input className="field mt-1 w-full" required maxLength={limits[key]} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/>
          </label>)}
          <label>{t.price}<input className="field mt-1 w-full" type="number" min="0" max="1000000000" step="1" value={draft.price ?? ''} onChange={e => setDraft({...draft,price:e.target.value ? Number(e.target.value) : null})}/><small>{t.optional}</small></label>
          <label className="sm:col-span-2">{t.description}
            <textarea className="field mt-1 w-full" required rows={5} maxLength={4000} value={draft.description} onChange={e => setDraft({...draft,description:e.target.value})}/>
          </label>
          <label><input type="checkbox" checked={draft.published} onChange={e => setDraft({...draft,published:e.target.checked})}/> {t.publish}</label>
          {admin && <label><input type="checkbox" checked={draft.hidden} onChange={e => setDraft({...draft,hidden:e.target.checked})}/> {t.hide}</label>}
        </fieldset>
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="button-primary">{t.save}</button><button type="button" disabled={busy} className="button-secondary" onClick={() => setDraft(null)}>{t.cancel}</button></div>
      </form> : <div className="grid gap-4 md:grid-cols-2">
        {!tours.length && <p className="surface p-5">{managing ? t.none : t.empty}</p>}
        {tours.map(tour => <article key={tour.id} className="surface min-w-0 space-y-4 p-5 [overflow-wrap:anywhere]">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold" dir="auto">{tour.title}</h3>
            {managing && <span className="status-pill">{tour.hidden ? t.hidden : tour.published ? t.live : t.draft}</span>}
          </header>
          <p dir="auto">{tour.organizer}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {([{key:'destination',Icon:Compass},{key:'departure',Icon:MapPin},{key:'schedule',Icon:CalendarDays},{key:'duration',Icon:Clock}] as const).map(({key,Icon}) =>
              <div key={key}><dt className="flex items-center gap-2 text-sm"><Icon size={15}/>{t[key]}</dt><dd dir="auto">{tour[key]}</dd></div>)}
          </dl>
          <p dir="auto" className="whitespace-pre-line">{tour.description}</p>
          <p>{t.price} · <strong>{tour.price === null ? t.ask : tour.price.toLocaleString(currentLang)}</strong></p>
          <p>{t.contact} · <bdi>{tour.contact}</bdi></p>
          {managing && <div className="flex flex-wrap gap-3"><button disabled={busy} className="button-secondary" onClick={() => edit(tour)}>{t.edit}</button>
            {admin && <button disabled={busy} className="button-secondary" onClick={() => void remove(tour)}>{t.remove}</button>}</div>}
        </article>)}
      </div>}
  </section>;
}
