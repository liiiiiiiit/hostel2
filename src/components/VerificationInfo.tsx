import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { featureText } from '../i18n/features';
export function VerificationInfo({ verified, checkedAt, note }: { verified: boolean; checkedAt?: string; note?: string }) {
  const { currentLang } = useLanguage(); const t = featureText(currentLang);
  return <div className={`text-xs p-3 rounded-xl border ${verified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
    <strong>{verified ? `✓ ${t.verified}` : t.unverified}</strong>
    {verified && checkedAt && <span> · {t.checked}: {new Date(checkedAt).toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : currentLang)}</span>}
    {verified && note && <p className="mt-1">{note}</p>}
  </div>;
}
