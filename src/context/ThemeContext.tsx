import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type SiteTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'yerevanhub_theme';

export function resolveTheme(saved: string | null, systemDark: boolean): SiteTheme {
  if (saved === 'light' || saved === 'dark') return saved;
  return systemDark ? 'dark' : 'light';
}

function savedTheme(): string | null {
  try { return window.localStorage.getItem(THEME_STORAGE_KEY); }
  catch { return null; }
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

type ThemeContextValue = { theme: SiteTheme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(() => {
    if (typeof document === 'undefined') return 'light';
    const initial = document.documentElement.dataset.theme;
    if (initial === 'light' || initial === 'dark') return initial;
    return resolveTheme(savedTheme(), systemDark());
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setTheme(resolveTheme(savedTheme(), systemDark()));
      }
    };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = () => {
      if (savedTheme() !== 'dark' && savedTheme() !== 'light') {
        setTheme(media.matches ? 'dark' : 'light');
      }
    };
    window.addEventListener('storage', syncStorage);
    media.addEventListener('change', syncSystem);
    return () => {
      window.removeEventListener('storage', syncStorage);
      media.removeEventListener('change', syncSystem);
    };
  }, []);

  const toggleTheme = () => {
    const next: SiteTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); }
    catch { /* Browsers with disabled storage can still use the toggle. */ }
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
