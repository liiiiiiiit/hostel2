import type { AppLanguage } from '../types';

export const THEME_LABELS = {
  fa: { theme: 'ظاهر', light: 'روشن', dark: 'تیره', system: 'سیستم' },
  en: { theme: 'Appearance', light: 'Light', dark: 'Dark', system: 'System' },
  ru: { theme: 'Оформление', light: 'Светлая', dark: 'Тёмная', system: 'Системная' },
  hy: { theme: 'Տեսք', light: 'Լուսավոր', dark: 'Մուգ', system: 'Համակարգային' },
} satisfies Record<AppLanguage, Record<'theme' | 'light' | 'dark' | 'system', string>>;
