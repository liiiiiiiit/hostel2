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

export function getMapLinks(point: Coordinates): { embed: string | null; openStreetMap: string; directions: string } | null {
  if (!isValidCoordinates(point)) return null;
  const bounds = getMapBounds(point);
  const query = new URLSearchParams({ layer: 'mapnik', marker: `${point.lat},${point.lng}` });
  if (bounds) query.set('bbox', bounds.join(','));
  return {
    embed: bounds ? `https://www.openstreetmap.org/export/embed.html?${query}` : null,
    openStreetMap: `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.lat},${point.lng}`)}`,
  };
}
