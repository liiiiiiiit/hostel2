import React from 'react';
import type { AppLanguage } from '../types';
import { previewText } from '../i18n/publicPreview';
export { previewText } from '../i18n/publicPreview';
export function PublicPreviewNotice({lang}: {lang: AppLanguage}) {
  return <p role="note" className="rounded-xl bg-amber-50 text-amber-900 p-4 text-sm leading-7">{previewText[lang]}</p>;
}
