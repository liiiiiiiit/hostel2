import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapBounds, getMapLinks, isValidCoordinates } from '../utils/maps';

test('map links encode the exact stored coordinate in the embed and navigation destination', () => {
  const point = { lat: 40.1785, lng: 44.5152 };
  const links = getMapLinks(point)!;
  const embed = new URL(links.embed!);
  assert.equal(embed.origin, 'https://www.openstreetmap.org');
  assert.equal(embed.searchParams.get('marker'), '40.1785,44.5152');
  assert.equal(new URL(links.directions).searchParams.get('destination'), '40.1785,44.5152');
  const [west, south, east, north] = getMapBounds(point)!;
  assert.ok(west < point.lng && east > point.lng && south < point.lat && north > point.lat);
});

test('invalid and nonfinite coordinates never create map or navigation URLs', () => {
  for (const point of [undefined, null, {}, {lat:'40.1',lng:44.5}, {lat:NaN,lng:44.5}, {lat:40,lng:Infinity}, {lat:91,lng:44}, {lat:40,lng:-181}]) {
    assert.equal(isValidCoordinates(point), false);
    assert.equal(getMapLinks(point as { lat: number; lng: number }), null);
  }
});

test('valid polar coordinates do not get clamped into a false map position', () => {
  const links = getMapLinks({lat:89,lng:0})!;
  assert.equal(links.embed, null);
  assert.equal(new URL(links.directions).searchParams.get('destination'), '89,0');
});
