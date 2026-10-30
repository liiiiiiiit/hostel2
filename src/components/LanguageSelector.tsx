import React, { useState, useRef, useEffect, useId } from 'react';
import { AppLanguage } from '../types';
import { Globe, Check } from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

const LANGUAGES: { code: AppLanguage; label: string; flag: string; native: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'fa', label: 'فارسی', flag: '🇮🇷', native: 'فارسی', dir: 'rtl' },
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English', dir: 'ltr' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', native: 'Русский', dir: 'ltr' },
  { code: 'hy', label: 'Հայերեն', flag: '🇦🇲', native: 'Հայերեն', dir: 'ltr' },
];

export const LanguageSelector: React.FC<Props> = ({ currentLang, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && isOpen) { setIsOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label="Select language"
        className="flex min-h-11 items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200/90 hover:border-amber-400 bg-white hover:bg-amber-50/40 active:scale-97 transition-all text-xs sm:text-sm font-semibold text-slate-800 shadow-xs cursor-pointer"
      >
        <Globe className="w-4 h-4 text-amber-600" />
        <span className="text-sm sm:text-base">{currentObj.flag}</span>
        <span className="hidden sm:inline font-sans">{currentObj.label}</span>
      </button>

      {isOpen && (
        <div id={menuId} className="fixed inset-x-4 top-[5.5rem] sm:absolute sm:inset-x-auto sm:end-0 sm:top-full mt-2 z-50 sm:w-48 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            زبان / Language
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-left transition-all cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-amber-500/10 text-amber-950 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.native}</span>
              </span>
              {currentLang === lang.code && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
