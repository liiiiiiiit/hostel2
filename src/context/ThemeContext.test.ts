import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { THEME_LABELS } from '../i18n/theme';

const source = readFileSync(new URL('../../public/theme.js', import.meta.url), 'utf8');
function setup({ saved = null, dark = false, blocked = false, quota = false, legacy = false, noMedia = false } = {} as { saved?: string | null; dark?: boolean; blocked?: boolean; quota?: boolean; legacy?: boolean; noMedia?: boolean }) {
  const data = new Map<string, string>(); if (saved !== null) data.set('yerevanhub_theme', saved);
  const writes: string[][] = [];
  const events: Record<string, (event?: any) => void> = {};
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  const media = { matches: dark, [legacy ? 'addListener' : 'addEventListener']: (...args: any[]) => { events.media = args.at(-1); } };
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (quota) throw Error('Quota'); writes.push([key, value]); data.set(key, value); } };
  const window = { matchMedia: noMedia ? undefined : () => media, addEventListener: (key: string, fn: () => void) => { events[key] = fn; }, get localStorage() { if (blocked) throw Error('Storage blocked'); return storage; } } as any;
  runInNewContext(source, { window, document: { documentElement: root }, Set });
  return { store: window.YerevanTheme, root, data, writes, events, media, storage };
}
test('bootstrap applies System before React without persisting resolved theme', () => {
  for (const dark of [false, true]) {
    const { store, root, writes } = setup({ dark });
    assert.equal(store.getPreference(), 'system');
    assert.equal(root.dataset.theme, dark ? 'dark' : 'light');
    assert.equal(root.style.colorScheme, root.dataset.theme);
    assert.deepEqual(writes, []);
  }
});
test('explicit preferences survive reload and ignore OS changes until System is selected', () => {
  const app = setup({ dark: true });
  app.store.setPreference('light'); app.events.media();
  assert.equal(app.root.dataset.theme, 'light');
  assert.deepEqual(app.writes, [['yerevanhub_theme', 'light']]);
  assert.equal(setup({ saved: app.data.get('yerevanhub_theme'), dark: true }).root.dataset.theme, 'light');
  app.store.setPreference('system'); assert.equal(app.root.dataset.theme, 'dark');
  app.media.matches = false; app.events.media(); assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.data.get('yerevanhub_theme'), 'system');
});
test('storage denial, quota, invalid preferences and missing/legacy matchMedia are safe', () => {
  for (const options of [{ blocked: true }, { quota: true }, { saved: 'invalid' }, { noMedia: true }, { legacy: true }]) {
    const { store, root } = setup(options);
    assert.equal(store.getPreference(), 'system');
    store.setPreference('dark'); assert.equal(root.dataset.theme, 'dark');
    store.setPreference('invalid'); assert.equal(store.getPreference(), 'dark');
  }
});
test('subscribers are removable and other tabs synchronize changes and clearing', () => {
  const app = setup(); let calls = 0;
  const unsubscribe = app.store.subscribe(() => calls++);
  app.store.setPreference('dark'); assert.equal(calls, 1);
  app.data.set('yerevanhub_theme', 'light'); app.events.storage({ key: 'yerevanhub_theme', storageArea: app.storage });
  assert.equal(app.store.getPreference(), 'light');
  app.data.clear(); app.events.storage({ key: null }); assert.equal(app.store.getPreference(), 'system');
  const count = calls; unsubscribe(); app.store.setPreference('dark'); assert.equal(calls, count);
});
test('all four supported languages have complete distinct theme labels', () => {
  assert.equal(Object.keys(THEME_LABELS).length, 4);
  for (const labels of Object.values(THEME_LABELS)) {
    assert.equal(new Set(Object.values(labels)).size, 4);
    assert.ok(Object.values(labels).every(label => label.length > 0));
  }
});

test('semantic text/status/control colors meet AA in light and dark palettes', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  function palette(selector: string) {
    const block = css.slice(css.indexOf(selector)).split('}')[0];
    return Object.fromEntries([...block.matchAll(/--([\w-]+): (#[\da-f]{6});/g)].map(m => [m[1], m[2]]));
  }
  const light = palette(':root {'), dark = { ...light, ...palette(':root[data-theme="dark"] {') };
  function luminance(hex: string) { const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
  function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  for (const [mode, colors] of Object.entries({ light, dark })) {
    for (const text of ['content', 'secondary', 'muted', 'subtle', 'accent']) for (const surface of ['canvas', 'surface', 'surface-soft', 'surface-inset']) assert.ok(contrast(colors[text], colors[surface]) >= 4.5, `${mode}: ${text}/${surface}`);
    for (const status of ['success', 'danger', 'warning', 'info', 'notice']) assert.ok(contrast(colors[status], colors[status + '-surface']) >= 4.5, `${mode}: ${status}`);
    for (const surface of ['surface', 'canvas', 'surface-inset', 'brand']) assert.ok(contrast(colors.focus, colors[surface]) >= 3, `${mode}: focus/${surface}`);
    for (const surface of ['surface', 'input']) assert.ok(contrast(colors.control, colors[surface]) >= 3, `${mode}: control/${surface}`);
    for (const [a, b] of [['on-gold','gold'], ['on-brand','brand'], ['on-brand-muted','brand-raised'], ['on-brand-gold','brand'], ['action-text','action'], ['action-text','action-hover']]) assert.ok(contrast(colors[a], colors[b]) >= 4.5, `${mode}: ${a}/${b}`);
  }
});
