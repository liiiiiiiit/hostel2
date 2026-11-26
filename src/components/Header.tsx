import {seekerText} from '../i18n/jobSeeker';
import { servicesText } from '../i18n/services';
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Heart,
  Menu,
  X,
  UserRound,
  LogOut,
  LayoutDashboard,
  Compass,
  Store,
  BriefcaseBusiness,
  BedDouble,
  House,
  BookOpen,
  Languages,
} from "lucide-react";
import type { AppLanguage, User } from "../types";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useSavedPlaces } from "../context/SavedPlacesContext";
import { toursText } from "../i18n/tours";
import { jobsText } from "../i18n/jobs";
import { publicSiteText } from "../i18n/publicSite";

interface Props {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  activeView: string;
  onNavigate: (view: string, params?: any) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({
  currentLang,
  onLanguageChange,
  activeView,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const text = publicSiteText(currentLang);
  const { saved, compared } = useSavedPlaces();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const nav = [
    ["hostels", text.hostels],
    ["rentals", text.rentals],
    ["tours", toursText[currentLang].nav],
    ["jobs", jobsText[currentLang].jobs],
    ["services", servicesText[currentLang].nav],
    ["guide", text.guide],
    ["translator", text.translator],
  ];
  const navIcons: Record<string, typeof BedDouble> = {
    hostels: BedDouble,
    rentals: House,
    tours: Compass,
    jobs: BriefcaseBusiness,
    services: Store,
    guide: BookOpen,
    translator: Languages,
  };
  const isActive = (view: string) =>
    activeView === view ||
    (view === "hostels" && activeView === "hostel-detail") ||
    (view === "rentals" && activeView === "rental-detail") ||
    (view === "guide" && activeView === "article-detail") || (view === "services" && activeView === "service-detail");
  const accountView = currentUser?.role === "job_provider" ? "employer" : currentUser?.role === "tour_provider" ? "tour-organizer" :
    currentUser?.role === "admin"
      ? "admin"
      : currentUser?.role === "hostel_manager"
        ? "manager"
        : "account";
  const accountLabel = currentUser?.role === "job_provider" ? jobsText[currentLang].employer : currentUser?.role === "tour_provider" ? toursText[currentLang].panel :
    currentUser?.role === "admin"
      ? text.admin
      : currentUser?.role === "hostel_manager"
        ? text.manager
        : text.account;
  const navigate = (view: string) => {
    onNavigate(view);
    setMenuOpen(false);
    setAccountOpen(false);
  };
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (accountRef.current && !accountRef.current.contains(target))
        setAccountOpen(false);
      if (
        menuOpen &&
        !mobileNavigationRef.current?.contains(target) &&
        !mobileToggleRef.current?.contains(target)
      )
        setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (menuOpen || accountOpen)) {
        if (menuOpen) mobileToggleRef.current?.focus();
        else
          accountRef.current
            ?.querySelector<HTMLButtonElement>("button")
            ?.focus();
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen, accountOpen]);
  return (
    <header
      dir={currentLang === "fa" ? "rtl" : "ltr"}
      className="site-header sticky top-0 z-40"
    >
      <div className="header-inner">
        <div className="header-controls">
          <button
            ref={mobileToggleRef}
            type="button"
            aria-label={menuOpen ? text.closeMenu : text.menu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="header-control header-icon-button header-menu-toggle"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate("saved")}
            aria-label={`${text.saved} (${saved.length} / ${compared.length})`}
            title={text.saved}
            className="header-control header-icon-button header-saved-button"
          >
            <Heart className="size-5" strokeWidth={1.6} />
            {saved.length > 0 && (
              <span className="absolute -end-0.5 top-0 flex min-w-4 items-center justify-center rounded-full bg-[#d6a65c] px-1 text-[10px] font-bold text-[#142f2a]">
                {saved.length}
              </span>
            )}
          </button>
          <LanguageSelector
            currentLang={currentLang}
            onLanguageChange={onLanguageChange}
          />
          <ThemeToggle language={currentLang} />
          {currentUser ? (
            <div className="header-account" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                aria-haspopup="true"
                aria-expanded={accountOpen}
                aria-controls="account-popover"
                className="header-control header-account-button"
              >
                <UserRound className="size-4" />
                <span className="max-w-28 truncate">
                  {currentUser.name.split(" ")[0]}
                </span>
              </button>
              {accountOpen && (
                <div
                  id="account-popover"
                  className="absolute end-0 top-full mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-[#142f2a]/10"
                >
                  <p
                    className="truncate border-b border-slate-100 px-3 py-3 text-xs text-slate-500"
                    dir="ltr"
                  >
                    {currentUser.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(accountView)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"
                  >
                    <LayoutDashboard className="size-4" />
                    {accountLabel}
                  </button>
                  <button type="button" onClick={()=>navigate('job-seeker')} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"><LayoutDashboard className="size-4"/>{seekerText[currentLang].panel}</button>
                  {(currentUser.legacyProviderRoles??[]).map(role=><button key={role} type="button" onClick={()=>navigate(role==='job_provider'?'employer':'tour-organizer')} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"><LayoutDashboard className="size-4"/>{role==='job_provider'?jobsText[currentLang].employer:toursText[currentLang].panel}</button>)}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" />
                    {text.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="header-control header-sign-in-button"
            >
              <UserRound className="size-4" />
              {text.signIn}
            </button>
          )}
        </div>
        <button
          onClick={() => navigate("home")}
          type="button"
          dir="ltr"
          className="header-brand"
          aria-label="YEREVANHUB Home"
        >
          <span className="header-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 40" fill="none" focusable="false">
              <path
                d="M4 31 18 8l9 14 6-10 11 19H4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m14 15 4 3 4-3m8 2 3 3 3-3M11 36h26"
                stroke="var(--header-gold)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-name header-wordmark">
            <span>YEREVAN</span>
            <span>HUB</span>
          </span>
        </button>
        <nav aria-label={text.menu} className="desktop-navigation">
          {nav.map(([view, label]) => {
            const Icon = navIcons[view];
            return (
              <button
                type="button"
                key={view}
                onClick={() => navigate(view)}
                aria-current={isActive(view) ? "page" : undefined}
                className="header-nav-link"
              >
                <Icon
                  className="header-nav-icon"
                  aria-hidden="true"
                  strokeWidth={1.7}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {menuOpen && (
        <nav
          ref={mobileNavigationRef}
          id="mobile-navigation"
          aria-label={text.menu}
          className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-[#142f2a]/8 bg-[#f8faf7] px-4 pb-5 pt-3"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {nav.map(([view, label]) => (
              <button
                key={view}
                type="button"
                onClick={() => navigate(view)}
                aria-current={isActive(view) ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-start text-sm font-medium ${isActive(view) ? "bg-[#142f2a] text-white" : "text-[#142f2a] hover:bg-white"}`}
              >
                {label}
                <ArrowUpRight className="size-4 opacity-50" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("saved")}
              className="flex min-h-12 items-center justify-between rounded-xl px-4 text-start text-sm font-medium text-[#142f2a] hover:bg-white"
            >
              {text.saved}
              <span>{saved.length}</span>
            </button>
            <div className="mt-2 flex flex-wrap gap-2 border-t border-[#142f2a]/10 pt-3">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(accountView)}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#142f2a] px-4 text-sm font-medium text-white"
                  >
                    <LayoutDashboard className="size-4" />
                    {accountLabel}
                  </button>
                  <button type="button" onClick={()=>navigate('job-seeker')} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"><LayoutDashboard className="size-4"/>{seekerText[currentLang].panel}</button>
                  {(currentUser.legacyProviderRoles??[]).map(role=><button key={role} type="button" onClick={()=>navigate(role==='job_provider'?'employer':'tour-organizer')} className="flex w-full items-center gap-3 rounded-xl p-3 text-start text-sm font-semibold text-[#142f2a] hover:bg-slate-50"><LayoutDashboard className="size-4"/>{role==='job_provider'?jobsText[currentLang].employer:toursText[currentLang].panel}</button>)}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="rounded-xl border border-[#142f2a]/15 px-4 text-sm text-rose-700"
                  >
                    {text.logout}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="min-h-11 w-full rounded-xl bg-[#142f2a] text-sm font-semibold text-white"
                >
                  {text.signIn}
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};
