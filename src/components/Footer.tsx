import React from 'react';
import { ArrowUpRight, Building2 } from 'lucide-react';
import type { AppLanguage } from '../types';
import { publicSiteText } from '../i18n/publicSite';

interface Props { currentLang: AppLanguage; onNavigate: (view: string) => void }
export const Footer: React.FC<Props> = ({ currentLang, onNavigate }) => {
  const text = publicSiteText(currentLang);
  const groups = [ { title: text.browse, links: [['hostels',text.hostels],['rentals',text.rentals],['guide',text.guide],['translator',text.translator]] }, { title: text.information, links: [['about',text.about],['contact',text.contact],['rules',text.rules],['privacy',text.privacy]] } ];
  return <footer className="mt-16 bg-[#142f2a] text-[#d8e3db] sm:mt-24">
    <div className="mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 pb-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:gap-12">
        <div className="max-w-xs"><button type="button" onClick={() => onNavigate('home')} className="mb-5 flex items-center gap-3 text-white" aria-label="YEREVANHUB Home"><span className="flex size-10 items-center justify-center rounded-xl border border-white/20 text-[#e4be7d]"><Building2 className="size-5" /></span><span className="brand-name text-xl">YEREVANHUB</span></button><p className="text-sm leading-7 text-[#a6bdb1]">{text.footerDesc}</p></div>
        {groups.map(group => <div key={group.title}><h2 className="mb-4 text-sm font-semibold text-white">{group.title}</h2><ul className="space-y-2">{group.links.map(([view,label]) => <li key={view}><button type="button" onClick={() => onNavigate(view)} className="group flex min-h-9 items-center gap-2 text-sm text-[#b3c8bd] transition-colors hover:text-white">{label}<ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></button></li>)}</ul></div>)}
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#94afa0] sm:flex-row"><p><span dir="ltr">© {new Date().getFullYear()} YEREVANHUB</span> · {text.rights}</p><p>{text.time}</p></div>
    </div>
  </footer>;
};
