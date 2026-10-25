import React, { useState } from 'react';
import { AppLanguage, Hostel } from '../types';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Train,
  Bus,
  Sparkles,
  ShoppingBag,
  Building,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { getLocalized } from '../utils/i18n';

interface Props {
  hostel: Hostel;
  currentLang: AppLanguage;
}

// Calculate great-circle distance between two GPS coordinates in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Format distance nicely in localized units
function formatDistance(meters: number, lang: AppLanguage): { text: string; walkMin: number; taxiMin: number } {
  const walkMin = Math.max(1, Math.round(meters / 80)); // ~80m per min walk
  const taxiMin = Math.max(2, Math.round(meters / 400)); // ~400m per min taxi in city

  let text = '';
  if (meters < 1000) {
    if (lang === 'fa') text = `${meters} متر`;
    else if (lang === 'en') text = `${meters} m`;
    else if (lang === 'ru') text = `${meters} м`;
    else text = `${meters} մ`;
  } else {
    const km = (meters / 1000).toFixed(1);
    if (lang === 'fa') text = `${km} کیلومتر`;
    else if (lang === 'en') text = `${km} km`;
    else if (lang === 'ru') text = `${km} км`;
    else text = `${km} կմ`;
  }

  return { text, walkMin, taxiMin };
}

export const HostelLocationMap: React.FC<Props> = ({ hostel, currentLang }) => {
  const [copied, setCopied] = useState<'coords' | 'address' | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const lat = hostel.coordinates.lat;
  const lng = hostel.coordinates.lng;

  // Yerevan Key Reference Landmarks
  const landmarks = [
    {
      id: 'republic-sq',
      name: { fa: 'میدان جمهوری (قلب شهر)', en: 'Republic Square (City Heart)', ru: 'Площадь Республики', hy: 'Հանրապետության հրապարակ' },
      lat: 40.1777,
      lng: 44.5126,
      icon: Building,
      type: 'center',
    },
    {
      id: 'metro-station',
      name: { fa: 'نزدیک‌ترین ایستگاه مترو', en: 'Nearest Metro Station', ru: 'Ближайшая станция метро', hy: 'Մետրոյի մոտակա կայարան' },
      lat: 40.1792,
      lng: 44.5145,
      icon: Train,
      type: 'transit',
    },
    {
      id: 'kilikia-terminal',
      name: { fa: 'ترمینال اتوبوس کیلیکیا (ایران)', en: 'Kilikia Bus Station (Iran Transit)', ru: 'Автовокзал Киликия', hy: 'Կիլիկիա ավտոկայան' },
      lat: 40.1695,
      lng: 44.4890,
      icon: Bus,
      type: 'bus',
    },
    {
      id: 'sas-supermarket',
      name: { fa: 'سوپرمارکت ۲۴ ساعته و صرافی SAS', en: '24/7 SAS Supermarket & Exchange', ru: 'Круглосуточный супермаркет SAS', hy: '24/7 SAS Սուպերմարկետ' },
      lat: 40.1810,
      lng: 44.5135,
      icon: ShoppingBag,
      type: 'convenience',
    },
  ];

  // Map coordinate projection centered around THIS hostel
  // We span roughly ~0.04 degrees (~4.5km) box centered on hostel
  const latSpan = 0.045;
  const lngSpan = 0.055;
  const minLat = lat - latSpan * 0.45;
  const maxLat = lat + latSpan * 0.55;
  const minLng = lng - lngSpan * 0.5;
  const maxLng = lng + lngSpan * 0.5;

  const projectCoords = (targetLat: number, targetLng: number) => {
    const xPct = ((targetLng - minLng) / lngSpan) * 100;
    const yPct = ((maxLat - targetLat) / latSpan) * 100;
    return {
      x: Math.max(5, Math.min(95, xPct)),
      y: Math.max(5, Math.min(95, yPct)),
    };
  };

  const hostelPos = projectCoords(lat, lng);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: Math.max(-150, Math.min(150, e.clientX - dragStart.x)),
      y: Math.max(-150, Math.min(150, e.clientY - dragStart.y)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const copyToClipboard = (text: string, type: 'coords' | 'address') => {
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  const localizedName = getLocalized(hostel.name, currentLang);
  const localizedAddress = getLocalized(hostel.address, currentLang);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const yandexMapsUrl = `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`;

  const labels = {
    fa: {
      locationTitle: 'موقعیت مکانی و نقشه دسترسی',
      locationSubtitle: 'موقعیت دقیق جغرافیایی، دسترسی‌های شهری و فواصل تا نقاط کلیدی ایروان',
      coordinates: 'مختصات جغرافیایی:',
      copyCoords: 'کپی مختصات',
      copyAddress: 'کپی آدرس',
      copied: 'کپی شد ✓',
      openGoogle: 'مسیریابی در گوگل‌مپ (Google Maps)',
      openYandex: 'مسیریابی با یاندکس (Yandex Maps)',
      walkTime: 'پیاده‌روی',
      taxiTime: 'با تاکسی',
      minutes: 'دقیقه',
      nearbyHighlights: 'فواصل و دسترسی‌ها از این هاستل:',
      hostelHereBadge: 'موقعیت این هاستل',
      resetView: 'بازنشانی نقشه',
    },
    en: {
      locationTitle: 'Hostel Location & Access Map',
      locationSubtitle: 'Precise GPS coordinates, urban connections, and walking distances to key spots',
      coordinates: 'GPS Coordinates:',
      copyCoords: 'Copy Coords',
      copyAddress: 'Copy Address',
      copied: 'Copied ✓',
      openGoogle: 'Directions on Google Maps',
      openYandex: 'Open in Yandex Maps',
      walkTime: 'walk',
      taxiTime: 'taxi',
      minutes: 'min',
      nearbyHighlights: 'Distances & Transit from this Hostel:',
      hostelHereBadge: 'Hostel Location',
      resetView: 'Reset Map',
    },
    ru: {
      locationTitle: 'Расположение хостела и карта',
      locationSubtitle: 'Точные координаты, транспортная доступность и расстояния до ключевых мест',
      coordinates: 'Координаты GPS:',
      copyCoords: 'Копировать',
      copyAddress: 'Адрес',
      copied: 'Скопировано ✓',
      openGoogle: 'Открыть в Google Maps',
      openYandex: 'Открыть в Яндекс Картах',
      walkTime: 'пешком',
      taxiTime: 'на такси',
      minutes: 'мин',
      nearbyHighlights: 'Расстояния от хостела:',
      hostelHereBadge: 'Расположение хостела',
      resetView: 'Сброс',
    },
    hy: {
      locationTitle: 'Հոսթելի գտնվելու վայրը և քարտեզը',
      locationSubtitle: 'Ճշգրիտ կոորդինատներ և հեռավորություններ հիմնական վայրերից',
      coordinates: 'GPS Կոորդինատներ՝',
      copyCoords: 'Պատճենել',
      copyAddress: 'Հասցե',
      copied: 'Պատճենված է ✓',
      openGoogle: 'Google Maps ուղեցույց',
      openYandex: 'Yandex Maps',
      walkTime: 'ոտքով',
      taxiTime: 'տաքսիով',
      minutes: 'րոպե',
      nearbyHighlights: 'Հեռավորությունը հիմնական վայրերից՝',
      hostelHereBadge: 'Հոսթելի դիրքը',
      resetView: 'Վերակայել',
    },
  }[currentLang] || {
    locationTitle: 'موقعیت مکانی و نقشه دسترسی',
    locationSubtitle: 'موقعیت دقیق جغرافیایی، دسترسی‌های شهری و فواصل تا نقاط کلیدی ایروان',
    coordinates: 'مختصات جغرافیایی:',
    copyCoords: 'کپی مختصات',
    copyAddress: 'کپی آدرس',
    copied: 'کپی شد ✓',
    openGoogle: 'مسیریابی در گوگل‌مپ',
    openYandex: 'مسیریابی با یاندکس',
    walkTime: 'پیاده‌روی',
    taxiTime: 'با تاکسی',
    minutes: 'دقیقه',
    nearbyHighlights: 'فواصل و دسترسی‌ها از این هاستل:',
    hostelHereBadge: 'موقعیت این هاستل',
    resetView: 'بازنشانی نقشه',
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-7 space-y-6">
      {/* Title & Coordinates Info Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>{labels.locationTitle}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            {localizedName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {labels.locationSubtitle}
          </p>
        </div>

        {/* Action Buttons: Google Maps & Copy Coordinates */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'coords')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied === 'coords' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied === 'coords' ? labels.copied : labels.copyCoords}</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{labels.openGoogle}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <a
            href={yandexMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">{labels.openYandex}</span>
          </a>
        </div>
      </div>

      {/* Interactive Map Visual */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 bg-[#f6f5f0] cursor-grab active:cursor-grabbing select-none shadow-inner"
      >
        <div
          className="absolute inset-0 transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Street & Urban Cartography SVG */}
          <svg className="w-full h-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <pattern id="hostelMapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ebe8e0" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Base Fill & Grid */}
            <rect width="1000" height="600" fill="#f8f7f4" />
            <rect width="1000" height="600" fill="url(#hostelMapGrid)" />

            {/* River Hrazdan Curve on the left if applicable */}
            <path
              d="M 120 0 C 130 150, 90 300, 110 450 C 120 520, 100 600, 110 600"
              fill="none"
              stroke="#cae3ee"
              strokeWidth="20"
              strokeLinecap="round"
            />

            {/* Major Arterial Roads */}
            <line x1="0" y1="300" x2="1000" y2="300" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
            <line x1="0" y1="300" x2="1000" y2="300" stroke="#f1efe7" strokeWidth="10" strokeLinecap="round" />

            <line x1="500" y1="0" x2="500" y2="600" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
            <line x1="500" y1="0" x2="500" y2="600" stroke="#f1efe7" strokeWidth="10" strokeLinecap="round" />

            <line x1="150" y1="120" x2="850" y2="480" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
            <line x1="150" y1="120" x2="850" y2="480" stroke="#eae7dd" strokeWidth="6" strokeLinecap="round" />

            {/* Metro line dash */}
            <path
              d="M 520 80 Q 560 300 480 540"
              fill="none"
              stroke="#e11d48"
              strokeWidth="3.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
            />
          </svg>

          {/* Reference Landmarks */}
          {landmarks.map(lm => {
            const pos = projectCoords(lm.lat, lm.lng);
            const dist = calculateDistanceMeters(lat, lng, lm.lat, lm.lng);
            const distInfo = formatDistance(dist, currentLang);
            const Icon = lm.icon;

            return (
              <div
                key={lm.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group pointer-events-auto"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-700 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-[10px] font-bold text-slate-800 shadow-2xs whitespace-nowrap border border-slate-200">
                  <span>{getLocalized(lm.name, currentLang)}</span>
                  <span className="text-amber-700 mr-1 ml-1">({distInfo.text})</span>
                </div>
              </div>
            );
          })}

          {/* This Hostel Marker (Centered, Highlighted, Pulsing) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-auto cursor-default"
            style={{ left: `${hostelPos.x}%`, top: `${hostelPos.y}%` }}
          >
            {/* Pulsing halo */}
            <span className="absolute bottom-2 flex h-8 w-8">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-8 w-8 bg-amber-500/30"></span>
            </span>

            {/* Pin Badge */}
            <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-xl ring-4 ring-amber-300/60 scale-110">
              <MapPin className="w-4 h-4 text-slate-950 fill-current" />
              <span className="text-xs font-mono font-bold">
                ֏{hostel.minPricePerNightAMD.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold opacity-80">/ night</span>

              {/* Pin Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 rotate-45" />
            </div>

            {/* Label below pin */}
            <div className="mt-2.5 px-2.5 py-1 rounded-xl bg-slate-950 text-white text-[11px] font-black shadow-lg whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{localizedName}</span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom In, Zoom Out, Reset */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(2.2, prev + 0.3))}
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.85, prev - 0.3))}
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title={labels.resetView}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Coordinates & Address pill */}
        <div className="absolute bottom-3 right-3 left-3 sm:left-auto z-30 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-xs text-slate-700">
          <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold truncate max-w-xs sm:max-w-md">{localizedAddress}</span>
        </div>
      </div>

      {/* Proximity & Walking Distance Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {labels.nearbyHighlights}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {landmarks.map(lm => {
            const dist = calculateDistanceMeters(lat, lng, lm.lat, lm.lng);
            const distInfo = formatDistance(dist, currentLang);
            const Icon = lm.icon;

            return (
              <div
                key={lm.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-amber-300 hover:shadow-xs transition-all flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-amber-800" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {getLocalized(lm.name, currentLang)}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="text-amber-800 font-bold">{distInfo.text}</span>
                    <span>•</span>
                    {dist < 1500 ? (
                      <span>{distInfo.walkMin} {labels.minutes} {labels.walkTime}</span>
                    ) : (
                      <span>{distInfo.taxiMin} {labels.minutes} {labels.taxiTime}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
