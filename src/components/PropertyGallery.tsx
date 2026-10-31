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
  if (!photos.length) return null;
  return <section aria-label={name} className="min-w-0 space-y-3">
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory rounded-3xl pb-2">
      {photos.map((photo, i) => <button key={`${photo}-${i}`} type="button" aria-label={`${text.open} ${i + 1} / ${photos.length}`} onClick={() => { setIndex(i); dialog.current?.showModal(); }} className={`relative shrink-0 snap-center overflow-hidden rounded-2xl ${photos.length === 1 ? 'w-full' : 'w-[88%] sm:w-[65%] md:w-[48%]'}`}>
        <img src={photo} alt={`${name} · ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} className="aspect-[16/10] w-full object-cover bg-slate-100" />
        <span className="absolute bottom-3 end-3 rounded-full bg-black/70 px-3 py-1 text-sm text-white">{i + 1} / {photos.length}</span>
      </button>)}
    </div>
    <dialog ref={dialog} aria-label={name} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[calc(100dvh-2rem)] overflow-auto rounded-2xl bg-slate-950 p-3 text-white backdrop:bg-black/80" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    }}>
      <div className="flex items-center justify-between gap-3 pb-3"><span>{index + 1} / {photos.length}</span><button autoFocus type="button" className="min-h-11 rounded-xl px-4" onClick={() => dialog.current?.close()}>{text.close}</button></div>
      <img src={photos[index]} alt={`${name} · ${index + 1}`} className="max-h-[65dvh] w-full object-contain" />
      {photos.length > 1 && <div className="flex justify-between gap-3 pt-3"><button type="button" className="min-h-11 rounded-xl px-4" onClick={() => move(-1)}>{text.previous}</button><button type="button" className="min-h-11 rounded-xl px-4" onClick={() => move(1)}>{text.next}</button></div>}
    </dialog>
  </section>;
}
