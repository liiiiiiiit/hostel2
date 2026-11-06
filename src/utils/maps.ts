export interface Coordinates { lat: number; lng: number }
export const MAX_MERCATOR_LATITUDE = 85.05112878;

/** WGS84 coordinates; invalid inputs must never become an arbitrary map pin. */
export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const { lat, lng } = value as Partial<Coordinates>;
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Bounding box around the supplied point, independent of city or country. */
export function getMapBounds(point: Coordinates): [number, number, number, number] | null {
  if (!isValidCoordinates(point) || Math.abs(point.lat) > MAX_MERCATOR_LATITUDE) return null;
  const latSpan = 0.006;
  const lngSpan = Math.min(0.2, latSpan / Math.max(0.05, Math.cos(point.lat * Math.PI / 180)));
  return [Math.max(-180, point.lng - lngSpan), Math.max(-MAX_MERCATOR_LATITUDE, point.lat - latSpan),
    Math.min(180, point.lng + lngSpan), Math.min(MAX_MERCATOR_LATITUDE, point.lat + latSpan)];
}

/** Yandex widget uses longitude,latitude, unlike Google's latitude,longitude. */
export function getMapLinks(point: Coordinates, language = 'en'): { embed: string | null; directions: string } | null {
  if (!isValidCoordinates(point)) return null;
  const query = new URLSearchParams({
    ll: `${point.lng},${point.lat}`, pt: `${point.lng},${point.lat},pm2rdm`,
    z: '16', lang: language === 'ru' ? 'ru_RU' : 'en_RU',
  });
  return {
    // The projected widget cannot represent polar coordinates without moving the pin.
    embed: Math.abs(point.lat) <= MAX_MERCATOR_LATITUDE ? `https://yandex.com/map-widget/v1/?${query}` : null,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.lat},${point.lng}`)}`,
  };
}

/** Only public addresses may be supplied here. Search is not a confirmed pin. */
export function getProviderLinks(point: unknown, publicAddress: string) {
  const query = isValidCoordinates(point) ? `${point.lat},${point.lng}` : publicAddress.trim();
  if (!query) return null;
  const yandex = new URL('https://yandex.com/maps/');
  if (isValidCoordinates(point)) {
    yandex.searchParams.set('ll', `${point.lng},${point.lat}`);
    yandex.searchParams.set('pt', `${point.lng},${point.lat},pm2rdm`);
    yandex.searchParams.set('z', '16');
  } else yandex.searchParams.set('text', query);
  return {
    yandex: yandex.href,
    google: `https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query})}`,
  };
}
