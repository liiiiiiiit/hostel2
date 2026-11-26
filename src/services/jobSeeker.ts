import type {SeekerState,SeekerDocument} from '../types/jobSeeker';
import {seekerText} from '../i18n/jobSeeker';
function failure(){const locale=document.documentElement.lang;return seekerText[locale as keyof typeof seekerText]?.error??seekerText.fa.error;}
export async function seekerFetch<T>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(path,{...init,credentials:'same-origin',headers:{'X-Requested-With':'YerevanHub','X-App-Language':document.documentElement.lang||'fa',...init.headers},signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data||typeof data!=='object'||data.success===false)throw Error(data?.error||failure());
 return data as T;
}
export async function loadSeeker(){
 const data=await seekerFetch<SeekerState>('/api/job-seeker');
 if(!data.profile||!Number.isInteger(data.profile.version)||typeof data.profile.fullName!=='string'||!['skills','languages','experience','education'].every(k=>Array.isArray(data.profile[k]))||!Array.isArray(data.documents)||!Array.isArray(data.savedJobs)||!Array.isArray(data.applications))throw Error(failure());
 return data;
}
export async function uploadSeekerResume(file:File){
 const doc=await seekerFetch<SeekerDocument>('/api/job-seeker/documents',{method:'POST',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name)},body:file});
 if(typeof doc.id!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(doc.id)||typeof doc.name!=='string'||!Number.isInteger(doc.bytes)||doc.bytes<=0||doc.bytes>2097152||!Number.isFinite(Date.parse(doc.createdAt)))throw Error(failure());
 return doc;
}
