import React from 'react';
import type { AppLanguage } from '../types';
import { loadingText } from '../i18n/loading';

export function ContentLoading({ lang, listings = false }: { lang: AppLanguage; listings?: boolean }) {
  return <div role="status" aria-live="polite" aria-busy="true" className={listings ? '' : 'page-shell min-h-80'} data-testid="content-loading">
    <p className="mb-4 text-sm text-slate-500">{loadingText(lang)[listings ? 'listings' : 'loading']}</p>
    <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map(index => <div key={index} className={`overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white ${index ? 'hidden md:block' : ''}`}>
        <div className="aspect-[4/2.8] animate-pulse bg-[#e5ece5]" />
        <div className="space-y-3 p-5"><div className="h-3 w-1/3 rounded bg-slate-100"/><div className="h-5 w-3/4 rounded bg-slate-100"/><div className="h-4 w-1/2 rounded bg-slate-100"/></div>
      </div>)}
    </div>
  </div>;
}
