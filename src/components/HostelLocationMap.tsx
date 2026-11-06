import React, { useEffect, useRef, useState } from 'react';
import type { AppLanguage, Hostel, RentalProperty } from '../types';
import { ArrowUpRight, Check, Copy, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { getLocalized } from '../utils/i18n';
import { getMapLinks, getProviderLinks } from '../utils/maps';
import { locationText, mapText } from '../i18n/maps';

interface LocationProps { currentLang: AppLanguage; name: string; address: string; point?: {lat:number;lng:number}; verified?: boolean; checkedAt?: string; rental?: boolean }
export const PropertyLocationMap: React.FC<LocationProps> = ({ currentLang, name, address, point, verified = false, checkedAt, rental = false }) => {
  const t = mapText(currentLang);
  const c = locationText(currentLang);
  const links = point ? getMapLinks(point) : null;
  const providers = getProviderLinks(point, address);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setCopyState('idle'); }, [name, address]);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
    } catch { setCopyState('error'); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState('idle'), 3000);
  };
  return <section data-testid="property-location" className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-label={t.title}>
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><MapPin className="h-4 w-4" />{t.title}</p><h3 className="text-lg font-bold text-slate-950">{name}</h3></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}><ShieldCheck className="h-3.5 w-3.5" />{rental ? c.publicPoint : verified ? t.verified : t.approximate}</span>
    </div>
    <div className="relative h-72 bg-slate-100 sm:h-96">
      {links?.embed ? <iframe key={links.embed} src={links.embed} title={`${t.title}: ${name}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full border-0" />
        : <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-600"><div><MapPin className="mx-auto mb-3 h-8 w-8" />{!links && providers ? c.searchHint : t.unavailable}</div></div>}
    </div>
    <div className="space-y-4 p-5 sm:p-6">
      <div><p className="mb-1 text-xs font-medium text-slate-500">{t.address}</p><p className="break-words select-text text-sm leading-7 text-slate-800">{address}</p></div>
      <p className="text-xs leading-6 text-slate-500">{rental ? c.publicHint : verified ? t.verifiedNote : t.unverifiedNote}</p>
      {verified && checkedAt && <p className="text-xs text-slate-500">{t.checked}: {new Date(checkedAt!).toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : currentLang)}</p>}
      <div className="flex flex-wrap gap-2">
        {providers && <><a href={providers.yandex} target="_blank" rel="noopener noreferrer" className="button-primary inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{c.yandex}</a><a href={providers.google} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex items-center gap-2"><ArrowUpRight className="h-4 w-4" />{c.google}</a></>}
        {links && <a href={links.directions} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex items-center gap-2"><Navigation className="h-4 w-4" />{t.directions}</a>}
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">{copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copyState === 'copied' ? t.copied : t.copyAddress}</button>
      </div>
      <p role="status" className="text-xs text-slate-500">{copyState === 'error' ? t.copyFailed : links?.embed ? t.mapLoading : ''}</p>
    </div>
  </section>;
};

export const HostelLocationMap: React.FC<{hostel: Hostel; currentLang: AppLanguage}> = ({hostel,currentLang}) => <PropertyLocationMap currentLang={currentLang} name={getLocalized(hostel.name,currentLang)} address={getLocalized(hostel.address,currentLang)} point={hostel.coordinatesProvided === false ? undefined : hostel.coordinates} verified={hostel.locationVerification?.status === 'verified'} checkedAt={hostel.locationVerification?.checkedAt} />;

export const RentalLocationMap: React.FC<{rental: RentalProperty; currentLang: AppLanguage}> = ({rental,currentLang}) => <PropertyLocationMap currentLang={currentLang} name={getLocalized(rental.title,currentLang)} address={[rental.addressPublic || rental.approximateLocationLabel,rental.city].filter(Boolean).join(', ')} point={rental.publicCoordinates} rental />;
