import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, House, Compass, BriefcaseBusiness, BookOpen, Languages, Pause, Play } from 'lucide-react';
import type { AppLanguage } from '../types';
import { heroSlides, heroLabels, HERO_DURATION_MS } from '../i18n/heroSlides';
import { browserPath } from '../utils/public-routes';
import { StayPhoto } from './StayPhoto';

const icons = { hostels: BedDouble, rentals: House, tours: Compass, jobs: BriefcaseBusiness, guide: BookOpen, translator: Languages };
const emptyEntities = { hostels: [], rentals: [], articles: [] };

export function HeroCarousel({ language, onNavigate }: {
  language: AppLanguage; onNavigate: (view: string) => void;
}) {
  const [selection, setSelection] = useState({ index: 0, cycle: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const active = selection.index;
  const slide = heroSlides[active];
  const copy = slide.copy[language];
  const labels = heroLabels[language];
  const isRtl = language === 'fa';
  const paused = hovered || focused || held || manualPause || hidden || reducedMotion;
  const select = (index: number) => setSelection(value => ({ index: (index + heroSlides.length) % heroSlides.length, cycle: value.cycle + 1 }));
  const advance = (step: number) => setSelection(value => ({ index: (value.index + step + heroSlides.length) % heroSlides.length, cycle: value.cycle + 1 }));

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    const syncVisibility = () => setHidden(document.hidden);
    const release = () => { setHeld(false); gesture.current = null; };
    syncMotion(); syncVisibility();
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      media.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, []);

  useEffect(() => {
    const track = categoriesRef.current;
    const selected = track?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!track || !selected) return;
    const bounds = track.getBoundingClientRect(), pill = selected.getBoundingClientRect();
    const delta = pill.left < bounds.left ? pill.left - bounds.left : pill.right > bounds.right ? pill.right - bounds.right : 0;
    // Only scroll the category rail; never move the page when the slide rotates.
    if (delta) track.scrollBy({ left: delta, behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [active, language, reducedMotion]);

  useEffect(() => {
    // Warm only the next image; keep the initial page load focused on the hero.
    const nextImage = new Image();
    nextImage.decoding = 'async';
    nextImage.fetchPriority = 'low';
    nextImage.src = heroSlides[(active + 1) % heroSlides.length].image;
  }, [active]);

  const pointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    setHeld(true);
    if ((event.target as HTMLElement).closest('button, a, .hero-categories')) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    setHeld(false); gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) advance((dx < 0 ? 1 : -1) * (isRtl ? -1 : 1));
  };
  const Forward = isRtl ? ArrowLeft : ArrowRight;
  const Back = isRtl ? ArrowRight : ArrowLeft;

  return <section className="hero-carousel" dir={isRtl ? 'rtl' : 'ltr'} role="region" aria-roledescription="carousel" aria-label={labels.label}
    data-paused={paused} data-slide={slide.id} style={{ '--hero-duration': `${HERO_DURATION_MS}ms`, '--hero-image-position': slide.imagePosition ?? 'center' } as CSSProperties}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') setHovered(false); }}
    onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { setHeld(false); gesture.current = null; }}
    onFocusCapture={event => setFocused(event.target.matches(':focus-visible'))}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance((event.key === 'ArrowRight' ? 1 : -1) * (isRtl ? -1 : 1));
      }
    }}>
    <div className="hero-slide" role="group" aria-roledescription="slide" aria-label={`${labels.slide} ${active + 1} / ${heroSlides.length}: ${copy.badge}`} aria-live={paused ? 'polite' : 'off'}>
      <StayPhoto key={`${slide.id}-${selection.cycle}`} src={slide.image} alt="" className="hero-slide-photo" eager />
      <div className="hero-slide-shade" aria-hidden="true" />
      <div className="hero-slide-copy" key={`${language}-${selection.cycle}`}>
        <p className="hero-slide-tag">{copy.badge}</p>
        <h1>{copy.headline}</h1>
        <p className="hero-slide-description">{copy.subtitle}</p>
        <div className="hero-slide-actions">
          <a href={browserPath(slide.view, {}, language, emptyEntities)} onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); onNavigate(slide.view);
          }}>{copy.cta}<Forward size={17} aria-hidden="true" /></a>
        </div>
      </div>
      <div className="hero-desktop-arrows">
        <button type="button" className="hero-glass-button" onClick={() => advance(-1)} aria-label={labels.previous}><Back size={18} aria-hidden="true" /></button>
        <button type="button" className="hero-glass-button" onClick={() => advance(1)} aria-label={labels.next}><Forward size={18} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="hero-story-toolbar">
      <div className="hero-story-progress" aria-hidden="true">
        {heroSlides.map((item, index) => <span className="hero-story-segment" key={item.id} data-complete={index < active}>
          {index === active && <span key={selection.cycle} className="hero-story-fill" onAnimationEnd={event => {
            if (event.animationName === 'hero-story-fill' && !paused) advance(1);
          }} />}
        </span>)}
      </div>
      <span className="hero-story-count" aria-hidden="true">{String(active + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>
      <button type="button" className="hero-glass-button hero-playback" disabled={reducedMotion}
        onClick={() => setManualPause(value => !value)} aria-label={manualPause ? labels.play : labels.pause} aria-pressed={manualPause}>
        {manualPause || reducedMotion ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
      </button>
    </div>
    <div className="hero-carousel-controls">
      <div className="hero-categories" ref={categoriesRef} role="group" aria-label={labels.categories}>
        {heroSlides.map((item, index) => {
          const Icon = icons[item.view];
          return <button type="button" key={item.id} className="hero-category" aria-current={active === index ? 'true' : undefined}
            aria-label={`${labels.slide} ${index + 1}: ${item.copy[language].chip}`} onClick={() => select(index)}>
            <Icon size={15} strokeWidth={1.6} aria-hidden="true" /><span>{item.copy[language].chip}</span>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
