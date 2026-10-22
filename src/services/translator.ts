import { AppLanguage } from '../types';
import { GoogleGenAI } from '@google/genai';

export interface TranslationResult {
  text: string;
  sourceLang: string;
  targetLang: string;
  isAiGenerated: boolean;
  notes?: string;
}

// Built-in verified phrase & word pairs for instant zero-latency translation across all 12 combinations
const DICTIONARY: Record<string, Record<AppLanguage, string>> = {
  hello: {
    fa: 'سلام',
    en: 'Hello',
    ru: 'Здравствуйте',
    hy: 'Բարև ձեզ',
  },
  thanks: {
    fa: 'خیلی ممنون',
    en: 'Thank you very much',
    ru: 'Большое спасибо',
    hy: 'Շատ շնորհակալ եմ',
  },
  how_much: {
    fa: 'قیمت این چقدر است؟',
    en: 'How much is this?',
    ru: 'Сколько это стоит?',
    hy: 'Ի՞նչ արժե սա:',
  },
  republic_square: {
    fa: 'لطفاً به میدان جمهوری بروید.',
    en: 'Please go to Republic Square.',
    ru: 'Пожалуйста, поезжайте на Площадь Республики.',
    hy: 'Խնդրում եմ, գնացեք Հանրապետության հրապարակ:',
  },
  hostel_booking: {
    fa: 'من در سایت YEREVANHUB رزرو دارم.',
    en: 'I have a booking on YEREVANHUB.',
    ru: 'У меня есть бронирование в YEREVANHUB.',
    hy: 'Ես ամրագրում ունեմ YEREVANHUB-ում:',
  },
  where_is: {
    fa: 'کجاست؟',
    en: 'Where is it?',
    ru: 'Где это находится?',
    hy: 'Որտե՞ղ է:',
  },
  wifi: {
    fa: 'رمز وای‌فای چیست؟',
    en: 'What is the WiFi password?',
    ru: 'Какой пароль от Wi-Fi?',
    hy: 'Ո՞րն է Wi-Fi-ի գաղտնաբառը:',
  },
  luggage: {
    fa: 'امکان نگهداری چمدان وجود دارد؟',
    en: 'Is luggage storage available?',
    ru: 'Можно ли оставить багаж на хранение?',
    hy: 'Կարո՞ղ եմ ուղեբեռը թողնել պահեստում:',
  },
  help: {
    fa: 'لطفاً به من کمک کنید.',
    en: 'Please help me.',
    ru: 'Пожалуйста, помогите мне.',
    hy: 'Խնդրում եմ, օգնեք ինձ:',
  },
  taxi: {
    fa: 'من به تاکسی نیاز دارم.',
    en: 'I need a taxi.',
    ru: 'Мне нужно такси.',
    hy: 'Ինձ տաքսի է պետք:',
  },
  apartment_rent: {
    fa: 'شرایط اجاره ماهانه این آپارتمان چیست؟',
    en: 'What are the monthly rental terms for this apartment?',
    ru: 'Каковы условия помесячной аренды этой квартиры?',
    hy: 'Որո՞նք են այս բնակարանի ամսական վարձակալության պայմանները:',
  },
  deposit: {
    fa: 'ودیعه چه زمانی بازگردانده می‌شود؟',
    en: 'When will the deposit be returned?',
    ru: 'Когда возвращается залог?',
    hy: 'Ե՞րբ է վերադարձվում կանխավճարը (դեպոզիտը):',
  },
};

const LANG_LABELS: Record<AppLanguage | 'auto', { fa: string; en: string; ru: string; hy: string }> = {
  auto: { fa: 'تشخیص خودکار', en: 'Auto Detect', ru: 'Автоопределение', hy: 'Ինքնաշխատ' },
  fa: { fa: 'فارسی', en: 'Persian', ru: 'Персидский', hy: 'Պարսկերեն' },
  en: { fa: 'انگلیسی', en: 'English', ru: 'Английский', hy: 'Անգլերեն' },
  ru: { fa: 'روسی', en: 'Russian', ru: 'Русский', hy: 'Ռուսերեն' },
  hy: { fa: 'ارمنی', en: 'Armenian', ru: 'Армянский', hy: 'Հայերեն' },
};

export function getLanguageName(code: AppLanguage | 'auto', currentLang: AppLanguage = 'fa'): string {
  return LANG_LABELS[code]?.[currentLang] || code;
}

/**
 * Detect language by character script analysis
 */
export function detectLanguage(text: string): AppLanguage {
  const armenianRegex = /[\u0530-\u058F]/;
  const cyrillicRegex = /[\u0400-\u04FF]/;
  const persianRegex = /[\u0600-\u06FF]/;

  if (persianRegex.test(text)) return 'fa';
  if (armenianRegex.test(text)) return 'hy';
  if (cyrillicRegex.test(text)) return 'ru';
  return 'en';
}

/**
 * Main translation function handling all 12 directional pairs
 */
export async function translateText(
  text: string,
  sourceLang: AppLanguage | 'auto',
  targetLang: AppLanguage
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) {
    return { text: '', sourceLang: 'fa', targetLang, isAiGenerated: false };
  }

  const effectiveSource = sourceLang === 'auto' ? detectLanguage(clean) : sourceLang;

  // Same language check
  if (effectiveSource === targetLang) {
    return { text: clean, sourceLang: effectiveSource, targetLang, isAiGenerated: false };
  }

  // 1. Try Gemini AI if API key is provided
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a real-time translator on the YEREVANHUB travel website.
Translate the following text accurately from ${getLanguageName(effectiveSource, 'en')} to ${getLanguageName(targetLang, 'en')}.
Keep names, numbers, brand names (YEREVANHUB), and addresses intact.
Do not include commentary or markdown formatting. Output only the pure translation.

Text to translate:
"""
${clean}
"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const translated = response.text?.trim();
      if (translated) {
        return {
          text: translated,
          sourceLang: effectiveSource,
          targetLang,
          isAiGenerated: true,
        };
      }
    } catch (e) {
      console.warn('Gemini translation error, falling back to local dictionary:', e);
    }
  }

  // 2. Check built-in phrasebook dictionary
  const normalized = clean.toLowerCase();
  for (const entry of Object.values(DICTIONARY)) {
    const srcVal = entry[effectiveSource]?.toLowerCase();
    if (srcVal && (srcVal === normalized || normalized.includes(srcVal))) {
      return {
        text: entry[targetLang],
        sourceLang: effectiveSource,
        targetLang,
        isAiGenerated: false,
        notes: 'ترجمه از عبارات استاندارد سفر YEREVANHUB',
      };
    }
  }

  // 3. Realistic structured transliteration / fallback dictionary
  const words = clean.split(/\s+/);
  const translatedWords = words.map(w => {
    const cleanWord = w.replace(/[.,?!:;]/g, '').toLowerCase();
    for (const entry of Object.values(DICTIONARY)) {
      if (entry[effectiveSource]?.toLowerCase() === cleanWord) {
        return entry[targetLang];
      }
    }
    return w;
  });

  return {
    text: translatedWords.join(' '),
    sourceLang: effectiveSource,
    targetLang,
    isAiGenerated: false,
    notes: 'ترجمه پایگاه داده محلی (برای فعال‌سازی هوش مصنوعی، کلید GEMINI_API_KEY را تنظیم کنید).',
  };
}
