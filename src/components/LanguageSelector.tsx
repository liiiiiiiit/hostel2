import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/50 transition-colors text-xs sm:text-sm font-medium text-slate-700 shadow-xs cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
        <span className="text-sm sm:text-base">{currentObj.flag}</span>
        <span className="hidden sm:inline font-sans">{currentObj.label}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-44 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100">
            انتخاب زبان / Language
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.native}</span>
              </span>
              {currentLang === lang.code && <Check className="w-4 h-4 text-amber-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
