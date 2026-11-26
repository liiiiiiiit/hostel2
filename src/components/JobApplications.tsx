import {loadSeeker} from '../services/jobSeeker';
import {seekerText} from '../i18n/jobSeeker';
import type {SeekerState} from '../types/jobSeeker';
import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { applicationText } from '../i18n/jobApplications';
import { jobsText } from '../i18n/jobs';
import { appStore } from '../services/store';
import type { JobApplication, JobPosting } from '../types';
import { createRequestId } from '../utils/request-id';
import { isTourPhone } from '../utils/tour-contact';

export function ApplyForJob({job,onApplied}: {job: JobPosting;onApplied?:()=>void}) {
  const {currentLang} = useLanguage(), t = applicationText[currentLang];
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false);
  const [reference,setReference] = useState(''), [error,setError] = useState('');
  const user=appStore.getCurrentUser(), st=seekerText[currentLang];
  const [seeker,setSeeker]=useState<SeekerState|null>(null),[loadFailed,setLoadFailed]=useState(false);
  useEffect(()=>{let live=true;setSeeker(null);setLoadFailed(false);if(open&&user)loadSeeker().then(data=>{if(live)setSeeker(data);}).catch(()=>{if(live){setLoadFailed(true);setError(st.error);}});return()=>{live=false;};},[open,user?.id,st.error]);
  const preparing=Boolean(open&&user&&!seeker&&!loadFailed);
  const attempt = useRef({body:'',id:''});
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || preparing) return;
    const form = new FormData(event.currentTarget);
    const contact = String(form.get('contact')).trim();
    if (!isTourPhone(contact) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setError(t.invalid); return;
    }
    const input = {jobId:job.id, version:job.version, name:String(form.get('name')).trim(), contact, message:String(form.get('message')).trim(),consent:true as const,...(user?{accountRequired:true as const,shareProfile:form.get('shareProfile')==='on',...(form.get('documentId')?{documentId:String(form.get('documentId'))}:{})}:{})};
    const body = JSON.stringify(input);
    if (attempt.current.body !== body) attempt.current = {body,id:createRequestId()};
    setBusy(true); setError('');
    try {
      const result = await appStore.action('applyForJob',[{...input,requestId:attempt.current.id}]);
      if (result.success && result.applicationReference) {setReference(result.applicationReference);onApplied?.();}
      else setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  if (reference) return <div role="status" className="rounded-xl border p-4"><p>{t.success}</p>
    <p>{t.reference} · <code className="select-all break-all" dir="ltr">{reference}</code></p></div>;
  if (!open) return <button type="button" className="button-primary" onClick={()=>{setLoadFailed(false);setOpen(true);}}>{t.apply}</button>;
  return <form onSubmit={submit} className="space-y-3 border-t pt-4">
    {preparing&&<p role="status">{st.loading}</p>}
    <fieldset disabled={busy||preparing} className="grid gap-3 min-w-0">
      <label>{t.name}<input className="field w-full" key={seeker?.profile.fullName??''} defaultValue={seeker?.profile.fullName??user?.name??''} name="name" required maxLength={120} autoComplete="name"/></label>
      <label>{t.contact}<input className="field w-full" key={seeker?.profile.contact??''} defaultValue={seeker?.profile.contact??user?.email??''} name="contact" required maxLength={250} dir="auto"/></label>
      <label>{t.message}<textarea className="field w-full" name="message" maxLength={3000} rows={4}/></label>
      {user&&<><label className="flex items-start gap-2"><input type="checkbox" name="shareProfile" disabled={!seeker?.profile.version}/>{st.shareProfile}</label>{!seeker?.profile.version&&<p className="text-sm">{st.saveFirst}</p>}
      <label>{st.resume}<select className="field w-full" name="documentId" aria-label={st.resume}><option value="">{st.noResume}</option>{seeker?.documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label></>}
      <label className="flex items-start gap-2"><input type="checkbox" required name="consent"/>{st.consent}</label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2"><button className="button-primary" disabled={busy||preparing}>{t.send}</button>
      <button type="button" className="button-secondary" disabled={busy} onClick={()=>{setOpen(false);setError('');}}>{jobsText[currentLang].cancel}</button></div>
  </form>;
}

export function JobApplicants({applications}: {applications: JobApplication[]}) {
  const {currentLang} = useLanguage(), t = applicationText[currentLang], st=seekerText[currentLang];
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function update(item: JobApplication, next:JobApplication['status']) {
    setBusy(true);setError('');
    try {
      const result = await appStore.action('reviewApplication',[item.reference,item.status,next]);
      if (!result.success) setError(result.error ?? '');
    } finally { setBusy(false); }
  }
  return <details className="border-t pt-3"><summary className="cursor-pointer font-semibold">{t.applications} ({applications.length.toLocaleString(currentLang)})</summary>
    {error && <p role="alert">{error}</p>}{!applications.length && <p>{t.empty}</p>}
    {applications.map(item=><section key={item.reference} className="mt-3 space-y-2 rounded-xl border p-3">
      <h4 className="font-semibold" dir="auto">{item.name}</h4><p>{t.contact} · <bdi>{item.contact}</bdi></p>
      {item.message && <p dir="auto" className="whitespace-pre-line">{item.message}</p>}
      <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})}</time>
      {item.sharedProfile&&<details><summary>{st.profile}</summary><p dir="auto">{item.sharedProfile.headline}</p><p dir="auto">{item.sharedProfile.about}</p><p dir="auto">{item.sharedProfile.city} · {item.sharedProfile.contact}</p><p dir="auto">{item.sharedProfile.desiredRole} · {item.sharedProfile.preferredLocation}</p><p>{st.minimumSalary}: {item.sharedProfile.minimumSalary??'—'}</p><p>{item.sharedProfile.employmentTypes.map(x=>st[x]).join(' · ')} {item.sharedProfile.remote?st.remote:''}</p><p dir="auto">{item.sharedProfile.skills.join(' · ')}</p><p>{item.sharedProfile.languages.map(l=>l.code+' · '+st[l.proficiency]).join(', ')}</p>{item.sharedProfile.experience.map(x=><p key={x.id} dir="auto">{x.title} · {x.organization} · {x.startDate} — {x.endDate}<br/>{x.description}</p>)}{item.sharedProfile.education.map(x=><p key={x.id} dir="auto">{x.qualification} · {x.institution} · {x.startDate} — {x.endDate}<br/>{x.description}</p>)}</details>}
      {item.resume&&<a className="button-secondary" href={'/api/job-applications/'+item.reference+'/resume'}>{st.download} · {item.resume.name}</a>}
      {item.status==='withdrawn'?<p>{t.withdrawn}</p>:<label className="block">{t.status}<select className="field w-full" disabled={busy} value={item.status} onChange={e=>void update(item,e.target.value as JobApplication['status'])}>
        {(['received','reviewing','accepted','declined'] as const).map(status=><option key={status} value={status}>{t[status]}</option>)}
      </select></label>}
    </section>)}
  </details>;
}
