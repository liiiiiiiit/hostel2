import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../context/LanguageContext';
import { InteractiveHostelMap } from './InteractiveHostelMap';
import { INITIAL_HOSTELS } from '../../server/seed';
import { getMapBounds, getMapLinks } from '../utils/maps';

test('Gyumri bounds and marker preserve its real saved coordinate rather than clamp to Yerevan', () => {
  const gyumri = { lat: 40.7891, lng: 43.8473 };
  const bounds = getMapBounds(gyumri)!;
  assert.ok(bounds[0] < gyumri.lng && bounds[2] > gyumri.lng);
  assert.ok(bounds[1] < gyumri.lat && bounds[3] > gyumri.lat);
  assert.equal(new URL(getMapLinks(gyumri)!.embed!).searchParams.get('marker'), '40.7891,43.8473');
});

test('selected-hostel map renders the corresponding stored point on an actual basemap', () => {
  const hostels = structuredClone(INITIAL_HOSTELS);
  const selected = hostels[hostels.length - 1];
  const markup = renderToStaticMarkup(createElement(LanguageProvider, { children: createElement(InteractiveHostelMap, { hostels, selectedHostelId: selected.id, onNavigate: () => {} }) }));
  assert.ok(markup.includes('https://www.openstreetmap.org/export/embed.html?'));
  assert.ok(markup.includes(`marker=${selected.coordinates.lat}%2C${selected.coordinates.lng}`));
  assert.ok(!markup.includes('nearest metro') && !markup.includes('walking distances'));
});

test('map bounds remain valid near longitude edges without moving the marker', () => {
  const point = { lat: 40, lng: 179.999 };
  const [west, south, east, north] = getMapBounds(point)!;
  assert.ok(west >= -180 && east <= 180 && east > west && north > south);
  assert.equal(new URL(getMapLinks(point)!.embed!).searchParams.get('marker'), '40,179.999');
});
