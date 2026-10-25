import React, { useState, useMemo, useRef } from 'react';
import { AppLanguage, Hostel } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  MapPin,
  Navigation,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  ExternalLink,
  Star,
  Zap,
  Check,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface Props {
  hostels: Hostel[];
  selectedHostelId?: string | null;
  onSelectHostel?: (hostelId: string | null) => void;
  onNavigate: (view: string, params?: any) => void;
  getHostelRating?: (hostelId: string) => { avg: number; count: number };
  className?: string;
  heightClass?: string;
  showTitle?: boolean;
}

// Yerevan cartographic coordinate bounding box
const YEREVAN_BOUNDS = {
  minLat: 40.1500, // South (Train Station / Sasuntsi Davit)
  maxLat: 40.2150, // North (Arabkir / Komitas)
  minLng: 44.4750, // West (Kilikia Bus Station / Tsitsernakaberd)
  maxLng: 44.5450, // East (Abovyan / Nor Nork slope)
};

interface Landmark {
  id: string;
  name: Record<AppLanguage, string>;
  lat: number;
  lng: number;
  icon: string;
  type: 'square' | 'culture' | 'transit';
}

const YEREVAN_LANDMARKS: Landmark[] = [
  {
    id: 'republic-sq',
    name: {
      fa: 'میدان جمهوری',
      en: 'Republic Square',
      ru: 'Площадь Республики',
      hy: 'Հանրապետության հրապարակ',
    },
    lat: 40.1776,
    lng: 44.5126,
    icon: '🏛️',
    type: 'square',
  },
  {
    id: 'cascade',
    name: {
      fa: 'مجموعه کاسکاد',
      en: 'Cascade Complex',
      ru: 'Каскад',
      hy: 'Կասկադ',
    },
    lat: 40.1912,
    lng: 44.5155,
    icon: '🏔️',
    type: 'culture',
  },
  {
    id: 'opera',
    name: {
      fa: 'تئاتر اپرا',
      en: 'Opera Theatre',
      ru: 'Оперный театр',
      hy: 'Օպերայի թատրոն',
    },
    lat: 40.1855,
    lng: 44.5148,
    icon: '🎭',
    type: 'culture',
  },
  {
    id: 'kilikia',
    name: {
      fa: 'ترمینال اتوبوس کیلیکیا',
      en: 'Kilikia Bus Station',
      ru: 'Автовокзал Киликия',
      hy: 'Կիլիկիա ավտոկայան',
    },
    lat: 40.1712,
    lng: 44.4930,
    icon: '🚌',
    type: 'transit',
  },
  {
    id: 'sasuntsi-davit',
    name: {
      fa: 'ایستگاه راه‌آهن ساسونتسی داویت',
      en: 'Railway Station (Sasuntsi Davit)',
      ru: 'Ж/Д Вокзал (Сасунци Давид)',
      hy: 'Երկաթուղային կայարան',
    },
    lat: 40.1550,
    lng: 44.5085,
    icon: '🚆',
    type: 'transit',
  },
];

export const InteractiveHostelMap: React.FC<Props> = ({
  hostels,
  selectedHostelId: propSelectedId,
  onSelectHostel,
  onNavigate,
  getHostelRating,
  className = '',
  heightClass = 'h-[500px] sm:h-[580px]',
  showTitle = true,
}) => {
  const { currentLang, getLocalized, isRtl } = useLanguage();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  const handleSelectHostel = (id: string | null) => {
    setInternalSelectedId(id);
    if (onSelectHostel) onSelectHostel(id);
  };

  // Zoom & Pan controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Coordinate projection math
  const projectCoords = (lat: number, lng: number) => {
    const latSpan = YEREVAN_BOUNDS.maxLat - YEREVAN_BOUNDS.minLat;
    const lngSpan = YEREVAN_BOUNDS.maxLng - YEREVAN_BOUNDS.minLng;

    // x: west to east (0% to 100%)
    const xPct = Math.max(2, Math.min(98, ((lng - YEREVAN_BOUNDS.minLng) / lngSpan) * 100));
    // y: north to south (0% to 100%)
    const yPct = Math.max(2, Math.min(98, ((YEREVAN_BOUNDS.maxLat - lat) / latSpan) * 100));

    return { x: xPct, y: yPct };
  };

  // Only display Yerevan hostels on the Yerevan map, or project valid bounds
  const yerevanHostels = useMemo(() => {
    return hostels.filter(h => {
      const isYerevan = h.city.toLowerCase() === 'yerevan' || !h.city;
      if (!isYerevan) return false;
      if (districtFilter !== 'all' && h.district !== districtFilter) return false;
      return true;
    });
  }, [hostels, districtFilter]);

  const activeHostel = useMemo(() => {
    if (!activeSelectedId) return null;
    return hostels.find(h => h.id === activeSelectedId) || null;
  }, [hostels, activeSelectedId]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Bound panning
    const maxPan = 180 * zoomLevel;
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.5, Math.max(0.85, prev + delta)));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setDistrictFilter('all');
  };

  // Localized UI strings
  const labels = {
    fa: {
      mapTitle: 'نقشه تعاملی هاستل‌های ایروان',
      mapSubtitle: 'موقعیت دقیق هاستل‌ها، ایستگاه‌های مترو و دسترسی به میدان جمهوری و پایانه اتوبوس',
      allDistricts: 'همه مناطق',
      kentron: 'مرکز (کِنتْرون)',
      arabkir: 'آرابکیر و کومیتاس',
      cascade: 'منطقه کاسکاد',
      landmarksToggle: 'مکان‌های شاخص',
      resetView: 'بازنشانی نقشه',
      viewDetails: 'مشاهده و رزرو',
      openGmaps: 'مسیریابی در گوگل‌مپ',
      nightlyAdmission: 'پذیرش ۲۴ ساعته شبانه فعال',
      bedsFrom: 'شروع قیمت از:',
      perNight: 'هر شب',
      republicSquareDist: 'فاصله تا میدان جمهوری:',
      meters: 'متر',
      kilikiaDist: 'فاصله تا ترمینال اتوبوس:',
      activeHostelsCount: 'هاستل ثبت‌شده در این محدوده',
    },
    en: {
      mapTitle: 'Interactive Yerevan Hostels Map',
      mapSubtitle: 'Real coordinates, metro access, proximity to Republic Square and bus stations',
      allDistricts: 'All Districts',
      kentron: 'Kentron (Center)',
      arabkir: 'Arabkir & Komitas',
      cascade: 'Cascade Area',
      landmarksToggle: 'Landmarks',
      resetView: 'Reset Map',
      viewDetails: 'View Details & Book',
      openGmaps: 'Google Maps Directions',
      nightlyAdmission: '24/7 Night Arrivals Active',
      bedsFrom: 'From:',
      perNight: '/ night',
      republicSquareDist: 'To Republic Square:',
      meters: 'meters',
      kilikiaDist: 'To Kilikia Bus Station:',
      activeHostelsCount: 'hostels found in this view',
    },
    ru: {
      mapTitle: 'Интерактивная карта хостелов Еревана',
      mapSubtitle: 'Реальные координаты, метро, близость к площади Республики и автовокзалу',
      allDistricts: 'Все районы',
      kentron: 'Кентрон (Центр)',
      arabkir: 'Арабкир и Комитас',
      cascade: 'Зона Каскада',
      landmarksToggle: 'Ориентиры',
      resetView: 'Сброс',
      viewDetails: 'Подробнее и бронь',
      openGmaps: 'В Google Maps',
      nightlyAdmission: 'Круглосуточный прием активен',
      bedsFrom: 'От:',
      perNight: '/ ночь',
      republicSquareDist: 'До Площади Республики:',
      meters: 'м',
      kilikiaDist: 'До вокзала Киликия:',
      activeHostelsCount: 'хостелов на карте',
    },
    hy: {
      mapTitle: 'Երևանի հոսթելների ինտերակտիվ քարտեզ',
      mapSubtitle: 'Հոսթելների տեղադրությունը ըստ կոորդինատների, հեռավորությունը Հանրապետության հրապարակից',
      allDistricts: 'Բոլոր թաղամասերը',
      kentron: 'Կենտրոն',
      arabkir: 'Արաբկիր',
      cascade: 'Կասկադի տարածք',
      landmarksToggle: 'Կողմնորոշիչներ',
      resetView: 'Վերակայել',
      viewDetails: 'Դիտել և ամրագրել',
      openGmaps: 'Google Maps ուղեցույց',
      nightlyAdmission: 'Շուրջօրյա գիշերային ընդունում',
      bedsFrom: 'Սկսած՝',
      perNight: '/ գիշեր',
      republicSquareDist: 'Հեռավորությունը հրապարակից՝',
      meters: 'մետր',
      kilikiaDist: 'Կիլիկիա ավտոկայանից՝',
      activeHostelsCount: 'հոսթել քարտեզի վրա',
    },
  }[currentLang] || {
    mapTitle: 'Interactive Yerevan Hostels Map',
    mapSubtitle: 'Real coordinates, metro access, proximity to Republic Square and bus stations',
    allDistricts: 'All Districts',
    kentron: 'Kentron (Center)',
    arabkir: 'Arabkir & Komitas',
    cascade: 'Cascade Area',
    landmarksToggle: 'Landmarks',
    resetView: 'Reset Map',
    viewDetails: 'View Details & Book',
    openGmaps: 'Google Maps Directions',
    nightlyAdmission: '24/7 Night Arrivals Active',
    bedsFrom: 'From:',
    perNight: '/ night',
    republicSquareDist: 'To Republic Square:',
    meters: 'meters',
    kilikiaDist: 'To Kilikia Bus Station:',
    activeHostelsCount: 'hostels found in this view',
  };

  return (
    <div className={`space-y-4 ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4 sm:p-6 overflow-hidden flex flex-col' : ''}`}>
      {/* Header & Controls Bar */}
      {showTitle && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <Compass className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{labels.mapTitle}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {labels.mapSubtitle}
            </p>
          </div>

          {/* District Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 interactive-control">
            {[
              { id: 'all', label: labels.allDistricts },
              { id: 'Kentron', label: labels.kentron },
              { id: 'Arabkir', label: labels.arabkir },
            ].map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDistrictFilter(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  districtFilter === d.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowLandmarks(!showLandmarks)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                showLandmarks
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={labels.landmarksToggle}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{labels.landmarksToggle}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Map Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full ${isFullscreen ? 'flex-1 min-h-0' : heightClass} rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg shadow-slate-900/5 select-none bg-[#f4f3ef] cursor-grab active:cursor-grabbing`}
      >
        {/* Transform Container with Pan & Zoom */}
        <div
          className="absolute inset-0 transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Cartographic SVG Canvas Representation of Yerevan */}
          <svg
            className="w-full h-full pointer-events-none"
            viewBox="0 0 1000 700"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Pattern for urban grid */}
              <pattern id="urbanGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e9e7e1" strokeWidth="0.8" />
              </pattern>
              {/* Green Park Gradients */}
              <linearGradient id="parkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d1ebd9" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c3e4cc" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Background base */}
            <rect width="1000" height="700" fill="#f8f7f4" />
            <rect width="1000" height="700" fill="url(#urbanGrid)" />

            {/* Hrazdan River Gorge (Scenic River curving along western Yerevan) */}
            <path
              d="M 320 0 C 310 120, 240 220, 260 340 C 280 440, 220 540, 250 700"
              fill="none"
              stroke="#b8dceb"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              d="M 320 0 C 310 120, 240 220, 260 340 C 280 440, 220 540, 250 700"
              fill="none"
              stroke="#8ac3df"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Green Parks: Cascade Gardens & Circular Park (Kentron Belt) */}
            {/* Cascade Park */}
            <polygon points="560,180 620,180 600,240 570,240" fill="url(#parkGrad)" rx="8" />
            {/* Circular Park Belt wrapping Republic Center */}
            <path
              d="M 520 280 C 660 310, 680 460, 560 540"
              fill="none"
              stroke="#cae9d3"
              strokeWidth="38"
              strokeLinecap="round"
            />
            {/* English Park */}
            <ellipse cx="510" cy="460" rx="45" ry="30" fill="url(#parkGrad)" />

            {/* Major Arterial Avenues of Yerevan */}
            {/* Komitas Avenue (Arabkir East-West) */}
            <line x1="180" y1="130" x2="850" y2="130" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
            <line x1="180" y1="130" x2="850" y2="130" stroke="#f1efe7" strokeWidth="8" strokeLinecap="round" />

            {/* Bagramyan & Mashtots Avenues */}
            <path d="M 400 130 Q 480 230 540 370" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
            <path d="M 400 130 Q 480 230 540 370" fill="none" stroke="#f1efe7" strokeWidth="8" strokeLinecap="round" />

            {/* Tigran Mets Avenue (From Republic Square down to Railway Station) */}
            <line x1="550" y1="400" x2="520" y2="600" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
            <line x1="550" y1="400" x2="520" y2="600" stroke="#f1efe7" strokeWidth="8" strokeLinecap="round" />

            {/* Central Ring Road around Republic Square */}
            <ellipse cx="550" cy="400" rx="90" ry="75" fill="none" stroke="#ffffff" strokeWidth="14" />
            <ellipse cx="550" cy="400" rx="90" ry="75" fill="none" stroke="#e8e4d8" strokeWidth="8" />
            <ellipse cx="550" cy="400" rx="35" ry="28" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />

            {/* Yerevan Metro Line (Dotted Red Route) */}
            <path
              d="M 420 130 L 490 230 L 550 320 L 550 400 L 530 480 L 520 600"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              opacity="0.85"
            />

            {/* District Territory Labels */}
            <text x="320" y="110" fill="#94a3b8" fontSize="16" fontWeight="bold" letterSpacing="3">ARABKIR / ԱՐԱԲԿԻՐ</text>
            <text x="500" y="270" fill="#94a3b8" fontSize="18" fontWeight="black" letterSpacing="4">KENTRON / ԿԵՆՏՐՈՆ</text>
            <text x="210" y="470" fill="#cbd5e1" fontSize="14" fontWeight="semibold" letterSpacing="2">KILIKIA</text>
          </svg>

          {/* Landmarks Layer */}
          {showLandmarks &&
            YEREVAN_LANDMARKS.map(lm => {
              const pos = projectCoords(lm.lat, lm.lng);
              const lmName = lm.name[currentLang] || lm.name.en;
              return (
                <div
                  key={lm.id}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-transform"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-white/95 border border-slate-300 shadow-md flex items-center justify-center text-xs">
                    {lm.icon}
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-slate-700 shadow-2xs whitespace-nowrap border border-slate-200">
                    {lmName}
                  </span>
                </div>
              );
            })}

          {/* Hostel Markers Layer */}
          {yerevanHostels.map(hostel => {
            const pos = projectCoords(hostel.coordinates.lat, hostel.coordinates.lng);
            const isSelected = activeSelectedId === hostel.id;
            const hostelName = getLocalized(hostel.name, hostel.name.fa);
            const rating = getHostelRating ? getHostelRating(hostel.id) : { avg: 4.8, count: 24 };

            return (
              <div
                key={hostel.id}
                className="absolute -translate-x-1/2 -translate-y-full cursor-pointer z-20 group transition-all duration-200 interactive-control"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectHostel(isSelected ? null : hostel.id);
                }}
              >
                {/* Immediate check-in pulse radar ring */}
                {hostel.immediateStayEnabled && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border-2 border-white"></span>
                  </span>
                )}

                {/* Pin Shape with Price Pill */}
                <div
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl shadow-xl transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 scale-115 ring-4 ring-amber-400/50 shadow-amber-500/35 z-30'
                      : 'bg-slate-950 hover:bg-amber-500 text-white hover:text-slate-950 hover:scale-108'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400 group-hover:text-slate-950'}`} />
                  <span className="text-xs font-black font-mono tracking-tight">
                    ֏{hostel.minPricePerNightAMD.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold opacity-90">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>{rating.avg.toFixed(1)}</span>
                  </div>

                  {/* Pin tail arrow */}
                  <div
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-xs transition-colors ${
                      isSelected ? 'bg-amber-500' : 'bg-slate-950 group-hover:bg-amber-500'
                    }`}
                  />
                </div>

                {/* Hover Label Tooltip */}
                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-xl whitespace-nowrap pointer-events-none transition-all ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <span className="block max-w-[180px] truncate">{hostelName}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Map Utility Controls */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5 interactive-control">
          <button
            type="button"
            onClick={() => handleZoom(0.3)}
            className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white shadow-md flex items-center justify-center font-bold text-sm cursor-pointer transition-all active:scale-95"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.3)}
            className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white shadow-md flex items-center justify-center font-bold text-sm cursor-pointer transition-all active:scale-95"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white shadow-md flex items-center justify-center text-xs cursor-pointer transition-all active:scale-95"
            title={labels.resetView}
            aria-label="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend / Info Strip */}
        <div className="absolute bottom-4 left-4 z-30 hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 text-[11px] text-slate-600 shadow-md">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-300" />
            <span>{yerevanHostels.length} {labels.activeHostelsCount}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>{labels.nightlyAdmission}</span>
          </div>
        </div>

        {/* Active Selected Hostel Popup Floating Card */}
        {activeHostel && (
          <div className="absolute bottom-4 right-4 max-w-sm w-[calc(100%-2rem)] sm:w-88 z-30 bg-white/98 backdrop-blur-xl rounded-3xl p-4 border border-slate-200 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 interactive-control">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeHostel.photos[0]}
                  alt={getLocalized(activeHostel.name, activeHostel.name.fa)}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200/80 shadow-xs"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                      {activeHostel.district}
                    </span>
                    {activeHostel.immediateStayEnabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-red-600 text-red-600" />
                        <span>24/7</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate mt-1">
                    {getLocalized(activeHostel.name, activeHostel.name.fa)}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {getLocalized(activeHostel.address, activeHostel.address.fa)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectHostel(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price & Rating Row */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">{labels.bedsFrom}</span>
                <span className="font-mono text-base font-black text-slate-950">
                  ֏{activeHostel.minPricePerNightAMD.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-medium"> {labels.perNight}</span>
              </div>

              <div className="flex items-center gap-1 text-slate-700 font-bold bg-slate-50 px-2.5 py-1 rounded-xl">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>
                  {getHostelRating ? getHostelRating(activeHostel.id).avg.toFixed(1) : '4.9'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('hostel-detail', { id: activeHostel.id })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{labels.viewDetails}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>

              <a
                href={`https://maps.google.com/?q=${activeHostel.coordinates.lat},${activeHostel.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                title={labels.openGmaps}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
