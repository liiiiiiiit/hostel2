import React, { useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { SavedPlacesProvider } from './context/SavedPlacesContext';
import { appStore } from './services/store';
import type { StartupStatus } from './i18n/loading';
function Bootstrap() {
  const [status, setStatus] = useState<StartupStatus>('loading');
  const load = async () => { setStatus('loading'); try { await appStore.refresh(); setStatus('ready'); } catch { setStatus('error'); } };
  useEffect(() => { void load(); }, []);
  // Keep the same app mounted while the API loads or retries: navigation, the
  // homepage introduction and any search input remain visible and usable.
  return <SavedPlacesProvider><App startupStatus={status} onStartupRetry={load} /></SavedPlacesProvider>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Bootstrap /></LanguageProvider>);
