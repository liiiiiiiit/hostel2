import type { AppLanguage, ServiceCategory, ServiceListing, ServicePage } from '../types';
import { servicesText } from '../i18n/services';
export async function directoryFetch<T>(path:string,lang:AppLanguage,signal?:AbortSignal):Promise<T>{
 const controller=new AbortController();const abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,15000);
 try {
  const response=await fetch(path,{credentials:'same-origin',headers:{'X-App-Language':lang},signal:controller.signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||servicesText[lang].offline);return data as T;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}

}
export const fetchCategories=(lang:AppLanguage,signal?:AbortSignal)=>directoryFetch<{categories:ServiceCategory[];cities:string[]}>('/api/service-categories',lang,signal);
export const fetchServices=(query:URLSearchParams,lang:AppLanguage,signal?:AbortSignal)=>directoryFetch<ServicePage>('/api/services?'+query,lang,signal);
export const fetchService=(slug:string,lang:AppLanguage,signal?:AbortSignal)=>directoryFetch<{service:ServiceListing}>('/api/services/'+encodeURIComponent(slug),lang,signal);
