export interface Route { view: string; params: Record<string, string | number> }
const pages: Record<string, string> = { home: '', hostels: 'hostels', rentals: 'rentals', guide: 'guide', translator: 'translator', admin: 'admin', manager: 'manager', account: 'account', saved: 'saved', about: 'about', contact: 'contact', rules: 'rules', privacy: 'privacy' };
const records: Record<string, { segment: string; parameter: string }> = { 'hostel-detail': { segment: 'hostel', parameter: 'id' }, 'rental-detail': { segment: 'rental', parameter: 'id' }, 'article-detail': { segment: 'article', parameter: 'slug' }, 'booking-track': { segment: 'booking', parameter: 'token' }, 'rental-track': { segment: 'rental-request', parameter: 'token' } };
const searchKeys = ['city','district','type','checkIn','checkOut','guests', 'roomTypeId'];
export function routeHash(view: string, params: Record<string, unknown> = {}): string {
  const record = records[view];
  const path = record ? `${record.segment}/${encodeURIComponent(String(params[record.parameter] ?? ''))}` : pages[view];
  if (path === undefined) return '#/not-found';
  const query = new URLSearchParams();
  for (const key of searchKeys) if (params[key] !== undefined && params[key] !== '') query.set(key, String(params[key]));
  return `#/${path}${query.size ? `?${query}` : ''}`;
}
export function parseRoute(hash: string): Route {
  try {
    const raw = hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const params: Route['params'] = {};
    const search = new URLSearchParams(query);
    for (const key of searchKeys) { const value = search.get(key); if (value) params[key] = value; }
    if (params.guests) { const value = Number(params.guests); params.guests = Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1; }
    for (const key of ['checkIn','checkOut']) if (params[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(String(params[key])) || !Number.isFinite(Date.parse(String(params[key]))) || new Date(String(params[key])).toISOString().slice(0,10) !== params[key])) delete params[key];
    const page = Object.entries(pages).find(([, segment]) => segment === path);
    if (page) return { view: page[0], params };
    const parts = path.split('/');
    const record = Object.entries(records).find(([, config]) => config.segment === parts[0]);
    if (record && parts.length === 2 && parts[1]) return { view: record[0], params: { ...params, [record[1].parameter]: decodeURIComponent(parts[1]) } };
    return { view: 'not-found', params: {} };
  } catch { return { view: 'not-found', params: {} }; }
}
