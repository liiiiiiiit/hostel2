import type { AppLanguage } from '../types';

export type StartupStatus = 'loading' | 'ready' | 'error';
const messages = {
  fa: { loading: 'در حال دریافت اطلاعات…', listings: 'در حال دریافت اقامتگاه‌ها…', failed: 'ارتباط با سرور برقرار نشد. دوباره تلاش کن؛ عبارت‌های آمادهٔ مترجم همچنان در دسترس‌اند.', retry: 'تلاش دوباره', unavailable: 'فهرست اقامتگاه‌ها پس از برقراری اتصال نمایش داده می‌شود.' },
  en: { loading: 'Loading information…', listings: 'Loading stays…', failed: 'Unable to connect. Please try again. The offline phrasebook is still available.', retry: 'Retry', unavailable: 'Stays will appear when the connection is restored.' },
  ru: { loading: 'Загружаем информацию…', listings: 'Загружаем варианты жилья…', failed: 'Нет соединения. Попробуйте ещё раз. Офлайн-разговорник остаётся доступным.', retry: 'Повторить', unavailable: 'Варианты жилья появятся после восстановления соединения.' },
  hy: { loading: 'Տեղեկությունները բեռնվում են…', listings: 'Կացարանները բեռնվում են…', failed: 'Կապը չհաստատվեց։ Փորձեք կրկին։ Անցանց զրուցարանը հասանելի է։', retry: 'Կրկնել', unavailable: 'Կացարանները կցուցադրվեն կապի վերականգնումից հետո։' },
};
export const loadingText = (language: AppLanguage) => messages[language];
