import React, { useId } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { THEME_LABELS } from '../i18n/theme';

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  const { currentLang } = useLanguage();
  const id = useId();
  const labels = THEME_LABELS[currentLang];
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun;
  return <label htmlFor={id} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-control bg-surface px-2.5 text-sm text-content focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
    <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" />
    <span className="sr-only">{labels.theme}</span>
    <select id={id} value={preference} onChange={event => setPreference(event.target.value as ThemePreference)} className="min-h-10 min-w-0 max-w-36 bg-transparent text-content">
      {(['light', 'dark', 'system'] as const).map(value => <option key={value} value={value}>{labels[value]}</option>)}
    </select>
  </label>;
}
