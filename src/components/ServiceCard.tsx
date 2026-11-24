import { MapPin, ShieldCheck, ArrowUpRight, Stethoscope, Utensils, Languages, Sparkles, Landmark, Grid2X2 } from 'lucide-react';
import type { AppLanguage, ServiceCategory, ServiceListing } from '../types';
import { servicesText } from '../i18n/services';
import { StayPhoto } from './StayPhoto';
export function ServiceCard({service,category,language,onNavigate}:{service:ServiceListing;category?:ServiceCategory;language:AppLanguage;onNavigate:(view:string,params?:Record<string,unknown>)=>void}){
 const t=servicesText[language];
 const Icon=({medical:Stethoscope,dining:Utensils,legal:Languages,wellness:Sparkles,finance:Landmark,other:Grid2X2} as const)[category?.icon??'other']??Grid2X2;
 return <article className="surface flex h-full min-w-0 flex-col overflow-hidden [overflow-wrap:anywhere]" data-testid="service-card">
  <StayPhoto src={service.coverImage||service.gallery[0]} alt={service.title[language]} className="h-44 w-full"/>
  <div className="flex flex-1 flex-col gap-3 p-5">
   <div className="flex flex-wrap gap-2 text-xs">{category&&<span className="status-pill inline-flex items-center gap-1"><Icon size={13} aria-hidden="true"/>{category.name[language]}</span>}{service.isVerified&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-800"><ShieldCheck size={13}/>{t.verified}</span>}{service.isFeatured&&<span className="status-pill">{t.featured}</span>}</div>
   <h3 className="text-lg font-bold text-[#142f2a]">{service.title[language]}</h3>
   <p className="text-sm leading-7 text-slate-500">{service.shortDescription[language]}</p>
   <p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={14}/><bdi>{[service.city,service.district].filter(Boolean).join(' · ')}</bdi></p>
   <div className="flex flex-wrap gap-2">{service.languagesSpoken.map(lang=><span key={lang} className="rounded-full border border-slate-200 px-2 py-1 text-xs">{t[lang]}</span>)}</div>
   <a className="button-secondary mt-auto inline-flex items-center justify-center gap-2" href={`/${language}/services/${encodeURIComponent(service.slug)}`} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onNavigate('service-detail',{slug:service.slug});}}}>{t.details}<ArrowUpRight size={15}/></a>
  </div>
 </article>;
}
