import React, { useEffect, useRef, useState } from 'react';
import type { AppLanguage, Hostel } from '../types';
import { ArrowUpRight, Check, Copy, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { getLocalized } from '../utils/i18n';
import { getMapLinks } from '../utils/maps';
import { mapText } from '../i18n/maps';

interface Props { hostel: Hostel; currentLang: AppLanguage }
export const HostelLocationMap: React.FC<Props> = ({ hostel, currentLang }) => {
  const t = mapText(currentLang);
  const links = hostel.coordinatesProvided === false ? null : getMapLinks(hostel.coordinates);
  const name = getLocalized(hostel.name, currentLang);
  const address = getLocalized(hostel.address, currentLang);
  const verified = hostel.locationVerification?.status === 'verified';
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setCopyState('idle'); }, [hostel.id]);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
    } catch { setCopyState('error'); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState('idle'), 3000);
  };
  return <section className="overflow-hidden rounded-3xl border border-edge bg-surface" aria-label={t.title}>
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><MapPin className="h-4 w-4" />{t.title}</p><h3 className="text-lg font-bold text-content">{name}</h3></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${verified ? 'bg-success-surface text-success' : 'bg-warning-surface text-accent'}`}><ShieldCheck className="h-3.5 w-3.5" />{verified ? t.verified : t.approximate}</span>
    </div>
    <div className="relative h-72 bg-surface-inset sm:h-96">
      {links?.embed ? <iframe key={links.embed} src={links.embed} title={`${t.title}: ${name}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full border-0" />
        : <div className="grid h-full place-items-center p-6 text-center text-sm text-secondary"><div><MapPin className="mx-auto mb-3 h-8 w-8" />{t.unavailable}</div></div>}
    </div>
    <div className="space-y-4 p-5 sm:p-6">
      <div><p className="mb-1 text-xs font-medium text-muted">{t.address}</p><p className="select-text text-sm leading-7 text-content">{address}</p></div>
      <p className="text-xs leading-6 text-muted">{verified ? t.verifiedNote : t.unverifiedNote}</p>
      {verified && hostel.locationVerification?.checkedAt && <p className="text-xs text-muted">{t.checked}: {new Date(hostel.locationVerification.checkedAt).toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : currentLang)}</p>}
      <div className="flex flex-wrap gap-2">
        {links && <><a href={links.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-medium text-action-text"><Navigation className="h-4 w-4" />{t.directions}</a><a href={links.openStreetMap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-sm font-medium"><ArrowUpRight className="h-4 w-4" />{t.openMap}</a></>}
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-sm font-medium">{copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copyState === 'copied' ? t.copied : t.copyAddress}</button>
      </div>
      <p role="status" className="text-xs text-muted">{copyState === 'error' ? t.copyFailed : t.mapLoading}</p>
    </div>
  </section>;
};
