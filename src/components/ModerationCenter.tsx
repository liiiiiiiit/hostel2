import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { appStore } from '../services/store';
import { moderationText } from '../i18n/moderation';
import { contentModules, moderationStates, moderationTransitions, type ContentModule, type ModerationPage, type ModerationStatus, type ModerationItem } from '../types/moderation';
export function ModerationCenter() {
    const { currentLang } = useLanguage(), t = moderationText[currentLang];
    const [module, setModule] = useState<ContentModule | 'all'>('all'), [status, setStatus] = useState<ModerationStatus | 'all'>('pending_review'), [search, setSearch] = useState(''), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
    const [data, setData] = useState<ModerationPage | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [selected, setSelected] = useState<string[]>([]), [next, setNext] = useState<ModerationStatus>('approved'), [note, setNote] = useState('');
    const key = (module: string, id: string) => module + ':' + id;
    const refresh = () => { setLoading(true); setSelected([]); setRevision(v => v + 1); };
    useEffect(() => {
        let live = true;
        setLoading(true);
        setSelected([]);
        setNotice('');
        const timer = setTimeout(() => {
            const q = new URLSearchParams({ module, status, search, page: String(page), language: currentLang });
            fetch('/api/admin/moderation?' + q, { credentials: 'same-origin', headers: { 'X-App-Language': currentLang } }).then(async (r) => { if (!r.ok)
                throw Error(t.error); return r.json(); }).then(result => { if (live) {
                setData(result);
                setError('');
            } }).catch(() => { if (live) {
                setData(null);
                setError(t.error);
            } }).finally(() => { if (live)
                setLoading(false); });
        }, 150);
        return () => { live = false; clearTimeout(timer); };
    }, [module, status, search, page, revision, currentLang, t.error]);
    const chosen = data?.items.filter(i => selected.includes(key(i.module, i.id))) ?? [];
    const allowed = chosen.length > 0 && chosen.every(i => moderationTransitions[i.status].includes(next));
    async function apply() {
        if (busy || loading || !allowed || !window.confirm(t.confirm))
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const result = await appStore.action('moderateContent', [{ targets: chosen.map(({ module, id, version, contentVersion }) => ({ module, id, version, contentVersion })), status: next, note, confirmed: true }]);
            if (!result.success)
                throw Error(result.error || t.error);
            setNote('');
            refresh();
            setNotice(t.saved);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : t.error);
        }
        finally {
            setBusy(false);
        }
    }
    const filter = () => { setLoading(true); setPage(1); setSelected([]); };
    return <section className="space-y-5 min-w-0" data-testid="moderation-center">
  <h2 className="text-2xl font-bold">{t.nav}</h2><p className="text-sm">{t.policy}</p>
  <div className="grid gap-3 md:grid-cols-3"><label className="min-w-0">{t.module}<select className="field w-full" value={module} onChange={e => { filter(); setModule(e.target.value as typeof module); }}><option value="all">{t.all}</option>{contentModules.map(v => <option key={v} value={v}>{t[v]}</option>)}</select></label>
  <label className="min-w-0">{t.status}<select className="field w-full" value={status} onChange={e => { filter(); setStatus(e.target.value as typeof status); }}><option value="all">{t.all}</option>{moderationStates.map(v => <option key={v} value={v}>{t[v]}</option>)}</select></label>
  <label className="min-w-0">{t.search}<input className="field w-full" maxLength={120} value={search} onChange={e => { filter(); setSearch(e.target.value); }}/></label></div>
  {loading && <p role="status">{t.loading}</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  <button className="button-secondary" disabled={busy || loading} onClick={refresh}>{t.refresh}</button>
  <form className="surface p-4 rounded-xl space-y-3 min-w-0" onSubmit={e => { e.preventDefault(); void apply(); }}>
   <p>{t.selected}: {selected.length.toLocaleString(currentLang)}</p><label className="block min-w-0">{t.status}<select className="field w-full" aria-label={t.apply} value={next} disabled={busy || loading} onChange={e => setNext(e.target.value as ModerationStatus)}>{moderationStates.map(v => <option key={v} value={v} disabled={chosen.length > 0 && !chosen.every(i => moderationTransitions[i.status].includes(v))}>{t[v]}</option>)}</select></label>
   <label className="block min-w-0">{t.note}<textarea className="field w-full" rows={3} maxLength={2000} disabled={busy || loading} value={note} onChange={e => setNote(e.target.value)} required={['changes_requested', 'rejected', 'suspended', 'archived'].includes(next)}/></label><p className="text-sm">{t.reasonRequired}</p>
   <button className="button-primary whitespace-normal max-w-full" disabled={busy || loading || !allowed}>{t.apply}</button>
  </form>
  {data && !data.items.length && !loading && <p>{t.empty}</p>}
  {data?.items.map(item => <article className="surface p-4 rounded-xl space-y-3 min-w-0 break-words" key={key(item.module, item.id)} data-testid={'moderation-' + item.module + '-' + item.id}>
   <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" disabled={busy || loading} checked={selected.includes(key(item.module, item.id))} onChange={e => setSelected(v => e.target.checked ? [...v, key(item.module, item.id)] : v.filter(k => k !== key(item.module, item.id)))}/><span>{t.select}: <b dir="auto">{item.title || item.id}</b></span></label><p>{t[item.module]} · {t[item.status]}</p>
   <details><summary>{t.preview}</summary>{item.images.length > 0 && <div className="grid grid-cols-2 gap-2 py-3 md:grid-cols-4">{item.images.map((src, i) => <img key={src + String(i)} src={src} alt={item.title} loading="lazy" className="h-36 w-full object-cover rounded-xl min-w-0"/>)}</div>}<p className="whitespace-pre-wrap" dir="auto">{item.summary}</p></details>
   <History key={item.version} item={item}/>
  </article>)}
  {data && <nav className="flex flex-wrap items-center gap-3" aria-label={t.nav}><button className="button-secondary" disabled={busy || loading || page === 1} onClick={() => { setLoading(true); setPage(p => p - 1); }}>{t.previous}</button><span>{page.toLocaleString(currentLang)} / {Math.max(1, Math.ceil(data.total / data.pageSize)).toLocaleString(currentLang)}</span><button className="button-secondary" disabled={busy || loading || page * data.pageSize >= data.total} onClick={() => { setLoading(true); setPage(p => p + 1); }}>{t.next}</button></nav>}
 </section>;
}
function History({ item }: {
    item: ModerationItem;
}) {
    const { currentLang } = useLanguage(), t = moderationText[currentLang];
    const [events, setEvents] = useState(item.history), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function more() {
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            const last = events.at(-1)!;
            const q = new URLSearchParams({ module: item.module, id: item.id, beforeTime: last.createdAt, beforeId: last.id }), r = await fetch('/api/admin/moderation/history?' + q, { credentials: 'same-origin' });
            if (!r.ok)
                throw Error(t.error);
            const result = await r.json();
            setEvents(old => [...old, ...result.items]);
        }
        catch {
            setError(t.error);
        }
        finally {
            setBusy(false);
        }
    }
    return <details><summary>{t.history}</summary>{!events.length && <p>{t.noHistory}</p>}<ol className="space-y-3">{events.map(event => <li key={event.id}><p>{t[event.from as ModerationStatus] ?? t.content_saved} → {t[event.to]}</p><p className="whitespace-pre-wrap" dir="auto">{event.note === 'content_saved' ? t.content_saved : event.note}</p><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(currentLang, { timeZone: 'Asia/Yerevan', timeZoneName: 'short' })}</time></li>)}</ol>{error && <p role="alert">{error}</p>}{events.length < item.historyTotal && <button className="button-secondary whitespace-normal" disabled={busy} onClick={() => void more()}>{t.moreHistory}</button>}</details>;
}
