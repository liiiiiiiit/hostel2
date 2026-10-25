import React from 'react';
import { Heart, Columns3 } from 'lucide-react';
import { useSavedPlaces, type PlaceKey } from '../context/SavedPlacesContext';
import { useLanguage } from '../context/LanguageContext';
import { featureText } from '../i18n/features';
export function PlaceActions({ kind, id }: { kind: 'hostel' | 'rental'; id: string }) {
  const { currentLang } = useLanguage(); const t = featureText(currentLang);
  const { saved, compared, toggleSaved, toggleCompared } = useSavedPlaces();
  const key: PlaceKey = `${kind}:${id}`;
  const selected = compared.includes(key);
  return <div className="flex gap-2 text-xs py-2" onClick={event => event.stopPropagation()}>
    <button type="button" aria-pressed={saved.includes(key)} onClick={() => toggleSaved(key)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-amber-50"><Heart className={`w-4 h-4 ${saved.includes(key) ? 'fill-rose-500 text-rose-500' : ''}`} />{saved.includes(key) ? t.savedPlace : t.save}</button>
    <button type="button" aria-pressed={selected} disabled={!selected && compared.length >= 3} title={!selected && compared.length >= 3 ? t.compareLimit : t.compare} onClick={() => toggleCompared(key)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-amber-50"><Columns3 className="w-4 h-4" />{selected ? `✓ ${t.compare}` : t.compare}</button>
  </div>;
}
