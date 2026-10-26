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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();

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
    <div className="relative inline-block text-start" ref={dropdownRef} onKeyDown={event => { if (event.key === 'Escape' && isOpen) { event.stopPropagation(); setIsOpen(false); dropdownRef.current?.querySelector('button')?.focus(); } }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-edge/90 hover:border-warning-edge bg-surface hover:bg-warning-surface/40 active:scale-97 transition-all text-xs sm:text-sm font-semibold text-content shadow-xs cursor-pointer"
      >
        <Globe className="w-4 h-4 text-accent" />
        <span className="text-sm sm:text-base">{currentObj.flag}</span>
        <span className="hidden sm:inline font-sans">{currentObj.label}</span>
      </button>

      {isOpen && (
        <div id={dropdownId} className="absolute top-full mt-2 end-0 z-50 w-48 rounded-2xl bg-surface shadow-2xl shadow-black/10 border border-edge/80 p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[11px] font-bold text-muted uppercase tracking-wider border-b border-edge mb-1">
            زبان / Language
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              aria-pressed={currentLang === lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-left transition-all cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-gold/10 text-accent font-bold'
                  : 'text-secondary hover:bg-canvas'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.native}</span>
              </span>
              {currentLang === lang.code && <Check className="w-4 h-4 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
