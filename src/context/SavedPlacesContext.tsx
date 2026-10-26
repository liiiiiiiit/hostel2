import {useLanguage} from './LanguageContext';
import {workflowText} from '../i18n/workflows';
import {appStore} from '../services/store';
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
export type PlaceKey = `hostel:${string}` | `rental:${string}`;
const read = (key: string): PlaceKey[] => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter((key: unknown): key is PlaceKey => typeof key === 'string' && /^(hostel|rental):[^:]+$/.test(key)))].slice(0,100) as PlaceKey[] : []; } catch { return []; }
};
const Context = createContext<{ saved: PlaceKey[]; compared: PlaceKey[]; toggleSaved: (key: PlaceKey) => void; toggleCompared: (key: PlaceKey) => void } | null>(null);
export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const {currentLang}=useLanguage();const [syncError,setSyncError]=useState('');
  const state=useSyncExternalStore(appStore.subscribe,appStore.getState);
  const [guestSaved,setSaved] = useState(() => read('yh_saved'));
  const saved=state.currentUser?(state.savedPlaces??[]) as PlaceKey[]:guestSaved;
  useEffect(()=>{if(state.currentUser)void appStore.action('mergeSavedPlaces',[guestSaved]).then(result=>setSyncError(result.success?'':result.error??workflowText(currentLang)('error')));},[state.currentUser?.id]);
  const [compared, setCompared] = useState<PlaceKey[]>([]);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { try { localStorage.setItem('yh_saved', JSON.stringify(guestSaved)); setStorageError(false); } catch { setStorageError(true); } }, [guestSaved]);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key === 'yh_saved') setSaved(read('yh_saved')); }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, []);
  return <Context.Provider value={{ saved, compared, toggleSaved: key => {if(state.currentUser){void appStore.action('toggleAccountSaved',[key]).then(result=>setSyncError(result.success?'':result.error??workflowText(currentLang)('error')));return;}setSaved(items => items.includes(key) ? items.filter(item => item !== key) : items.length < 100 ? [...items, key] : items);}, toggleCompared: key => setCompared(items => items.includes(key) ? items.filter(item => item !== key) : items.length < 3 ? [...items, key] : items) }}>
    {syncError&&<p role="alert" className="p-3 text-center bg-danger-surface text-danger">{syncError}</p>}{storageError && <p role="status" className="p-2 text-center bg-warning-surface">ذخیره‌سازی مرورگر در دسترس نیست / Browser storage unavailable</p>}{children}
  </Context.Provider>;
}
export function useSavedPlaces() { const context = useContext(Context); if (!context) throw new Error('SavedPlacesProvider is required'); return context; }
