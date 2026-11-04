import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const bootstrap = readFileSync(new URL('../../public/theme.js', import.meta.url), 'utf8');
for (const [preference, systemDark, expected] of [
  ['dark', false, true], ['light', true, false], [null, true, true], [null, false, false], ['invalid', true, true],
] as const) {
  test(`appearance before rendering: saved=${preference}, systemDark=${systemDark}`, () => {
    let applied: boolean | undefined;
    const root = { classList: { toggle: (_name: string, value: boolean) => { applied = value; } }, style: { colorScheme: '' } };
    runInNewContext(bootstrap, { localStorage: { getItem: () => preference }, window: { matchMedia: () => ({ matches: systemDark }) }, document: { documentElement: root } });
    assert.equal(applied, expected);
    assert.equal(root.style.colorScheme, expected ? 'dark' : 'light');
  });
}
test('blocked storage still applies system appearance before rendering', () => {
  let applied = false;
  runInNewContext(bootstrap, {
    localStorage: { getItem: () => { throw new Error('Storage unavailable'); } },
    window: { matchMedia: () => ({ matches: true }) },
    document: { documentElement: { classList: { toggle: (_name: string, value: boolean) => { applied = value; } }, style: {} } },
  });
  assert.equal(applied, true);
});
