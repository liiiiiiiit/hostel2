import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { servicesText } from '../i18n/services';
import { fetchServices, fetchCategories } from '../services/services-directory';
import type { ServiceCategory, ServicePage } from '../types';
import { ServiceCard } from '../components/ServiceCard';
export function ServicesView({onNavigate,initial={}}:{onNavigate:(view:string,params?:Record<string,unknown>)=>void;initial?:Record<string,unknown>}){
 const {currentLang}=useLanguage(),t=servicesText[currentLang];
 const [search,setSearch]=useState(String(initial.search??'')),[category,setCategory]=useState(String(initial.category??'')),[city,setCity]=useState(String(initial.city??'')),[spoken,setSpoken]=useState(String(initial.language_spoken??'')),[verified,setVerified]=useState(initial.verified==='true'),[featured,setFeatured]=useState(initial.featured==='true');
 const [page,setPage]=useState(1),[retry,setRetry]=useState(0),[categories,setCategories]=useState<ServiceCategory[]>([]),[cities,setCities]=useState<string[]>([]),[result,setResult]=useState<ServicePage|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setBusy(true);setError('');
  const timer=setTimeout(()=>{
   const query=new URLSearchParams({page:String(page),pageSize:'12'});for(const [key,value] of Object.entries({search,category,city,language_spoken:spoken,verified:verified?'true':'',featured:featured?'true':''}))if(value)query.set(key,value);
   void Promise.all([fetchServices(query,currentLang,controller.signal),fetchCategories(currentLang,controller.signal)]).then(([list,options])=>{if(controller.signal.aborted)return;setResult(list);setCategories(options.categories);setCities(options.cities);}).catch(()=>{if(!controller.signal.aborted)setError(t.offline);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  },200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[search,category,city,spoken,verified,featured,page,retry,currentLang,t.offline]);
 const reset=()=>{setSearch('');setCategory('');setCity('');setSpoken('');setVerified(false);setFeatured(false);setPage(1);};
 return <section className="page-shell space-y-6 py-8" dir={currentLang==='fa'?'rtl':'ltr'}>
  <header><h1 className="text-3xl font-bold text-[#142f2a]">{t.title}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{t.intro}</p></header>
  <form onSubmit={e=>e.preventDefault()} className="surface grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label={t.search}>
   <label className="sm:col-span-2">{t.search}<div className="relative mt-1"><Search size={17} className="pointer-events-none absolute start-3 top-4 text-slate-400"/><input className="field w-full ps-10" type="search" maxLength={160} value={search} placeholder={t.searchHint} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div></label>
   <label>{t.category}<select aria-label={t.category} className="field mt-1 w-full" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="">{t.allCategories}</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.name[currentLang]}</option>)}</select></label>
   <label>{t.city}<select aria-label={t.city} className="field mt-1 w-full" value={city} onChange={e=>{setCity(e.target.value);setPage(1);}}><option value="">{t.allCities}</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>{t.language}<select aria-label={t.language} className="field mt-1 w-full" value={spoken} onChange={e=>{setSpoken(e.target.value);setPage(1);}}><option value="">{t.anyLanguage}</option>{(['fa','en','ru','hy'] as const).map(lang=><option key={lang} value={lang}>{t[lang]}</option>)}</select></label>
   <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={verified} onChange={e=>{setVerified(e.target.checked);setPage(1);}}/>{t.verifiedOnly}</label><label className="flex items-center gap-2"><input type="checkbox" checked={featured} onChange={e=>{setFeatured(e.target.checked);setPage(1);}}/>{t.featuredOnly}</label></div>
   <button type="button" className="button-secondary" onClick={reset}>{t.reset}</button>
  </form>
  {error?<div role="alert" className="surface space-y-3 p-5"><p>{error}</p><button type="button" className="button-secondary" onClick={()=>setRetry(v=>v+1)}>{t.retry}</button></div>:busy?<p role="status">{t.loading}</p>:<>
   <p role="status" className="text-sm text-slate-500">{t.results} · {(result?.total??0).toLocaleString(currentLang)}</p>
   {!result?.items.length?<p className="surface p-6">{t.empty}</p>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.items.map(service=><ServiceCard key={service.id} service={service} category={categories.find(c=>c.id===service.categoryId)} language={currentLang} onNavigate={onNavigate}/>)}</div>}
   {!!result?.total&&<nav className="flex flex-wrap items-center justify-center gap-3" aria-label={t.page}><button className="button-secondary" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>{t.previous}</button><span>{t.page} {page.toLocaleString(currentLang)} / {Math.ceil(result.total/result.pageSize).toLocaleString(currentLang)}</span><button className="button-secondary" disabled={page*result.pageSize>=result.total} onClick={()=>setPage(v=>v+1)}>{t.next}</button></nav>}
  </>}
 </section>;
}
