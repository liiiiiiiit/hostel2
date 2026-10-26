import {OFFLINE_PHRASES} from './content/phrasebook';
import {TranslatorView} from './views/TranslatorView';
import React, { useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider,useLanguage } from './context/LanguageContext';
import { SavedPlacesProvider } from './context/SavedPlacesContext';
import { appStore } from './services/store';
function Bootstrap() {
  const {currentLang}=useLanguage();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const load = async () => { setStatus('loading'); try { await appStore.refresh(); setStatus('ready'); } catch (error) { setError(error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.'); setStatus('error'); } };
  useEffect(() => { void load(); }, []);
  if (status === 'loading') return <div className="p-12 text-center" role="status">YEREVANHUB…</div>;
  if (status === 'error') return <><div className="p-8 text-center space-y-4" role="alert"><p>{({fa:'ارتباط با سامانه برقرار نشد؛ عبارت‌های آماده همچنان در دسترس‌اند.',en:'Unable to connect. The offline phrasebook is still available.',ru:'Нет соединения. Офлайн-разговорник остаётся доступным.',hy:'Կապը չհաստատվեց։ Անցանց զրուցարանը հասանելի է։'})[currentLang]}</p><button onClick={load} className="button-primary mx-auto">{({fa:'تلاش دوباره',en:'Retry',ru:'Повторить',hy:'Կրկնել'})[currentLang]}</button></div><TranslatorView currentLang={currentLang} phrases={OFFLINE_PHRASES}/></>;

  return <SavedPlacesProvider><App /></SavedPlacesProvider>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Bootstrap /></LanguageProvider>);
