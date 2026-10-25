import React, { createContext, useContext, useEffect, useState } from 'react';
export type PlaceKey = `hostel:${string}` | `rental:${string}`;
const read = (key: string): PlaceKey[] => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter((key: unknown): key is PlaceKey => typeof key === 'string' && /^(hostel|rental):[^:]+$/.test(key)))].slice(0,100) as PlaceKey[] : []; } catch { return []; }
};
const Context = createContext<{ saved: PlaceKey[]; compared: PlaceKey[]; toggleSaved: (key: PlaceKey) => void; toggleCompared: (key: PlaceKey) => void } | null>(null);
export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState(() => read('yh_saved'));
  const [compared, setCompared] = useState<PlaceKey[]>([]);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { try { localStorage.setItem('yh_saved', JSON.stringify(saved)); setStorageError(false); } catch { setStorageError(true); } }, [saved]);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key === 'yh_saved') setSaved(read('yh_saved')); }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, []);
  return <Context.Provider value={{ saved, compared, toggleSaved: key => setSaved(items => items.includes(key) ? items.filter(item => item !== key) : items.length < 100 ? [...items, key] : items), toggleCompared: key => setCompared(items => items.includes(key) ? items.filter(item => item !== key) : items.length < 3 ? [...items, key] : items) }}>
    {storageError && <p role="status" className="p-2 text-center bg-amber-50">ذخیره‌سازی مرورگر در دسترس نیست / Browser storage unavailable</p>}{children}
  </Context.Provider>;
}
export function useSavedPlaces() { const context = useContext(Context); if (!context) throw new Error('SavedPlacesProvider is required'); return context; }
