import { AppLanguage } from '../types';

/**
 * Safely extracts localized string with fallback
 */
export function getLocalized(
  dict?: Partial<Record<AppLanguage, string>> | null,
  lang: AppLanguage = 'fa',
  fallback: string = ''
): string {
  if (!dict) return fallback;
  if (dict[lang]) return dict[lang]!;
  if (lang !== 'en' && dict.en) return dict.en;
  if (lang !== 'fa' && dict.fa) return dict.fa;
  if (dict.ru) return dict.ru;
  if (dict.hy) return dict.hy;
  return fallback;
}

/**
 * Localized city names
 */
export const CITY_NAMES: Record<string, Record<AppLanguage, string>> = {
  all: {
    fa: 'همه شهرها',
    en: 'All Cities',
    ru: 'Все города',
    hy: 'Բոլոր քաղաքները',
  },
  Yerevan: {
    fa: 'ایروان (مرکز و عربکیر)',
    en: 'Yerevan (Center & Arabkir)',
    ru: 'Ереван (Центр и Арабкир)',
    hy: 'Երևան (Կենտրոն և Արաբկիր)',
  },
  Gyumri: {
    fa: 'گیومری',
    en: 'Gyumri',
    ru: 'Гюмри',
    hy: 'Գյումրի',
  },
  Dilijan: {
    fa: 'دیلیجان',
    en: 'Dilijan',
    ru: 'Дилижан',
    hy: 'Դիլիջան',
  },
};

export function getCityName(city: string, lang: AppLanguage): string {
  return CITY_NAMES[city]?.[lang] || city;
}

/**
 * Localized Amenities Labels
 */
export const AMENITY_LABELS: Record<string, Record<AppLanguage, string>> = {
  wifi: {
    fa: 'وای‌فای رایگان',
    en: 'Free Wi-Fi',
    ru: 'Бесплатный Wi-Fi',
    hy: 'Անվճար Wi-Fi',
  },
  lockers: {
    fa: 'کمد قفل‌دار',
    en: 'Lockers',
    ru: 'Индивидуальные шкафчики',
    hy: 'Փականով պահարաններ',
  },
  kitchen: {
    fa: 'آشپزخانه مهمان',
    en: 'Guest Kitchen',
    ru: 'Общая кухня',
    hy: 'Հյուրերի խոհանոց',
  },
  hotWater24h: {
    fa: 'آب گرم ۲۴ ساعته',
    en: '24/7 Hot Water',
    ru: 'Горячая вода 24/7',
    hy: '24/7 տաք ջուր',
  },
  linenIncluded: {
    fa: 'ملحفه و پتو تمیز',
    en: 'Clean Linen Included',
    ru: 'Постельное белье включено',
    hy: 'Մաքուր սպիտակեղեն',
  },
  elevator: {
    fa: 'دارای آسانسور',
    en: 'Elevator',
    ru: 'Лифт',
    hy: 'Վերելակ',
  },
  airConditioning: {
    fa: 'سیستم سرمایش و تهویه',
    en: 'Air Conditioning',
    ru: 'Кондиционер',
    hy: 'Օդորակիչ',
  },
  breakfastAvailable: {
    fa: 'صبحانه انتخابی',
    en: 'Breakfast Available',
    ru: 'Завтрак',
    hy: 'Նախաճաշ',
  },
  laundry: {
    fa: 'ماشین لباسشویی',
    en: 'Laundry',
    ru: 'Стиральная машина',
    hy: 'Լվացքատուն',
  },
  coworking: {
    fa: 'فضای کار اشتراکی و مطالعه',
    en: 'Coworking / Work Desk',
    ru: 'Коворкинг зона',
    hy: 'Համատեղ աշխատանքային տարածք',
  },
  freeLuggageStorage: {
    fa: 'انبار چمدان رایگان',
    en: 'Free Luggage Storage',
    ru: 'Бесплатная камера хранения',
    hy: 'Ուղեբեռի անվճար պահեստ',
  },
  reception24h: {
    fa: 'پذیرش ۲۴ ساعته شبانه‌روزی',
    en: '24/7 Reception Desk',
    ru: 'Круглосуточная стойка 24/7',
    hy: '24/7 ընդունարան',
  },
};

export function getAmenityLabel(key: string, lang: AppLanguage): string {
  return AMENITY_LABELS[key]?.[lang] || key;
}

/**
 * Localized Room Type Labels
 */
export const ROOM_TYPE_NAMES: Record<string, Record<AppLanguage, string>> = {
  all: {
    fa: 'همه انواع اتاق‌ها',
    en: 'All Room Types',
    ru: 'Все типы номеров',
    hy: 'Բոլոր սենյակները',
  },
  dorm_mixed: {
    fa: 'خوابگاه اشتراکی (مختلط)',
    en: 'Mixed Dormitory',
    ru: 'Общий номер (микс)',
    hy: 'Խառը ընդհանուր ննջարան',
  },
  dorm_female: {
    fa: 'خوابگاه اختصاصی بانوان',
    en: 'Female Dormitory',
    ru: 'Женский общий номер',
    hy: 'Կանանց ննջարան',
  },
  private: {
    fa: 'اتاق اختصاصی (خصوصی)',
    en: 'Private Room',
    ru: 'Отдельный номер',
    hy: 'Առանձին սենյակ',
  },
};

export function getRoomTypeFilterName(type: string, lang: AppLanguage): string {
  return ROOM_TYPE_NAMES[type]?.[lang] || type;
}
