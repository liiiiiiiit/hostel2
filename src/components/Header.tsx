import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Building2, Heart, Menu, X, UserRound, LogOut, LayoutDashboard } from 'lucide-react';
import type { AppLanguage, User } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { useSavedPlaces } from '../context/SavedPlacesContext';
import { publicSiteText } from '../i18n/publicSite';

interface Props {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  activeView: string;
  onNavigate: (view: string, params?: any) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({ currentLang, onLanguageChange, activeView, onNavigate, currentUser, onOpenAuth, onLogout }) => {
  const text = publicSiteText(currentLang);
  const { saved, compared } = useSavedPlaces();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const nav = [ ['hostels', text.hostels], ['rentals', text.rentals], ['guide', text.guide], ['translator', text.translator] ];
  const accountView = currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'hostel_manager' ? 'manager' : 'account';
  const accountLabel = currentUser?.role === 'admin' ? text.admin : currentUser?.role === 'hostel_manager' ? text.manager : text.account;
  const navigate = (view: string) => { onNavigate(view); setMenuOpen(false); setAccountOpen(false); };
  useEffect(() => {
    const close = (event: MouseEvent) => { if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && (menuOpen || accountOpen)) { if (menuOpen) mobileToggleRef.current?.focus(); else accountRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); setMenuOpen(false); setAccountOpen(false); } };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [menuOpen, accountOpen]);
  return <header className="sticky top-0 z-40 border-b border-[#142f2a]/10 bg-[#f8faf7]/95 backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <button onClick={() => navigate('home')} type="button" className="flex shrink-0 items-center gap-2.5 text-[#142f2a]" aria-label="YEREVANHUB Home">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#142f2a] text-[#e4be7d]"><Building2 className="size-5" strokeWidth={1.5} /></span>
        <span className="brand-name text-base font-extrabold sm:text-lg">YEREVAN<span className="text-[#99733e]">HUB</span></span>
      </button>
      <nav aria-label={text.menu} className="hidden items-center gap-1 xl:flex">
        {nav.map(([view,label]) => <button type="button" key={view} onClick={() => navigate(view)} aria-current={activeView.startsWith(view.replace(/s$/, '')) ? 'page' : undefined} className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${activeView === view ? 'bg-[#142f2a]/7 text-[#142f2a]' : 'text-slate-600 hover:bg-white hover:text-[#142f2a]'}`}>{label}</button>)}
      </nav>
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <button type="button" onClick={() => navigate('saved')} aria-label={`${text.saved} (${saved.length} / ${compared.length})`} title={text.saved} className="relative flex size-10 items-center justify-center rounded-xl text-[#142f2a] hover:bg-white">
          <Heart className="size-5" strokeWidth={1.6} />{saved.length > 0 && <span className="absolute -end-0.5 top-0 flex min-w-4 items-center justify-center rounded-full bg-[#d6a65c] px-1 text-[10px] font-bold text-[#142f2a]">{saved.length}</span>}
        </button>
        <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />
        {currentUser ? <div className="relative hidden sm:block" ref={accountRef}>
          <button type="button" onClick={() => setAccountOpen(!accountOpen)} aria-haspopup="true" aria-expanded={accountOpen} aria-controls="account-popover" className="flex min-h-10 items-center gap-2 rounded-xl border border-[#142f2a]/12 bg-white px-3 text-sm font-semibold text-[#142f2a]"><UserRound className="size-4" />{currentUser.name.split(' ')[0]}</button>
          {accountOpen && <div id="account-popover" className="absolute end-0 top-full mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-[#142f2a]/10">
            <p className="truncate border-b border-slate-100 px-3 py-3 text-xs text-slate-500" dir="ltr">{currentUser.email}</p>
            <button type="button" onClick={() => navigate(accountView)} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"><LayoutDashboard className="size-4" />{accountLabel}</button>
            <button type="button" onClick={() => { setAccountOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm text-rose-700 hover:bg-rose-50"><LogOut className="size-4" />{text.logout}</button>
          </div>}
        </div> : <button type="button" onClick={onOpenAuth} className="hidden min-h-10 items-center gap-2 rounded-xl bg-[#142f2a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#234a40] sm:flex"><UserRound className="size-4" />{text.signIn}</button>}
        <button ref={mobileToggleRef} type="button" aria-label={menuOpen ? text.closeMenu : text.menu} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)} className="flex size-10 items-center justify-center rounded-xl text-[#142f2a] hover:bg-white xl:hidden">{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
    </div>
    {menuOpen && <nav id="mobile-navigation" aria-label={text.menu} className="border-t border-[#142f2a]/8 bg-[#f8faf7] px-4 pb-5 pt-3 xl:hidden">
      <div className="mx-auto grid max-w-7xl gap-1">
        {nav.map(([view,label]) => <button key={view} type="button" onClick={() => navigate(view)} aria-current={activeView === view ? 'page' : undefined} className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-start text-sm font-medium ${activeView === view ? 'bg-[#142f2a] text-white' : 'text-[#142f2a] hover:bg-white'}`}>{label}<ArrowUpRight className="size-4 opacity-50" /></button>)}
        <button type="button" onClick={() => navigate('saved')} className="flex min-h-12 items-center justify-between rounded-xl px-4 text-start text-sm font-medium text-[#142f2a] hover:bg-white">{text.saved}<span>{saved.length}</span></button>
        <div className="mt-2 flex gap-2 border-t border-[#142f2a]/10 pt-3">
          {currentUser ? <><button type="button" onClick={() => navigate(accountView)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#142f2a] px-4 text-sm font-medium text-white"><LayoutDashboard className="size-4" />{accountLabel}</button><button type="button" onClick={() => { setMenuOpen(false); onLogout(); }} className="rounded-xl border border-[#142f2a]/15 px-4 text-sm text-rose-700">{text.logout}</button></> : <button type="button" onClick={() => { setMenuOpen(false); onOpenAuth(); }} className="min-h-11 w-full rounded-xl bg-[#142f2a] text-sm font-semibold text-white">{text.signIn}</button>}
        </div>
      </div>
    </nav>}
  </header>;
};
