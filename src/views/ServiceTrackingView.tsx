import {useEffect,useState} from 'react';
import {useLanguage} from '../context/LanguageContext';
import {directoryFetch} from '../services/services-directory';
import {serviceProviderText} from '../i18n/serviceProvider';
import {servicesText} from '../i18n/services';
import type {ServiceText} from '../types';
export function ServiceTrackingView({reference}:{reference:string}){
 const {currentLang}=useLanguage(),t=serviceProviderText[currentLang],st=servicesText[currentLang];
 const [value,setValue]=useState(reference),[token,setToken]=useState(reference),[revision,setRevision]=useState(0),[data,setData]=useState<{title:ServiceText;status:'new'|'contacted'|'closed';createdAt:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!token)return;const controller=new AbortController();setBusy(true);setData(null);setError('');directoryFetch<{title:ServiceText;status:'new'|'contacted'|'closed';createdAt:string}>('/api/service-requests/'+encodeURIComponent(token),currentLang,controller.signal).then(r=>{if(!controller.signal.aborted)setData(r);}).catch(e=>{if(!controller.signal.aborted)setError(e.message||t.error);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[token,revision,currentLang,t.error]);
 return <section className="page-shell min-w-0 space-y-5 py-8"><h1 className="text-2xl font-bold">{t.tracking}</h1><p>{t.privacy}</p><form className="surface space-y-3 rounded-xl p-5" onSubmit={e=>{e.preventDefault();setToken(value.trim());setRevision(n=>n+1);}}><label className="block min-w-0">{t.reference}<input className="field w-full" required dir="ltr" maxLength={36} value={value} onChange={e=>setValue(e.target.value)}/></label><button className="button-primary" disabled={busy}>{t.track}</button></form>{busy&&<p role="status">{t.loading}</p>}{error&&<p role="alert">{error}</p>}{data&&<article className="surface min-w-0 space-y-3 break-words rounded-xl p-5"><h2 className="text-xl font-bold">{data.title[currentLang]}</h2><p role="status">{st[data.status]}</p><time dateTime={data.createdAt}>{new Date(data.createdAt).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})}</time></article>}</section>;
}
