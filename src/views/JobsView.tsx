import React, { lazy, useEffect, useSyncExternalStore } from 'react';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { jobsText } from '../i18n/jobs';
import { seekerText } from '../i18n/jobSeeker';
import { appStore } from '../services/store';
import { ReferenceTracker } from '../components/ReferenceTracker';
import { ApplyForJob } from '../components/JobApplications';
const RecruitmentView = lazy(() => import('./RecruitmentView').then(m => ({ default: m.RecruitmentView })));
export function JobsView({ mode, jobId }: {
    mode: 'public' | 'employer' | 'admin';
    jobId?: string;
}) { return mode === 'public' ? <JobsCatalog jobId={jobId}/> : <RecruitmentView admin={mode === 'admin'}/>; }
function JobsCatalog({ jobId }: {
    jobId?: string;
}) {
    const { currentLang } = useLanguage(), t = jobsText[currentLang];
    const state = useSyncExternalStore(appStore.subscribe, appStore.getState);
    const postings = (state.jobs ?? []).filter(job => job.status === 'open' && job.approved !== false && job.acceptingApplications !== false);
    const selected = postings.some(j => j.id === jobId);
    useEffect(() => { if (selected && jobId)
        document.getElementById('job-' + jobId)?.scrollIntoView({ block: 'start' }); }, [jobId, selected]);
    return <section className="page-shell py-8 space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><a className="button-secondary" href="#/job-seeker">{seekerText[currentLang].panel}</a><h1 className="text-2xl font-bold">{t.jobs}</h1></header><ReferenceTracker kind="job"/><div className="grid gap-4 md:grid-cols-2">{!postings.length && <p className="surface p-5">{t.empty}</p>}{postings.map(job => <article id={'job-' + job.id} key={job.id} className="scroll-mt-28 surface p-5 space-y-3 min-w-0 [overflow-wrap:anywhere]"><h3 className="text-xl font-bold" dir="auto">{job.title}</h3><p dir="auto">{job.company}</p><p className="flex items-center gap-2"><MapPin size={16}/><bdi>{job.location}</bdi></p><p>{t.salary} · <strong>{job.salary === null ? t.negotiable : job.salary.toLocaleString(currentLang) + ' / ' + t[job.period]}</strong></p><p dir="auto">{job.schedule}</p><p className="whitespace-pre-line" dir="auto">{job.description}</p><p><strong>{t.contact}</strong> · <bdi>{job.contact}</bdi></p><ApplyForJob key={state.currentUser?.id ?? 'guest'} job={job}/></article>)}</div></section>;
}
