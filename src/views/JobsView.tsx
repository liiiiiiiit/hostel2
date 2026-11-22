import { providerWords } from '../components/ProviderAccounts';
import { ReferenceTracker } from '../components/ReferenceTracker';
import { ApplyForJob, JobApplicants } from '../components/JobApplications';
import React, { useState, useSyncExternalStore } from 'react';
import { BriefcaseBusiness, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { jobsText } from '../i18n/jobs';
import { appStore } from '../services/store';
import type { JobPosting } from '../types';
import { createRequestId } from '../utils/request-id';

type Draft = Omit<JobPosting, 'manageable'>;
const fresh = (): Draft => ({
  id: createRequestId(), version: 0, title: '', company: '', location: '', schedule: '',
  description: '', contact: '', salary: null, period: 'month', status: 'open',
});

export function JobsView({ mode, onEmployer, onLogin }: {
  mode: 'public' | 'employer' | 'admin'; onEmployer?: () => void; onLogin?: () => void;
}) {
  const { currentLang } = useLanguage();
  const t = jobsText[currentLang], p = providerWords[currentLang];
  const state = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const managing = mode !== 'public';
  const postings = (state.jobs ?? []).filter(job => managing ? job.manageable : job.status === 'open' && job.approved!==false);
  function edit(job?: JobPosting) {
    setMessage('');
    setDraft(job ? { ...job } : fresh());
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const result = await appStore.action('saveJob', [draft]);
      setMessage(result.success ? t.saved : result.error ?? '');
      if (result.success) setDraft(null);
    } finally { setBusy(false); }
  }
  const authorized = state.currentUser?.role==='admin'||state.currentUser?.role==='job_provider'||postings.some(job=>job.manageable);
  if(managing&&!authorized)return <section className="page-shell py-8"><button className="button-primary" onClick={onLogin}>{t.login}</button></section>;
  const Heading = mode === 'admin' ? 'h2' : 'h1';
  return <section className={mode === 'admin' ? 'space-y-5' : 'page-shell py-8 space-y-5'}>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Heading className="text-2xl font-bold">{mode === 'public' ? t.jobs : mode === 'admin' ? t.manage : t.employer}</Heading>
      {mode === 'public' ? <button className="button-secondary" onClick={onEmployer}><BriefcaseBusiness size={18}/>{t.employer}</button>
        : state.currentUser && !draft && <button className="button-primary" onClick={() => edit()}>{t.add}</button>}
    </header>
    {!managing && <ReferenceTracker kind="job" />}
    {message && <p role="status">{message}</p>}
    {managing && !state.currentUser ? <button className="button-primary" onClick={onLogin}>{t.login}</button> :
      draft && managing ? <form className="surface p-5 space-y-4" onSubmit={submit}>
        <h3 className="text-xl font-semibold">{draft.version ? t.edit : t.add}</h3>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {(['title','company','location','schedule','contact','description'] as const).map(key =>
            <label key={key} className={key === 'description' ? 'sm:col-span-2' : ''}>{t[key]}
              {key === 'description' ? <textarea required maxLength={4000} rows={5} className="field mt-1 w-full" value={draft[key]} onChange={e => setDraft({...draft, [key]: e.target.value})}/>
                : <input required maxLength={{ title:120,company:120,location:160,schedule:160,contact:250 }[key]} className="field mt-1 w-full" value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/>}
            </label>)}
          <label>{t.salary}<input className="field mt-1 w-full" type="number" min="1" max="1000000000" step="1" value={draft.salary ?? ''} onChange={e => setDraft({...draft,salary:e.target.value ? Number(e.target.value) : null})}/><small>{t.optional}</small></label>
          <label>{t.period}<select className="field mt-1 w-full" value={draft.period} onChange={e => setDraft({...draft,period:e.target.value as Draft['period']})}>{(['month','day','hour'] as const).map(key => <option key={key} value={key}>{t[key]}</option>)}</select></label>
          <label>{t.status}<select className="field mt-1 w-full" value={draft.status} onChange={e => setDraft({...draft,status:e.target.value as Draft['status']})}>{(['open','closed'] as const).map(key => <option key={key} value={key}>{t[key]}</option>)}</select></label>
          {state.currentUser?.role==='admin'&&<label><input type="checkbox" checked={draft.approved!==false} onChange={e=>setDraft({...draft,approved:e.target.checked})}/> {p.approved}</label>}
        </fieldset>
        <div className="flex gap-3"><button disabled={busy} className="button-primary">{t.save}</button><button disabled={busy} className="button-secondary" type="button" onClick={() => setDraft(null)}>{t.cancel}</button></div>
      </form> : <div className="grid gap-4 md:grid-cols-2">
        {!postings.length && <p className="surface p-5">{managing ? t.none : t.empty}</p>}
        {postings.map(job => <article key={job.id} className="surface p-5 space-y-3 min-w-0 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-xl font-bold" dir="auto">{job.title}</h3>{managing && <span className="status-pill">{t[job.status]}</span>}</div>
          <p dir="auto">{job.company}</p><p className="flex items-center gap-2"><MapPin size={16}/><bdi>{job.location}</bdi></p>
          <p>{t.salary} · <strong>{job.salary === null ? t.negotiable : job.salary.toLocaleString(currentLang) + ' / ' + t[job.period]}</strong></p>
          <p dir="auto">{job.schedule}</p><p className="whitespace-pre-line" dir="auto">{job.description}</p>
          <p><strong>{t.contact}</strong> · <bdi>{job.contact}</bdi></p>
          {!managing && <ApplyForJob job={job} />}
          {managing && <JobApplicants applications={(state.jobApplications ?? []).filter(item => item.jobId === job.id)} />}
          {managing && job.approved===false && <p>{p.waiting}</p>}
          {managing && <button className="button-secondary" onClick={() => edit(job)}>{t.edit}</button>}
          {managing && <button className="button-secondary" disabled={busy} onClick={async()=>{if(!window.confirm(p.remove+' · '+job.title))return;setBusy(true);try{const r=await appStore.action('deleteJob',[job.id,job.version]);setMessage(r.error??t.saved);}finally{setBusy(false);}}}>{p.remove}</button>}
        </article>)}
      </div>}
  </section>;
}
