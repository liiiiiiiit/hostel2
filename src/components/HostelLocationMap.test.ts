import test from 'node:test';
import assert from 'node:assert/strict';

// Test pure distance calculation logic
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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

test('calculateDistanceMeters accurately measures distance in central Yerevan', () => {
  // Distance from Republic Square (40.1777, 44.5126) to Cascade (40.1911, 44.5156) is roughly ~1.5 km
  const dist = calculateDistanceMeters(40.1777, 44.5126, 40.1911, 44.5156);
  assert.ok(dist > 1400 && dist < 1600, `Expected ~1.5km, got ${dist}m`);
});

test('calculateDistanceMeters calculates short walk to nearest metro (~200-400m)', () => {
  const dist = calculateDistanceMeters(40.1777, 44.5126, 40.1792, 44.5145);
  assert.ok(dist > 100 && dist < 400, `Expected ~200-400m, got ${dist}m`);
});

test('calculateDistanceMeters returns 0 for identical coordinates', () => {
  const dist = calculateDistanceMeters(40.1777, 44.5126, 40.1777, 44.5126);
  assert.equal(dist, 0);
});
