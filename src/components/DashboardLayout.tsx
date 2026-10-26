import React from 'react';
import { ArrowUpRight, Inbox } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dashboardText, bookingStatusText } from '../i18n/dashboard';
import type { BookingStatus } from '../types';
export interface DashboardNavItem { id: string; label: string; icon?: React.ReactNode; count?: number }
export function DashboardLayout({ title, subtitle, nav, active, onChange, children, actions }: {
  title: string; subtitle?: string; nav: DashboardNavItem[]; active: string; onChange: (id: string) => void; children: React.ReactNode; actions?: React.ReactNode;
}) {
  const { currentLang } = useLanguage(); const t = dashboardText(currentLang);
  return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7"><div><p className="text-xs uppercase tracking-[.16em] text-slate-500 mb-2">YEREVANHUB / {t.workspace}</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">{title}</h1>{subtitle && <p className="text-sm text-slate-500 mt-2 max-w-2xl">{subtitle}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>
    <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
      <nav aria-label={t.menu} className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 p-2 rounded-2xl bg-white border border-slate-200 lg:sticky lg:top-24">{nav.map(item => <button type="button" key={item.id} aria-current={active===item.id ? 'page' : undefined} onClick={()=>onChange(item.id)} className={`flex shrink-0 items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-start ${active===item.id?'bg-[#142f2a] text-white':'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>{item.icon}<span className="whitespace-nowrap flex-1">{item.label}</span>{item.count!==undefined && item.count>0 && <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${active===item.id?'bg-white/15':'bg-slate-100'}`}>{item.count}</span>}</button>)}</nav>
      <div className="min-w-0 space-y-6" key={active}>{children}</div>
    </div>
  </div>;
}
export function DashboardStat({ label, value, icon, onClick }: { label:string; value:React.ReactNode; icon?:React.ReactNode; onClick?:()=>void }) {
  const content=<><div className="flex items-center justify-between gap-3 text-slate-500"><span className="text-sm">{label}</span>{icon}</div><strong className="block mt-4 text-3xl text-slate-950 font-semibold tabular-nums">{value}</strong></>;
  return onClick?<button type="button" onClick={onClick} className="text-start p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-600 transition-colors">{content}</button>:<div className="p-5 rounded-2xl bg-white border border-slate-200">{content}</div>;
}
export function DashboardEmpty({ title, children }: { title:string; children?:React.ReactNode }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center"><Inbox className="w-9 h-9 mx-auto text-slate-300 mb-4"/><p className="font-medium text-slate-700">{title}</p>{children && <div className="mt-4">{children}</div>}</div>; }
export function BookingStatusBadge({ status }: { status:BookingStatus }) { const { currentLang }=useLanguage(); const color=status==='confirmed'?'bg-emerald-50 text-emerald-800':status==='pending'?'bg-amber-50 text-amber-900':status==='rejected'||status==='no_show'?'bg-rose-50 text-rose-800':'bg-slate-100 text-slate-600';return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap ${color}`}>{bookingStatusText(status,currentLang)}</span>; }
