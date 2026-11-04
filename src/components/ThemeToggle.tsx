import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { AppLanguage } from '../types';
import { useTheme } from '../context/ThemeContext';

const words: Record<AppLanguage, { dark: string; light: string }> = {
  fa: { dark: 'فعال‌کردن حالت تیره', light: 'فعال‌کردن حالت روشن' },
  en: { dark: 'Switch to dark mode', light: 'Switch to light mode' },
  ru: { dark: 'Включить тёмную тему', light: 'Включить светлую тему' },
  hy: { dark: 'Միացնել մուգ ռեժիմը', light: 'Միացնել բաց ռեժիմը' },
};

export function ThemeToggle({ currentLang, inMenu = false }: { currentLang: AppLanguage; inMenu?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? words[currentLang].light : words[currentLang].dark;
  const Icon = theme === 'dark' ? Sun : Moon;
  return <button
    type="button"
    onClick={toggleTheme}
    aria-label={label}
    aria-pressed={theme === 'dark'}
    title={label}
    className={inMenu
      ? 'flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-start text-sm font-semibold text-[#142f2a] hover:bg-white min-[380px]:hidden'
      : 'hidden min-[380px]:flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[#142f2a] hover:bg-white transition-colors'}
  >
    <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
    {inMenu && <span>{label}</span>}
  </button>;
}
