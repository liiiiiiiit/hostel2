import React, { useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { SavedPlacesProvider } from './context/SavedPlacesContext';
import { appStore } from './services/store';
function Bootstrap() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const load = async () => { setStatus('loading'); try { await appStore.refresh(); setStatus('ready'); } catch (error) { setError(error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.'); setStatus('error'); } };
  useEffect(() => { void load(); }, []);
  if (status === 'loading') return <div className="p-12 text-center" role="status">YEREVANHUB…</div>;
  if (status === 'error') return <div className="p-12 text-center space-y-4" role="alert"><p>{error}</p><button onClick={load} className="px-5 py-3 bg-amber-500 rounded-xl">تلاش دوباره / Retry</button></div>;
  return <LanguageProvider><SavedPlacesProvider><App /></SavedPlacesProvider></LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Bootstrap />);
