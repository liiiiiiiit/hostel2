import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { appStore } from '../services/store';
import { tourBookingText } from '../i18n/tourBookings';
import { applicationText } from '../i18n/jobApplications';
import type { JobApplication, TourBooking } from '../types';

export function ReferenceTracker({kind}: {kind: 'tour' | 'job'}) {
  const { currentLang } = useLanguage();
  const t = kind === 'tour' ? tourBookingText[currentLang] : applicationText[currentLang];
  const statusLabels = { ...tourBookingText[currentLang], ...applicationText[currentLang] };
  const [reference,setReference] = useState('');
  const [status,setStatus] = useState<TourBooking['status'] | JobApplication['status']>();
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function lookup(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setStatus(undefined);
    try {
      const result = await appStore.action(kind === 'tour' ? 'trackTour' : 'trackApplication',[reference.trim().toLowerCase()]);
      if (result.success) setStatus(kind === 'tour' ? result.tourStatus : result.applicationStatus);
      else setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  return <details className="surface p-4"><summary className="cursor-pointer font-semibold">{t.tracking}</summary>
    <form onSubmit={lookup} className="mt-3 space-y-3"><label>{t.reference}<input required maxLength={40} dir="ltr" disabled={busy} value={reference} onChange={e=>{setReference(e.target.value);setStatus(undefined);setError('');}} className="field w-full"/></label>
      <button className="button-secondary" disabled={busy}>{t.check}</button>
      {status && <p role="status">{statusLabels[status]}</p>}{error && <p role="alert">{error}</p>}
    </form></details>;
}
