import React, { useState, useRef, useEffect, useId } from 'react';
import { AppLanguage } from '../types';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

const LANGUAGES: { code: AppLanguage; label: string; native: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'fa', label: 'فارسی', native: 'فارسی', dir: 'rtl' },
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ru', label: 'Русский', native: 'Русский', dir: 'ltr' },
  { code: 'hy', label: 'Հայերեն', native: 'Հայերեն', dir: 'ltr' },
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
    <div className="header-language-selector relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label="Select language"
        dir="ltr"
        className="header-control header-language-button"
      >
        <Globe aria-hidden="true" className="size-4" strokeWidth={1.6} />
        <span>{currentObj.code.toUpperCase()}</span>
        <ChevronDown aria-hidden="true" className="header-language-chevron size-3" />
      </button>

      {isOpen && (
        <div id={menuId} className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full mt-2 z-50 sm:w-48 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
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
                triggerRef.current?.focus();
              }}
              aria-pressed={currentLang === lang.code}
              className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-left transition-all cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-amber-500/10 text-amber-950 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="w-6 font-sans text-[11px] font-semibold tracking-wider text-slate-500">{lang.code.toUpperCase()}</span>
                <span lang={lang.code} dir={lang.dir}>{lang.native}</span>
              </span>
              {currentLang === lang.code && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
