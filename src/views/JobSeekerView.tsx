import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { appStore } from '../services/store';
import { loadSeeker, uploadSeekerResume } from '../services/jobSeeker';
import { seekerText, type SeekerText } from '../i18n/jobSeeker';
import { applicationText } from '../i18n/jobApplications';
import { ApplyForJob } from '../components/JobApplications';
import { ReferenceTracker } from '../components/ReferenceTracker';
import { AccountSettings } from '../components/AccountSettings';
import type { SeekerState, SeekerProfile, SeekerExperience, SeekerEducation } from '../types/jobSeeker';
import { createRequestId } from '../utils/request-id';
const tabs = ['profile', 'jobs', 'saved', 'history', 'documents', 'privacy'] as const;
export function JobSeekerView() {
    const { currentLang } = useLanguage(), t = seekerText[currentLang], a = applicationText[currentLang];
    const state = useSyncExternalStore(appStore.subscribe, appStore.getState), user = state.currentUser;
    const [data, setData] = useState<SeekerState | null>(null), [profile, setProfile] = useState<SeekerProfile | null>(null), [tab, setTab] = useState<typeof tabs[number]>('profile'), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(''), [reload, setReload] = useState(0);
    const [skillsDraft, setSkillsDraft] = useState('');
    const [search, setSearch] = useState(''), [city, setCity] = useState(''), [salary, setSalary] = useState(''), [period, setPeriod] = useState(''), [confirm, setConfirm] = useState(false);
    useEffect(() => { let live = true; setError(''); loadSeeker().then(d => { if (live) {
        setData(d);
        setProfile(d.profile);
        setSkillsDraft(d.profile.skills.join(', '));
    } }).catch(() => { if (live)
        setError(t.error); }); return () => { live = false; }; }, [user?.id, reload, t.error]);
    const refresh = () => setReload(n => n + 1);
    async function run(action: string, args: unknown[]) { if (busy)
        return; setBusy(true); setError(''); setNotice(''); try {
        const r = await appStore.action(action, args);
        if (!r.success)
            throw Error(r.error || t.error);
        setNotice(t.savedOk);
        refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : t.error);
    }
    finally {
        setBusy(false);
    } }
    if (!user)
        return <section className="page-shell py-8"><p>{t.signIn}</p></section>;
    if (!data || !profile)
        return <section className="page-shell py-8"><p role={error ? 'alert' : 'status'}>{error || t.loading}</p>{error && <button className="button-secondary" onClick={refresh}>{t.retry}</button>}</section>;
    const set = <K extends keyof SeekerProfile>(k: K, v: SeekerProfile[K]) => setProfile(p => p ? { ...p, [k]: v } : p);
    const field = (key: 'fullName' | 'headline' | 'city' | 'contact' | 'about' | 'desiredRole' | 'preferredLocation', label: string, limit: number, multi = false) => <label className="block min-w-0">{label}{multi ? <textarea className="field w-full" value={profile[key]} onChange={e => set(key, e.target.value)} maxLength={limit} rows={4}/> : <input className="field w-full" value={profile[key]} onChange={e => set(key, e.target.value)} maxLength={limit} required={key === 'fullName'} dir="auto"/>}</label>;
    const jobs = (state.jobs ?? []).filter(j => j.status === 'open' && j.approved !== false && j.acceptingApplications !== false && (!search || `${j.title} ${j.company} ${j.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && (!city || j.location.toLocaleLowerCase().includes(city.toLocaleLowerCase())) && (!period || j.period === period) && (!salary || j.salary !== null && j.salary >= Number(salary)));
    return <section className="page-shell space-y-5 py-8 min-w-0"><h1 className="text-2xl font-bold">{t.panel}</h1><p className="text-sm">{t.private}</p>
 <nav aria-label={t.panel} className="flex flex-wrap gap-2">{tabs.map(x => <button key={x} type="button" aria-pressed={tab === x} className={tab === x ? 'button-primary' : 'button-secondary'} onClick={() => { setTab(x); setNotice(''); }}>{t[x]}</button>)}</nav>
 {error && <p role="alert">{error} <button type="button" onClick={refresh}>{t.retry}</button></p>}{notice && <p role="status">{notice}</p>}
 {tab === 'profile' && <form onSubmit={e => { e.preventDefault(); void run('saveSeekerProfile', [{ ...profile, skills: skillsDraft.split(/[,،]/).map(x => x.trim()).filter(Boolean) }]); }}><fieldset disabled={busy} className="min-w-0 space-y-5"><div className="grid gap-3 md:grid-cols-2">{field('fullName', a.name, 120)}{field('headline', t.headline, 160)}{field('city', t.city, 120)}{field('contact', a.contact, 250)}</div>{field('about', t.about, 3000, true)}
 <h2 className="font-bold">{t.preferences}</h2><div className="grid gap-3 md:grid-cols-2">{field('desiredRole', t.desiredRole, 160)}{field('preferredLocation', t.preferredLocation, 160)}<label>{t.minimumSalary}<input className="field w-full" type="number" min="0" max="1000000000" value={profile.minimumSalary ?? ''} onChange={e => set('minimumSalary', e.target.value === '' ? null : Number(e.target.value))}/></label></div>
 <fieldset className="min-w-0 flex flex-wrap gap-3"><legend>{t.employmentTypes}</legend>{(['full_time', 'part_time', 'contract', 'internship'] as const).map(x => <label key={x} className="flex gap-2"><input type="checkbox" checked={profile.employmentTypes.includes(x)} onChange={e => set('employmentTypes', e.target.checked ? [...profile.employmentTypes, x] : profile.employmentTypes.filter(y => y !== x))}/>{t[x]}</label>)}</fieldset><label className="flex gap-2"><input type="checkbox" checked={profile.remote} onChange={e => set('remote', e.target.checked)}/>{t.remote}</label>
 <label className="block">{t.skills}<input className="field w-full" name="skills" value={skillsDraft} onChange={e => setSkillsDraft(e.target.value)} maxLength={2430}/></label>
 <fieldset className="min-w-0 flex flex-wrap gap-4"><legend>{t.languages}</legend>{(['fa', 'en', 'ru', 'hy'] as const).map(code => <label key={code}>{new Intl.DisplayNames(currentLang, { type: 'language' }).of(code)}<select className="field" aria-label={t.languages + ' ' + code} value={profile.languages.find(l => l.code === code)?.proficiency ?? ''} onChange={e => set('languages', [...profile.languages.filter(l => l.code !== code), ...(e.target.value ? [{ code, proficiency: e.target.value as SeekerProfile['languages'][number]['proficiency'] }] : [])])}><option value="">—</option>{(['basic', 'conversational', 'fluent', 'native'] as const).map(v => <option key={v} value={v}>{t[v]}</option>)}</select></label>)}</fieldset>
 <CareerRows kind="experience" rows={profile.experience} onChange={rows => set('experience', rows as SeekerExperience[])} t={t}/><CareerRows kind="education" rows={profile.education} onChange={rows => set('education', rows as SeekerEducation[])} t={t}/><button className="button-primary">{t.save}</button></fieldset></form>}
 {tab === 'jobs' && <><div className="grid gap-3 sm:grid-cols-2"><label>{t.search}<input className="field w-full" value={search} onChange={e => setSearch(e.target.value)}/></label><label>{t.city}<input className="field w-full" value={city} onChange={e => setCity(e.target.value)}/></label><label>{t.minimumSalary}<input className="field w-full" type="number" min="0" value={salary} onChange={e => setSalary(e.target.value)}/></label><label>{t.period}<select className="field w-full" aria-label={t.period} value={period} onChange={e => setPeriod(e.target.value)}><option value="">{t.all}</option>{(['month', 'day', 'hour'] as const).map(x => <option key={x} value={x}>{t[x]}</option>)}</select></label></div>{!jobs.length && <p>{t.empty}</p>}<div className="grid gap-4 md:grid-cols-2">{jobs.map(j => <article key={j.id} className="surface rounded-2xl border p-4 space-y-3 min-w-0 break-words"><h2 className="font-bold" dir="auto">{j.title}</h2><p dir="auto">{j.company} · {j.location}</p><p>{j.salary?.toLocaleString(currentLang) ?? '—'} AMD · {t[j.period]}</p><p dir="auto" className="whitespace-pre-line">{j.description}</p><button className="button-secondary" disabled={busy} onClick={() => void run('saveSeekerJob', [j.id, !data.savedJobs.some(s => s.jobId === j.id)])}>{data.savedJobs.some(s => s.jobId === j.id) ? t.unsave : t.save}</button>{data.applications.some(s => s.jobId === j.id && s.status !== 'withdrawn') ? <p>{a.success}</p> : <ApplyForJob job={j} onApplied={refresh}/>}</article>)}</div></>}
 {tab === 'saved' && <div className="grid gap-4 md:grid-cols-2">{!data.savedJobs.length && <p>{t.empty}</p>}{data.savedJobs.map(j => <article key={j.jobId} className="surface rounded-2xl border p-4 min-w-0 space-y-3"><h2 dir="auto">{j.title}</h2><p dir="auto">{j.company} · {j.location}</p>{j.available ? <a className="button-secondary" href={'#/jobs?jobId=' + j.jobId}>{t.jobs}</a> : <p>{t.unavailable}</p>}<button className="button-secondary" disabled={busy} onClick={() => void run('saveSeekerJob', [j.jobId, false])}>{t.unsave}</button></article>)}</div>}
 {tab === 'history' && <><p>{t.legacy}</p>{!data.applications.length && <p>{t.empty}</p>}{data.applications.map(x => <article key={x.reference} className="surface border rounded-2xl p-4 space-y-3 min-w-0 break-words"><h2 dir="auto">{x.title} · {x.company}</h2><p>{a[x.status]}</p><time dateTime={x.submittedAt}>{new Date(x.submittedAt).toLocaleString(currentLang, { timeZone: 'Asia/Yerevan' })}</time><p><code dir="ltr" className="break-all">{x.reference}</code></p>{(x.profileShared || x.document) && <><p>{t.shared}</p><button className="button-secondary" disabled={busy} onClick={() => void run('revokeApplicationSharing', [x.reference])}>{t.revoke}</button></>}{['received', 'reviewing'].includes(x.status) && <button className="button-secondary" disabled={busy} onClick={() => void run('withdrawJobApplication', [x.reference])}>{t.withdraw}</button>}</article>)}<ReferenceTracker kind="job"/></>}
 {tab === 'documents' && <><p>{t.pdfLimit}</p><form onSubmit={async (e) => { e.preventDefault(); if (busy)
        return; const file = new FormData(e.currentTarget).get('resume'); if (!(file instanceof File) || !file.size)
        return; setBusy(true); setError(''); setNotice(''); try {
        if (file.size > 2097152 || !file.name.toLowerCase().endsWith('.pdf'))
            throw Error(t.pdfLimit);
        await uploadSeekerResume(file);
        setNotice(t.savedOk);
        refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : t.error);
    }
    finally {
        setBusy(false);
    } }}><fieldset disabled={busy} className="min-w-0 flex flex-wrap gap-3"><label className="min-w-0">{t.resume}<input className="field w-full max-w-full" type="file" name="resume" accept="application/pdf,.pdf" required/></label><button className="button-primary">{t.upload}</button></fieldset></form>{!data.documents.length && <p>{t.empty}</p>}{data.documents.map(d => <article key={d.id} className="surface border rounded-2xl p-4 flex flex-wrap items-center gap-3 min-w-0"><span dir="auto" className="break-all">{d.name} · {Math.ceil(d.bytes / 1024)} KB</span><a className="button-secondary" href={'/api/job-seeker/documents/' + d.id}>{t.download}</a><button className="button-secondary" disabled={busy} onClick={() => void run('deleteSeekerDocument', [d.id])}>{t.remove}</button></article>)}</>}
 {tab === 'privacy' && <><AccountSettings /><section className="surface rounded-2xl border p-4 space-y-3"><h2>{t.deleteProfile}</h2><p>{t.deleteInfo}</p><label className="flex gap-2"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}/>{t.confirm}</label><button className="button-secondary" disabled={busy || !confirm} onClick={() => void run('deleteSeekerProfile', [true])}>{t.deleteProfile}</button></section></>}
 </section>;
}
function CareerRows({ kind, rows, onChange, t }: {
    kind: 'experience' | 'education';
    rows: (SeekerExperience | SeekerEducation)[];
    onChange: (rows: (SeekerExperience | SeekerEducation)[]) => void;
    t: SeekerText;
}) {
    const keys = kind === 'experience' ? ['title', 'organization', 'startDate', 'endDate', 'description'] as const : ['institution', 'qualification', 'startDate', 'endDate', 'description'] as const;
    return <fieldset className="min-w-0 space-y-3"><legend className="font-bold">{t[kind]}</legend>{rows.map((row, i) => <section className="rounded-xl border p-3 grid gap-3 md:grid-cols-2 min-w-0" key={row.id}>{keys.map(k => <label key={k} className="min-w-0">{t[k]}<input className="field w-full" type={k.endsWith('Date') ? 'month' : 'text'} maxLength={k === 'description' ? 2000 : 160} required={!['startDate', 'endDate', 'description'].includes(k)} value={String((row as unknown as Record<string, string>)[k])} onChange={e => onChange(rows.map((r, n) => n === i ? { ...r, [k]: e.target.value } : r))}/></label>)}<button type="button" className="button-secondary" onClick={() => onChange(rows.filter((_, n) => n !== i))}>{t.remove}</button></section>)}<button type="button" className="button-secondary" disabled={rows.length >= 15} onClick={() => onChange([...rows, kind === 'experience' ? { id: createRequestId(), title: '', organization: '', startDate: '', endDate: '', description: '' } : { id: createRequestId(), institution: '', qualification: '', startDate: '', endDate: '', description: '' }])}>{t.add} · {t[kind]}</button></fieldset>;
}
