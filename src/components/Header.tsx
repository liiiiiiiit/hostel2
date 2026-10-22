import React, { useState } from 'react';
import { AppLanguage, User } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { LanguageSelector } from './LanguageSelector';
import {
  Building2,
  Home,
  BookOpen,
  Languages,
  Zap,
  User as UserIcon,
  LogOut,
  Shield,
  Key,
  Menu,
  X,
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = UI_TRANSLATIONS[currentLang];

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 text-slate-900 group cursor-pointer text-left"
              aria-label="YEREVANHUB Home"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="brand-name text-lg sm:text-xl font-extrabold tracking-wider text-slate-900">
                  YEREVANHUB
                </span>
                <span className="hidden sm:block text-[10px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-xs">
                  {t.tagline}
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => handleNav('hostels')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'hostels'
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>{t.navHostels}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('rentals')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'rentals'
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4 text-blue-600" />
                <span>{t.navRentals}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('guide')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'guide'
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>{t.navGuide}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('translator')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'translator'
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Languages className="w-4 h-4 text-indigo-600" />
                <span>{t.navTranslator}</span>
              </button>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Urgent "Just Arrived" Quick Action */}
            <button
              type="button"
              onClick={() => handleNav('immediate-stay')}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer animate-pulse"
              title="برای مسافری که تازه رسیده و همین حالا جای خواب می‌خواهد"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
              <span className="hidden sm:inline">{t.navImmediateStay}</span>
              <span className="sm:hidden text-[11px]">فوری</span>
            </button>

            {/* Language Selector */}
            <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />

            {/* User Account / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {currentUser.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>{t.adminPanel}</span>
                  </button>
                )}

                {currentUser.role === 'hostel_manager' && (
                  <button
                    type="button"
                    onClick={() => handleNav('manager')}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.managerPanel}</span>
                  </button>
                )}

                {currentUser.role === 'traveler' && (
                  <button
                    type="button"
                    onClick={() => handleNav('account')}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>{currentUser.name.split(' ')[0]}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title={t.logout}
                  aria-label={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t.login}</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <button
            type="button"
            onClick={() => handleNav('hostels')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-800 hover:bg-slate-100 font-medium text-sm text-right cursor-pointer"
          >
            <Building2 className="w-5 h-5 text-amber-600" />
            <span>{t.navHostels}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('rentals')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-800 hover:bg-slate-100 font-medium text-sm text-right cursor-pointer"
          >
            <Home className="w-5 h-5 text-blue-600" />
            <span>{t.navRentals}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('immediate-stay')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-50 text-red-900 font-semibold text-sm text-right cursor-pointer"
          >
            <Zap className="w-5 h-5 text-red-600 fill-red-600" />
            <span>{t.navImmediateStay}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('guide')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-800 hover:bg-slate-100 font-medium text-sm text-right cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span>{t.navGuide}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('translator')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-800 hover:bg-slate-100 font-medium text-sm text-right cursor-pointer"
          >
            <Languages className="w-5 h-5 text-indigo-600" />
            <span>{t.navTranslator}</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-purple-50 text-purple-900 font-semibold text-sm text-right cursor-pointer"
            >
              <Shield className="w-5 h-5 text-purple-600" />
              <span>{t.adminPanel}</span>
            </button>
          )}

          {currentUser?.role === 'hostel_manager' && (
            <button
              type="button"
              onClick={() => handleNav('manager')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-900 font-semibold text-sm text-right cursor-pointer"
            >
              <Key className="w-5 h-5 text-emerald-600" />
              <span>{t.managerPanel}</span>
            </button>
          )}

          {!currentUser && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm text-right cursor-pointer"
            >
              <UserIcon className="w-5 h-5 text-amber-400" />
              <span>{t.login} / {t.register}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
