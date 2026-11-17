import React, { Children, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppLanguage } from '../types';
import './StayCarousel.css';

const COPY = {
  fa: { previous: 'اقامتگاه قبلی', next: 'اقامتگاه بعدی', hint: 'برای دیدن موارد بیشتر، افقی ورق بزنید', carousel: 'نمایش کشویی اقامتگاه‌ها' },
  en: { previous: 'Previous stay', next: 'Next stay', hint: 'Scroll horizontally to explore more stays', carousel: 'Stay carousel' },
  ru: { previous: 'Предыдущее жильё', next: 'Следующее жильё', hint: 'Листайте горизонтально, чтобы увидеть больше', carousel: 'Карусель жилья' },
  hy: { previous: 'Նախորդ կացարանը', next: 'Հաջորդ կացարանը', hint: 'Այլ տարբերակներ տեսնելու համար թերթեք հորիզոնական', carousel: 'Կացարանների կարուսել' },
};

export function StayCarousel({ lang, label, children }: { lang: AppLanguage; label: string; children: React.ReactNode }) {
  const items = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const rtl = lang === 'fa';
  const copy = COPY[lang];
  const [edges, setEdges] = useState({ start: true, end: true });
  // A new result order resets to the first card after filtering or sorting.
  const itemKeys = JSON.stringify(items.map(item => React.isValidElement(item) ? item.key : null));

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({ left: 0, behavior: 'instant' });
    const update = () => {
      const position = Math.abs(element.scrollLeft);
      setEdges({ start: position < 2, end: position >= element.scrollWidth - element.clientWidth - 2 });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, [itemKeys, rtl]);

  const move = (step: number) => {
    const element = track.current;
    if (!element) return;
    const card = element.firstElementChild;
    const width = card?.getBoundingClientRect().width ?? element.clientWidth;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: step * (rtl ? -1 : 1) * (width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  if (!items.length) return null;
  const Previous = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  return <section className="stay-carousel" dir={rtl ? 'rtl' : 'ltr'} aria-label={label} aria-roledescription={copy.carousel}>
    <div className="stay-carousel-toolbar">
      <p id={`${id}-hint`} className="text-xs text-slate-500">{!edges.start || !edges.end ? copy.hint : ''}</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="stay-carousel-arrow" aria-label={copy.previous} aria-controls={id} disabled={edges.start} onClick={() => move(-1)}><Previous size={20} aria-hidden="true" /></button>
        <button type="button" className="stay-carousel-arrow" aria-label={copy.next} aria-controls={id} disabled={edges.end} onClick={() => move(1)}><Next size={20} aria-hidden="true" /></button>
      </div>
    </div>
    <div ref={track} id={id} className="stay-carousel-track" tabIndex={0} role="group" aria-label={label} aria-describedby={`${id}-hint`} onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move((event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1));
      }
    }}>
      {items.map((item, index) => <div key={React.isValidElement(item) ? item.key ?? index : index} className="stay-carousel-item">{item}</div>)}
    </div>
  </section>;
}
