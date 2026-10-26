import React from 'react';
import type { AppLanguage } from '../types';
import { propertyText } from '../i18n/properties';
export function ListingDisclosure({currentLang,factsConfirmed,sampleContent}:{currentLang:AppLanguage;factsConfirmed?:boolean;sampleContent?:boolean}) {
  if(factsConfirmed&&!sampleContent)return null;
  return <p className="text-xs leading-6 rounded-xl bg-amber-50 text-amber-900 px-4 py-2" role="note">{propertyText(currentLang)('sample')}</p>;
}
