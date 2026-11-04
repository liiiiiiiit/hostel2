import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type { AppLanguage } from '../types';

const key = 'yerevanhub_theme';
const labels = {
  fa: { dark: 'فعال‌کردن حالت تاریک', light: 'فعال‌کردن حالت روشن' },
  en: { dark: 'Switch to dark mode', light: 'Switch to light mode' },
  ru: { dark: 'Включить тёмную тему', light: 'Включить светлую тему' },
  hy: { dark: 'Միացնել մուգ թեման', light: 'Միացնել բաց թեման' },
};

export function ThemeToggle({ language }: { language: AppLanguage }) {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(key); } catch {}
      const next = stored === 'dark' || (stored !== 'light' && media.matches);
      document.documentElement.classList.toggle('dark', next);
      document.documentElement.style.colorScheme = next ? 'dark' : 'light';
      setDark(next);
    };
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) sync(); };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', storage);
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', storage); };
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    setDark(next);
    try { localStorage.setItem(key, next ? 'dark' : 'light'); } catch {}
  };
  return <button type="button" data-testid="theme-toggle" onClick={toggle}
    aria-label={labels[language][dark ? 'light' : 'dark']} title={labels[language][dark ? 'light' : 'dark']}
    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-white focus-visible:outline-2">
    {dark ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
  </button>;
}
