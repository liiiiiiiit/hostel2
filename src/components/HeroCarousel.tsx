import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { AppLanguage } from '../types';
import { StayPhoto } from './StayPhoto';

const images = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85',
  'https://images.pexels.com/photos/35215765/pexels-photo-35215765/free-photo-of-republic-square-in-yerevan-with-iconic-clock-tower.jpeg?auto=compress&dpr=1&h=750&w=1260',
];
const copy = {
  fa: {
    label: 'خدمات یروان هاب', previous: 'اسلاید قبلی', next: 'اسلاید بعدی', pause: 'توقف چرخش تصاویر', play: 'پخش تصاویر', slide: 'اسلاید',
    slides: [
      { tag: 'هاستل و اتاق', title: 'جای خوب پیدا کن؛ خاطره‌های تازه بساز.', description: 'هاستل‌ها و اتاق‌ها را مقایسه کن و اقامت مناسب سفرت را پیدا کن.', action: 'کشف هاستل‌ها' },
      { tag: 'خانه و آپارتمان', title: 'خانه‌ای برای روزهای تازهٔ تو.', description: 'خانه‌ها و آپارتمان‌ها را ببین و فضای دلخواهت را انتخاب کن.', action: 'دیدن خانه‌ها' },
      { tag: 'راهنمای سفر و مترجم', title: 'ارمنستان را نزدیک‌تر تجربه کن.', description: 'با راهنمای سفر و مترجم چهارزبانه، آماده‌تر قدم به شهر بگذار.', action: 'راهنمای سفر', secondary: 'مترجم همراه' },
    ],
  },
  en: {
    label: 'Yerevan Hub services', previous: 'Previous slide', next: 'Next slide', pause: 'Pause slideshow', play: 'Play slideshow', slide: 'Slide',
    slides: [
      { tag: 'Hostels & rooms', title: 'Find your stay. Make new memories.', description: 'Compare hostels and rooms to find a stay that fits your trip.', action: 'Explore hostels' },
      { tag: 'Homes & apartments', title: 'A place to make your own.', description: 'Explore homes and apartments and choose your kind of space.', action: 'Explore homes' },
      { tag: 'Travel guide & translator', title: 'Feel closer to Armenia.', description: 'Explore with a travel guide and a translator in four languages.', action: 'Travel guide', secondary: 'Open translator' },
    ],
  },
  ru: {
    label: 'Услуги Yerevan Hub', previous: 'Предыдущий слайд', next: 'Следующий слайд', pause: 'Остановить показ', play: 'Продолжить показ', slide: 'Слайд',
    slides: [
      { tag: 'Хостелы и номера', title: 'Найдите жильё. Создавайте воспоминания.', description: 'Сравните хостелы и номера и выберите подходящий вариант.', action: 'Найти хостел' },
      { tag: 'Дома и квартиры', title: 'Ваш уютный уголок в новом городе.', description: 'Посмотрите дома и квартиры и выберите своё пространство.', action: 'Смотреть жильё' },
      { tag: 'Путеводитель и переводчик', title: 'Откройте для себя Армению.', description: 'Путеводитель и переводчик на четырёх языках помогут в поездке.', action: 'Путеводитель', secondary: 'Переводчик' },
    ],
  },
  hy: {
    label: 'Yerevan Hub ծառայություններ', previous: 'Նախորդ սլայդ', next: 'Հաջորդ սլայդ', pause: 'Դադարեցնել ցուցադրումը', play: 'Շարունակել ցուցադրումը', slide: 'Սլայդ',
    slides: [
      { tag: 'Հոսթելներ և սենյակներ', title: 'Գտեք կացարան, ստեղծեք հիշողություններ։', description: 'Համեմատեք հոսթելներն ու սենյակները և ընտրեք հարմար տարբերակը։', action: 'Դիտել հոսթելները' },
      { tag: 'Տներ և բնակարաններ', title: 'Ձեր անկյունը նոր քաղաքում։', description: 'Դիտեք տներն ու բնակարանները և ընտրեք ձեր տարածքը։', action: 'Դիտել բնակարանները' },
      { tag: 'Ուղեցույց և թարգմանիչ', title: 'Բացահայտեք Հայաստանը։', description: 'Ճամփորդեք ուղեցույցի և չորս լեզվով թարգմանչի օգնությամբ։', action: 'Ճամփորդական ուղեցույց', secondary: 'Թարգմանիչ' },
    ],
  },
};
export function HeroCarousel({ language, onNavigate }: {
  language: AppLanguage; onNavigate: (view: string) => void;
}) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const t = copy[language];
  const slide = t.slides[active];
  const isRtl = language === 'fa';
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    const syncVisibility = () => setHidden(document.hidden);
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => { media.removeEventListener('change', syncMotion); document.removeEventListener('visibilitychange', syncVisibility); };
  }, []);
  useEffect(() => {
    if (hovered || focused || hidden || reducedMotion) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % images.length), 4000);
    return () => window.clearInterval(timer);
  }, [hovered, focused, hidden, reducedMotion, active]);
  return <section className="hero-carousel" role="region" aria-roledescription="carousel" aria-label={t.label}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="hero-slide" role="group" aria-roledescription="slide" aria-label={`${t.slide} ${active + 1} / 3`} aria-live="off">
      <StayPhoto key={active} src={images[active]} alt="" className="discovery-photo hero-slide-photo" eager />
      <div className="hero-slide-shade" aria-hidden="true" />
      <div className="hero-slide-copy">
        <p className="hero-slide-tag">{slide.tag}</p>
        <h1>{slide.title}</h1>
        <p className="hero-slide-description">{slide.description}</p>
        <div className="hero-slide-actions">
          <button type="button" onClick={() => onNavigate(['hostels', 'rentals', 'guide'][active])}>{slide.action}{isRtl ? <ArrowLeft size={17}/> : <ArrowRight size={17}/>}</button>
          {'secondary' in slide && <button type="button" className="hero-slide-secondary" onClick={() => onNavigate('translator')}>{slide.secondary}</button>}
        </div>
      </div>
    </div>
    <div className="hero-carousel-controls">
      <div className="hero-carousel-dots">{t.slides.map((item, index) => <button type="button" key={index}
        aria-label={`${t.slide} ${index + 1}: ${item.tag}`} aria-current={active === index ? 'true' : undefined}
        onClick={() => setActive(index)}><span /></button>)}</div>

    </div>
  </section>;
}
