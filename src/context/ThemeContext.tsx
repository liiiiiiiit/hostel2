import React, { createContext, useContext, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
interface ThemeStore {
  getPreference: () => ThemePreference;
  getResolved: () => ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  subscribe: (listener: () => void) => () => void;
}
declare global { interface Window { YerevanTheme: ThemeStore } }
const ThemeContext = createContext<{ preference: ThemePreference; resolvedTheme: ResolvedTheme; setPreference: ThemeStore['setPreference'] } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const store = window.YerevanTheme;
  const preference = useSyncExternalStore(store.subscribe, store.getPreference);
  const resolvedTheme = useSyncExternalStore(store.subscribe, store.getResolved);
  return <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference: store.setPreference }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme;
}
