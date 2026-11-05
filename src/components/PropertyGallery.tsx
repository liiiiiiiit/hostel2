import { StayPhoto } from './StayPhoto';
import { stayExperience } from '../i18n/stayExperience';
import React, { useRef, useState } from 'react';
import type { AppLanguage } from '../types';

export function PropertyGallery({ photos, name, lang }: { photos: string[]; name: string; lang: AppLanguage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const text = {
    fa: { open: 'نمایش عکس', close: 'بستن گالری', next: 'عکس بعدی', previous: 'عکس قبلی' },
    en: { open: 'View photo', close: 'Close gallery', next: 'Next photo', previous: 'Previous photo' },
    ru: { open: 'Открыть фото', close: 'Закрыть галерею', next: 'Следующее фото', previous: 'Предыдущее фото' },
    hy: { open: 'Դիտել լուսանկարը', close: 'Փակել պատկերասրահը', next: 'Հաջորդ լուսանկարը', previous: 'Նախորդ լուսանկարը' },
  }[lang];
  const move = (delta: number) => setIndex(value => (value + delta + photos.length) % photos.length);
  const design = stayExperience(lang);
  if (!photos.length) return <div className="surface flex min-h-48 items-center justify-center text-sm text-slate-500">{design.noPhoto}</div>;
  return <section aria-label={name} className="min-w-0 space-y-3">
    <div className="property-gallery" data-count={Math.min(photos.length,5)}>
      {photos.slice(0,5).map((photo, i) => <button key={`${photo}-${i}`} type="button" aria-label={`${text.open} ${i + 1} / ${photos.length}`} onClick={() => { setIndex(i); dialog.current?.showModal(); }} className="group">
        <StayPhoto src={photo} alt={`${name} · ${i + 1}`} eager={i===0}/>
        {i===0 && <span className="gallery-more">{design.photos} · {photos.length}</span>}
      </button>)}
    </div>
    <dialog ref={dialog} aria-label={name} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[calc(100dvh-2rem)] overflow-auto rounded-2xl bg-slate-950 p-3 text-white backdrop:bg-black/80" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(lang === 'fa' ? -1 : 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(lang === 'fa' ? 1 : -1); }
    }}>
      <div className="flex items-center justify-between gap-3 pb-3"><span>{index + 1} / {photos.length}</span><button autoFocus type="button" className="min-h-11 rounded-xl px-4" onClick={() => dialog.current?.close()}>{text.close}</button></div>
      <div className="gallery-lightbox-photo"><StayPhoto src={photos[index]} alt={`${name} · ${index + 1}`} className="h-[60dvh] w-full" eager /></div>
      {photos.length > 1 && <div className="flex justify-between gap-3 pt-3"><button type="button" className="min-h-11 rounded-xl px-4" onClick={() => move(-1)}>{text.previous}</button><button type="button" className="min-h-11 rounded-xl px-4" onClick={() => move(1)}>{text.next}</button></div>}
    </dialog>
  </section>;
}
