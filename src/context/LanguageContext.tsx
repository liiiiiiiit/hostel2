import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppLanguage } from '../types';
import { UI_TRANSLATIONS, Translations } from '../i18n/translations';
import { ADMIN_TRANSLATIONS, MANAGER_TRANSLATIONS, AdminTranslations, ManagerTranslations } from '../i18n/panelTranslations';
import {
  getLocalized as getLocalizedUtil,
  getCityName as getCityNameUtil,
  getAmenityLabel as getAmenityLabelUtil,
  getRoomTypeFilterName as getRoomTypeFilterNameUtil,
} from '../utils/i18n';

export interface LanguageContextType {
  currentLang: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
  tAdmin: AdminTranslations;
  tManager: ManagerTranslations;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  getLocalized: (dict?: Partial<Record<AppLanguage, string>> | null, fallback?: string) => string;
  getCityName: (city: string) => string;
  getAmenityLabel: (key: string) => string;
  getRoomTypeFilterName: (type: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLangState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('yerevanhub_lang');
      if (saved === 'fa' || saved === 'en' || saved === 'ru' || saved === 'hy') {
        return saved;
      }
    } catch {
      // LocalStorage error fallback
    }
    return 'fa'; // Default Persian
  });

  const isRtl = currentLang === 'fa';
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';

  // Apply language and document direction to <html> whenever language changes
  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem('yerevanhub_lang', currentLang);
    } catch {
      // Ignore localStorage write error in strict mode
    }
  }, [currentLang, dir]);

  const setLanguage = (lang: AppLanguage) => {
    setCurrentLangState(lang);
  };

  const t = UI_TRANSLATIONS[currentLang] || UI_TRANSLATIONS.fa;
  const tAdmin = ADMIN_TRANSLATIONS[currentLang] || ADMIN_TRANSLATIONS.fa;
  const tManager = MANAGER_TRANSLATIONS[currentLang] || MANAGER_TRANSLATIONS.fa;

  const getLocalized = (dict?: Partial<Record<AppLanguage, string>> | null, fallback: string = '') => {
    return getLocalizedUtil(dict, currentLang, fallback);
  };

  const getCityName = (city: string) => {
    return getCityNameUtil(city, currentLang);
  };

  const getAmenityLabel = (key: string) => {
    return getAmenityLabelUtil(key, currentLang);
  };

  const getRoomTypeFilterName = (type: string) => {
    return getRoomTypeFilterNameUtil(type, currentLang);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setLanguage,
        t,
        tAdmin,
        tManager,
        dir,
        isRtl,
        getLocalized,
        getCityName,
        getAmenityLabel,
        getRoomTypeFilterName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
