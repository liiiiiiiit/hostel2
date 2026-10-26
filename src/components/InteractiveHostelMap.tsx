import React, { useState } from 'react';
import type { Hostel } from '../types';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getMapLinks } from '../utils/maps';
import { mapText } from '../i18n/maps';

interface Props {
  hostels: Hostel[]; selectedHostelId?: string | null; onSelectHostel?: (id: string | null) => void;
  onNavigate: (view: string, params?: any) => void;
  getHostelRating?: (id: string) => { avg: number; count: number };
  className?: string; heightClass?: string; showTitle?: boolean;
}
/** A real basemap for the selected saved point. No city-specific projection or clamped markers. */
export const InteractiveHostelMap: React.FC<Props> = ({ hostels, selectedHostelId, onSelectHostel, onNavigate, className = '', heightClass = 'h-[360px] sm:h-[480px]', showTitle = true }) => {
  const { currentLang, getLocalized } = useLanguage(); const t = mapText(currentLang);
  const [internalSelectedId, setSelected] = useState<string | null>(hostels[0]?.id ?? null);
  const selected = hostels.find(hostel => hostel.id === (selectedHostelId !== undefined ? selectedHostelId : internalSelectedId)) ?? hostels[0];
  const links = selected ? getMapLinks(selected.coordinates) : null;
  if (!selected) return <div className={`rounded-3xl border border-edge bg-surface p-8 text-center text-sm text-muted ${className}`}>{t.empty}</div>;
  return <section className={`overflow-hidden rounded-3xl border border-edge bg-surface ${className}`} aria-label={t.mapTitle}>
    {showTitle && <div className="p-5 sm:p-6"><h2 className="text-lg font-bold text-content">{t.mapTitle}</h2><p className="mt-1 text-sm text-muted">{t.select}</p></div>}
    <div className="grid lg:grid-cols-[290px_1fr]">
      <div className="flex max-h-64 gap-2 overflow-auto border-b border-edge p-3 lg:max-h-[480px] lg:flex-col lg:border-b-0 lg:border-e">
        {hostels.map(hostel => <button type="button" key={hostel.id} aria-pressed={selected.id === hostel.id} onClick={() => { setSelected(hostel.id); onSelectHostel?.(hostel.id); }} className={`min-w-[220px] rounded-2xl border p-4 text-start transition-colors lg:min-w-0 ${selected.id === hostel.id ? 'border-control bg-surface-inset' : 'border-transparent hover:bg-canvas'}`}>
          <span className="mb-2 flex items-center gap-2 text-xs text-muted"><MapPin className="h-3.5 w-3.5" />{hostel.city} · {hostel.district}</span>
          <strong className="block text-sm leading-6 text-content">{getLocalized(hostel.name)}</strong>
          <span className={`mt-2 block text-xs ${hostel.locationVerification?.status === 'verified' ? 'text-success' : 'text-accent'}`}>{hostel.locationVerification?.status === 'verified' ? t.verified : t.approximate}</span>
        </button>)}
      </div>
      <div>
        <div className={`${heightClass} bg-surface-inset`}>
          {links?.embed ? <iframe key={links.embed} src={links.embed} title={`${t.mapTitle}: ${getLocalized(selected.name)}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full border-0" /> : <div className="grid h-full place-items-center p-8 text-center text-sm text-muted">{t.unavailable}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div><h3 className="text-sm font-bold">{getLocalized(selected.name)}</h3><p className="mt-1 text-xs leading-6 text-muted">{getLocalized(selected.address)}</p></div>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-medium text-action-text" onClick={() => onNavigate('hostel-detail', { id: selected.id })}>{t.details}<ArrowUpRight className="h-4 w-4" /></button>
        </div>
        <p className="px-5 pb-5 text-xs leading-6 text-muted">{selected.locationVerification?.status === 'verified' ? t.verifiedNote : t.unverifiedNote}</p>
      </div>
    </div>
  </section>;
};
