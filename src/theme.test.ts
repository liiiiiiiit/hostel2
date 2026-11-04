import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, THEME_STORAGE_KEY } from './context/ThemeContext';

test('theme defaults to system preference until a user chooses a theme', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('invalid or old preference values fall back to system preference', () => {
  assert.equal(resolveTheme('invalid', true), 'dark');
  assert.equal(resolveTheme('', false), 'light');
  assert.equal(THEME_STORAGE_KEY, 'yerevanhub_theme');
});
