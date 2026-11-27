import {moderationText} from '../i18n/moderation';
import React, { useState, useEffect, useSyncExternalStore, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { appStore } from '../services/store';
import { seekerFetch } from '../services/jobSeeker';
import { recruitmentText, type RecruitmentText } from '../i18n/recruitment';
import { jobsText } from '../i18n/jobs';
import { applicationText } from '../i18n/jobApplications';
import { providerWords } from '../components/ProviderAccounts';
import { JobApplicants } from '../components/JobApplications';
import { can } from '../utils/authorization';
import { localDateInput } from '../utils/recruitment';
import { createRequestId } from '../utils/request-id';
import type { JobPosting } from '../types';
import type { RecruitmentState, EmployerOrganization, RecruitmentApplicant, Publication, Page } from '../types/recruitment';
type Query = {
    search: string;
    applicantSearch: string;
    publication: string;
    status: string;
    jobId: string;
    ownerId: string;
    page: number;
    jobPage: number;
    historyPage: number;
};
const initial: Query = { search: '', applicantSearch: '', publication: 'all', status: 'all', jobId: '', ownerId: '', page: 1, jobPage: 1, historyPage: 1 };
export function RecruitmentView({ admin = false }: {
    admin?: boolean;
}) {
    const { currentLang } = useLanguage(), t = recruitmentText[currentLang], j = jobsText[currentLang], a = applicationText[currentLang], p = providerWords[currentLang];
    const state = useSyncExternalStore(appStore.subscribe, appStore.getState), actor = state.currentUser;
    const [query, setQuery] = useState(initial), [data, setData] = useState<RecruitmentState | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [tab, setTab] = useState<'jobs' | 'applicants' | 'organization' | 'history'>('jobs'), [revision, setRevision] = useState(0), [org, setOrg] = useState<EmployerOrganization | null>(null);
    const [renewal, setRenewal] = useState<JobPosting | null>(null), [renewUntil, setRenewUntil] = useState('');
    const [draft, setDraft] = useState<JobPosting | null>(null), [publication, setPublication] = useState<Publication>('pending'), [expires, setExpires] = useState(''), [moderationNote, setModerationNote] = useState('');
    useEffect(() => { let live = true; if (!can(actor, 'jobs.manage')) {
        setLoading(false);
        return;
    } setLoading(true); const timer = setTimeout(() => { const params = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])); seekerFetch<RecruitmentState>('/api/recruitment?' + params).then(d => { if (!d?.jobs?.items || !d?.applications?.items || !d?.stats || !d.organization)
        throw Error(t.error); if (live) {
        setData(d);
        setOrg(d.organization);
        setError('');
    } }).catch(e => { if (live)
        setError(e instanceof Error ? e.message : t.error); }).finally(() => { if (live)
        setLoading(false); }); }, 150); return () => { live = false; clearTimeout(timer); }; }, [actor?.id, query, revision, t.error]);
    const refresh = () => {setLoading(true);setRevision(v => v + 1);};
    const filter = (key: keyof Query, value: string | number) => { if (key === 'ownerId') {
        setDraft(null);
        setRenewal(null);
        setData(null);
        setOrg(null);
    } setQuery(q => ({ ...q, [key]: value, ...(!['page', 'jobPage', 'historyPage'].includes(key) ? { page: 1, jobPage: 1, historyPage: 1 } : {}) })); };
    async function run(action: string, args: unknown[]) { if (busy || loading)
        return false; setBusy(true); setError(''); setNotice(''); try {
        const r = await appStore.action(action, args);
        if (!r.success)
            throw Error(r.error || t.error);
        setNotice(t.saved);
        refresh();
        return true;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : t.error);
        return false;
    }
    finally {
        setBusy(false);
    } }
    function edit(job?: JobPosting) { setRenewal(null); setError(''); setNotice(''); setDraft(job ? { ...job } : { id: createRequestId(), version: 0, manageable: true, title: '', company: org?.name ?? '', location: org?.city ?? '', schedule: '', description: '', contact: org?.phone ?? '', salary: null, period: 'month', status: 'open' }); setPublication(job?.publication === 'draft' ? 'draft' : job?.approved === false ? 'pending' : job ? 'approved' : 'pending'); if (actor?.role !== 'admin')
        setPublication(job?.publication === 'draft' ? 'draft' : 'pending'); setExpires(job?.expiresAt ? localDateInput(job.expiresAt) : job ? '' : localDateInput(new Date(Date.now() + 30 * 86400000).toISOString())); setModerationNote(actor?.role === 'admin' ? job?.moderationNote ?? '' : ''); }
    if (!can(actor, 'jobs.manage'))
        return <section className="page-shell py-8"><p>{p.menuLogin}</p></section>;
    const Heading = admin ? 'h2' : 'h1';
    return <section className={admin ? 'space-y-5 min-w-0' : 'page-shell py-8 space-y-5 min-w-0'} data-testid="recruitment-dashboard"><header className="surface p-5 rounded-2xl space-y-3"><Heading className="text-2xl font-bold">{t.dashboard}</Heading><p className="text-sm">{t.private}</p><div className="flex flex-wrap gap-2">{(['jobs', 'applicants', 'organization', 'history'] as const).map(x => <button key={x} type="button" aria-pressed={tab === x} className={tab === x ? 'button-primary' : 'button-secondary'} onClick={() => { setTab(x); setNotice(''); }}>{t[x]}</button>)}<button className="button-secondary" disabled={loading} onClick={refresh}>{t.refresh}</button></div></header>
 {actor?.role === 'admin' && <label className="block">{t.ownOrganization}<select className="field w-full" aria-label={t.ownOrganization} value={query.ownerId} onChange={e => filter('ownerId', e.target.value)}><option value="">{t.allOrganizations}</option>{data?.organizations.map(o => <option key={o.ownerId} value={o.ownerId}>{o.name}</option>)}</select></label>}
 {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{loading && <p role="status">{t.loading}</p>}
 {data && <><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{([['totalJobs', data.stats.jobs], ['open', data.stats.open], ['draft', data.stats.drafts], ['pending', data.stats.pending], ['expired', data.stats.expired], ['totalApplications', data.stats.applications]] as const).map(([k, v]) => <div className="surface p-3 rounded-xl min-w-0" key={k}><p className="text-sm">{t[k]}</p><strong className="text-2xl">{v.toLocaleString(currentLang)}</strong></div>)}</div>
 {tab === 'jobs' && <><div className="flex flex-wrap items-end gap-3"><label className="grow min-w-0">{t.search}<input className="field w-full" maxLength={120} value={query.search} onChange={e => filter('search', e.target.value)}/></label><label className="block min-w-0 max-w-full">{t.publication}<select className="field" aria-label={t.publication} value={query.publication} onChange={e => filter('publication', e.target.value)}>{(['all', 'draft', 'pending', 'approved', 'rejected', 'expired', 'closed'] as const).map(v => <option key={v} value={v}>{t[v]}</option>)}</select></label><button className="button-primary" disabled={busy || loading} onClick={() => edit()}>{j.add}</button></div>
 {renewal && <form className="surface p-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run('renewRecruitmentJob', [renewal.id, renewal.version, new Date(renewUntil).toISOString()]))
                setRenewal(null); }}><h3>{t.renew}: {renewal.title}</h3><label className="block min-w-0 max-w-full">{t.expires}<input className="field w-full" required type="datetime-local" value={renewUntil} onChange={e => setRenewUntil(e.target.value)}/></label><p>{t.renewNotice}</p><button className="button-primary" disabled={busy || loading}>{t.renew}</button><button type="button" className="button-secondary" disabled={busy || loading} onClick={() => setRenewal(null)}>{j.cancel}</button></form>}
 {draft ? <form className="surface p-5 space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await run('saveRecruitmentJob', [{ job: draft, publication, expiresAt: expires ? new Date(expires).toISOString() : null, moderationNote }]))
                    setDraft(null); }}><h3 className="text-xl font-semibold">{draft.version ? j.edit : j.add}</h3><fieldset disabled={busy || loading} className="min-w-0 grid gap-4 sm:grid-cols-2">{(['title', 'company', 'location', 'schedule', 'contact', 'description'] as const).map(key => <label className={'min-w-0 ' + (key === 'description' ? 'sm:col-span-2' : '')} key={key}>{j[key]}{key === 'description' ? <textarea className="field w-full" rows={5} required={publication !== 'draft' && publication !== 'rejected'} maxLength={4000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/> : <input className="field w-full" required={key === 'title' || publication !== 'draft' && publication !== 'rejected'} maxLength={{ title: 120, company: 120, location: 160, schedule: 160, contact: 250 }[key]} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/>}</label>)}
 <label className="block min-w-0 max-w-full">{j.salary}<input className="field w-full" type="number" min="1" max="1000000000" value={draft.salary ?? ''} onChange={e => setDraft({ ...draft, salary: e.target.value ? Number(e.target.value) : null })}/><small>{j.optional}</small></label><label className="block min-w-0 max-w-full">{j.period}<select className="field w-full" aria-label={j.period} value={draft.period} onChange={e => setDraft({ ...draft, period: e.target.value as JobPosting['period'] })}>{(['month', 'day', 'hour'] as const).map(v => <option key={v} value={v}>{j[v]}</option>)}</select></label>
 <label className="block min-w-0 max-w-full">{t.publication}<select className="field w-full" aria-label={t.publication} value={publication} onChange={e => setPublication(e.target.value as Publication)}>{(actor?.role === 'admin' ? ['draft', 'pending', 'approved', 'rejected'] as const : ['draft', 'pending'] as const).map(v => <option key={v} value={v}>{t[v]}</option>)}</select></label><label className="block min-w-0 max-w-full">{t.expires}<input className="field w-full" type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)}/><small>{t.noExpiry}</small></label>
 {actor?.role === 'admin' && <><label className="flex gap-2"><input type="checkbox" checked={publication === 'approved'} onChange={e => setPublication(e.target.checked ? 'approved' : 'pending')}/>{p.approved}</label><label className="block min-w-0 max-w-full">{t.moderationNote}<textarea className="field w-full" required={publication === 'rejected'} maxLength={2000} value={moderationNote} onChange={e => setModerationNote(e.target.value)}/></label></>}
 </fieldset><div className="flex flex-wrap gap-2"><button className="button-primary" disabled={busy || loading}>{j.save}</button><button type="button" className="button-secondary" disabled={busy || loading} onClick={() => setDraft(null)}>{j.cancel}</button></div></form> : <><div className="grid gap-4 md:grid-cols-2">{!data.jobs.items.length && <p>{t.empty}</p>}{data.jobs.items.map(job => <article key={job.id} className="surface p-5 space-y-3 min-w-0 break-words"><h3 className="text-xl font-bold" dir="auto">{job.title}</h3>{job.moderationStatus&&<p>{moderationText[currentLang][job.moderationStatus]}</p>}{job.moderationFeedback&&<p dir="auto">{job.moderationFeedback}</p>}<p dir="auto">{job.company} · {job.location}</p><p className="status-pill">{t[job.publication ?? 'pending']}</p><p dir="auto" className="whitespace-pre-line">{job.description}</p>{job.moderationNote && <p dir="auto">{job.moderationNote}</p>}{job.expiresAt && <p>{t.expires}: <time dateTime={job.expiresAt}>{new Date(job.expiresAt).toLocaleString(currentLang, { timeZoneName: 'short' })}</time></p>}<JobApplicants applications={(state.jobApplications ?? []).filter(a => a.jobId === job.id).slice(0, 5)} onUpdated={refresh} disabled={busy || loading}/><button className="button-secondary" onClick={() => { setTab('applicants'); filter('jobId', job.id); }}>{t.applicants} ({(state.jobApplications ?? []).filter(a => a.jobId === job.id).length.toLocaleString(currentLang)})</button><div className="flex flex-wrap gap-2"><button className="button-secondary" disabled={busy || loading} onClick={() => edit(job)}>{j.edit}</button><button className="button-secondary" disabled={busy || loading || job.status === 'closed'} onClick={() => void run('closeRecruitmentJob', [job.id, job.version])}>{t.close}</button><button className="button-secondary" disabled={busy || loading} onClick={() => { setDraft(null); setRenewal(job); setRenewUntil(localDateInput(new Date(Date.now() + 30 * 86400000).toISOString())); }}>{t.renew}</button><button className="button-secondary" disabled={busy || loading} onClick={() => { if (window.confirm(p.remove + ' · ' + job.title))
                    void run('deleteJob', [job.id, job.version]); }}>{p.remove}</button></div></article>)}</div><Pagination data={data.jobs} t={t} lang={currentLang} change={n => filter('jobPage', n)}/><p className="text-sm">{t.renewNotice}</p></>}
 </>}
 {tab === 'applicants' && <><div className="grid gap-3 md:grid-cols-3"><label className="min-w-0">{t.applicantSearch}<input className="field w-full" maxLength={120} value={query.applicantSearch} onChange={e => filter('applicantSearch', e.target.value)}/></label><label className="block min-w-0 max-w-full">{a.status}<select className="field w-full" aria-label={a.status} value={query.status} onChange={e => filter('status', e.target.value)}><option value="all">{t.all}</option>{Object.keys(data.stats.statuses).map(v => <option key={v} value={v}>{a[v]}</option>)}</select></label><label className="block min-w-0 max-w-full">{t.jobFilter}<select className="field w-full" aria-label={t.jobFilter} value={query.jobId} onChange={e => filter('jobId', e.target.value)}><option value="">{t.all}</option>{(state.jobs ?? []).filter(j => j.manageable).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></label></div><div className="flex flex-wrap gap-3">{Object.entries(data.stats.statuses).map(([k, v]) => <span key={k}>{a[k]}: {v.toLocaleString(currentLang)}</span>)}</div>{!data.applications.items.length && <p>{t.empty}</p>}{data.applications.items.map(item => <Candidate key={item.reference} item={item} lang={currentLang} busy={busy || loading} run={run} refresh={refresh}/>)}<Pagination data={data.applications} t={t} lang={currentLang} change={n => filter('page', n)}/></>}
 {tab === 'organization' && org && <form className="surface p-5 space-y-4" onSubmit={e => { e.preventDefault(); void run('saveEmployerOrganization', [org]); }}><h3>{t.ownOrganization}: {org.name}</h3><fieldset disabled={busy || loading} className="min-w-0 grid gap-3 md:grid-cols-2">{(['name', 'website', 'phone', 'city', 'description'] as const).map(k => <label key={k} className={'min-w-0 ' + (k === 'description' ? 'md:col-span-2' : '')}>{t[k]}{k === 'description' ? <textarea className="field w-full" rows={5} maxLength={3000} value={org[k]} onChange={e => setOrg({ ...org, [k]: e.target.value })}/> : <input className="field w-full" type={k === 'website' ? 'url' : 'text'} required={k === 'name'} maxLength={k === 'website' ? 500 : k === 'phone' ? 100 : 160} value={org[k]} onChange={e => setOrg({ ...org, [k]: e.target.value })}/>}</label>)}</fieldset><button className="button-primary" disabled={busy || loading}>{t.save}</button></form>}
 {tab === 'history' && <><p>{t.legacyHistory}</p>{!data.history.items.length && <p>{t.empty}</p>}<ol className="space-y-3">{data.history.items.map(e => <li key={e.id} className="surface p-4 min-w-0 break-words"><p>{t[e.kind] ?? t.activity}</p><time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString(currentLang, { timeZoneName: 'short' })}</time><p className="text-sm"><bdi>{e.targetId}</bdi></p>{e.details.previous && e.details.next && <p>{a[String(e.details.previous)]} → {a[String(e.details.next)]}</p>}</li>)}</ol><Pagination data={data.history} t={t} lang={currentLang} change={n => filter('historyPage', n)}/></>}
 </>}
 </section>;
}
function Pagination({ data, t, lang, change }: {
    data: Page<unknown>;
    t: RecruitmentText;
    lang: string;
    change: (page: number) => void;
}) { return <nav className="flex flex-wrap items-center gap-3 py-3" aria-label={t.page}><button type="button" className="button-secondary" disabled={data.page <= 1} onClick={() => change(data.page - 1)}>{t.previous}</button><span>{t.page} {data.page.toLocaleString(lang)} / {data.pages.toLocaleString(lang)} · {data.total.toLocaleString(lang)}</span><button type="button" className="button-secondary" disabled={data.page >= data.pages} onClick={() => change(data.page + 1)}>{t.next}</button></nav>; }
function Candidate({ item, lang, busy, run, refresh }: {
    item: RecruitmentApplicant;
    lang: 'fa' | 'en' | 'ru' | 'hy';
    busy: boolean;
    run: (action: string, args: unknown[]) => Promise<boolean>;
    refresh: () => void;
}) {
    const t = recruitmentText[lang], a = applicationText[lang];
    const [note, setNote] = useState(item.note), [noteVersion, setNoteVersion] = useState(item.noteVersion);
    const noteDirty = useRef(false);
    const active = item.interviews.find(i => i.state === 'proposed');
    const [startsAt, setStartsAt] = useState(localDateInput(active?.startsAt ?? new Date(Date.now() + 86400000).toISOString())), [minutes, setMinutes] = useState(active?.minutes ?? 30), [kind, setKind] = useState(active?.kind ?? 'video'), [location, setLocation] = useState(active?.location ?? '');
    useEffect(() => { if (!noteDirty.current) {
        setNote(item.note);
        setNoteVersion(item.noteVersion);
    } }, [item.noteVersion, item.note]);
    useEffect(() => { setStartsAt(localDateInput(active?.startsAt ?? new Date(Date.now() + 86400000).toISOString())); setMinutes(active?.minutes ?? 30); setKind(active?.kind ?? 'video'); setLocation(active?.location ?? ''); }, [active?.id]);
    const terminal = ['accepted', 'declined', 'withdrawn'].includes(item.status);
    return <article className="surface p-5 space-y-4 min-w-0 break-words" data-testid={'recruitment-applicant-' + item.reference}><h3 className="text-xl font-bold" dir="auto">{item.name}</h3><p dir="auto">{item.jobTitle} · {item.company}</p><p>{a[item.status]}</p><JobApplicants applications={[item]} onUpdated={refresh} disabled={busy}/>
 <form onSubmit={async (e) => { e.preventDefault(); if (await run('saveRecruitmentNote', [item.reference, noteVersion, note]))
        noteDirty.current = false; }}><label className="block min-w-0 max-w-full">{t.note}<textarea className="field w-full" maxLength={5000} rows={3} disabled={busy || item.status === 'withdrawn'} value={note} onChange={e => { noteDirty.current = true; setNote(e.target.value); }}/></label><button className="button-secondary mt-2" disabled={busy || item.status === 'withdrawn'}>{t.saveNote}</button><button type="button" className="button-secondary mt-2" disabled={busy} onClick={() => { noteDirty.current = false; setNote(item.note); setNoteVersion(item.noteVersion); }}>{t.refresh}</button></form>
 <p className="text-sm">{t.proposalNotice}</p>{item.interviews.map(i => <section key={i.id} className="rounded-xl border p-3 space-y-2"><p>{t[i.state]}</p><time dateTime={i.startsAt}>{new Date(i.startsAt).toLocaleString(lang, { timeZoneName: 'short' })}</time><p>{i.kind === 'phone' ? t.phoneInterview : t[i.kind]} · {i.minutes}</p><p dir="auto">{i.location}</p>{i.state === 'proposed' && !terminal && <div className="flex flex-wrap gap-2"><button className="button-secondary" disabled={busy} onClick={() => { if (window.confirm(t.confirm))
        void run('finishRecruitmentInterview', [i.id, 'cancelled', true]); }}>{t.cancelInterview}</button><button className="button-secondary" disabled={busy || Date.parse(i.startsAt) > Date.now()} onClick={() => { if (window.confirm(t.confirm))
        void run('finishRecruitmentInterview', [i.id, 'completed', true]); }}>{t.completeInterview}</button></div>}</section>)}
 {!terminal && <form onSubmit={e => { e.preventDefault(); void run('scheduleRecruitmentInterview', [{ reference: item.reference, previousStatus: item.status, previousId: active?.id ?? null, startsAt: new Date(startsAt).toISOString(), minutes, kind, location }]); }}><fieldset className="min-w-0 grid gap-3 md:grid-cols-2" disabled={busy}><label className="block min-w-0 max-w-full">{t.startsAt}<input required className="field w-full" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}/></label><label className="block min-w-0 max-w-full">{t.minutes}<input required className="field w-full" type="number" min="15" max="240" value={minutes} onChange={e => setMinutes(Number(e.target.value))}/></label><label className="block min-w-0 max-w-full">{t.kind}<select className="field w-full" aria-label={t.kind} value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{(['video', 'phone', 'in_person'] as const).map(k => <option key={k} value={k}>{k === 'phone' ? t.phoneInterview : t[k]}</option>)}</select></label><label className="block min-w-0 max-w-full">{t.location}<input required maxLength={500} className="field w-full" value={location} onChange={e => setLocation(e.target.value)}/></label></fieldset><button className="button-primary mt-3" disabled={busy}>{active ? t.reschedule : t.schedule}</button></form>}
 </article>;
}
