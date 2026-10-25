import test from 'node:test';
import assert from 'node:assert/strict';

const YEREVAN_BOUNDS = {
  minLat: 40.1500,
  maxLat: 40.2150,
  minLng: 44.4750,
  maxLng: 44.5450,
};

function projectCoords(lat: number, lng: number) {
  const latSpan = YEREVAN_BOUNDS.maxLat - YEREVAN_BOUNDS.minLat;
  const lngSpan = YEREVAN_BOUNDS.maxLng - YEREVAN_BOUNDS.minLng;

  const xPct = Math.max(2, Math.min(98, ((lng - YEREVAN_BOUNDS.minLng) / lngSpan) * 100));
  const yPct = Math.max(2, Math.min(98, ((YEREVAN_BOUNDS.maxLat - lat) / latSpan) * 100));

  return { x: xPct, y: yPct };
}

test('projectCoords projects Yerevan Republic Square inside center viewport', () => {
  const republicSquare = { lat: 40.1776, lng: 44.5126 };
  const { x, y } = projectCoords(republicSquare.lat, republicSquare.lng);

  assert.ok(x >= 45 && x <= 65, `X coordinate ${x} should be in center of map`);
  assert.ok(y >= 45 && y <= 65, `Y coordinate ${y} should be in center of map`);
});

test('projectCoords projects northern Arabkir hostel above center', () => {
  const arabkirHostel = { lat: 40.2031, lng: 44.4982 };
  const { x, y } = projectCoords(arabkirHostel.lat, arabkirHostel.lng);

  assert.ok(y < 35, `Y coordinate ${y} for northern hostel should be near the top`);
  assert.ok(x > 10 && x < 50, `X coordinate ${x} should be west of Republic Square`);
});

test('projectCoords clamps extreme coordinates safely within 2% to 98%', () => {
  const farSouth = projectCoords(39.0, 44.5);
  assert.equal(farSouth.y, 98);

  const farNorth = projectCoords(41.0, 44.5);
  assert.equal(farNorth.y, 2);

  const farWest = projectCoords(40.18, 43.0);
  assert.equal(farWest.x, 2);

  const farEast = projectCoords(40.18, 46.0);
  assert.equal(farEast.x, 98);
});
