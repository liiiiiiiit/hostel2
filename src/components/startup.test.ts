import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { LanguageProvider } from '../context/LanguageContext';
import { SavedPlacesProvider } from '../context/SavedPlacesContext';
import { homeExperience } from '../i18n/homeExperience';
import { loadingText, type StartupStatus } from '../i18n/loading';
import { publicSiteText } from '../i18n/publicSite';
import type { AppLanguage } from '../types';

function initialPage(language: AppLanguage, status: StartupStatus, pathname = `/${language}/`) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname, search: '', hash: '', origin: 'https://local.invalid' } } });
  try {
    return renderToStaticMarkup(React.createElement(LanguageProvider, null,
      React.createElement(SavedPlacesProvider, null, React.createElement(App, { startupStatus: status, onStartupRetry: () => {} }))));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

test('all four languages show the header, homepage and search while initial data is still loading', () => {
  for (const language of ['fa', 'en', 'ru', 'hy'] as const) {
    const html = initialPage(language, 'loading');
    assert.match(html, /<header[ >]/);
    assert.ok(html.includes(homeExperience(language).first));
    assert.match(html, /id="home-checkin"/);
    assert.match(html, /id="home-checkout"/);
    assert.match(html, /aria-busy="true"/);
    assert.ok(html.includes(loadingText(language).listings));
    assert.ok(!html.includes(publicSiteText(language).noStays));
    assert.doesNotMatch(html, /YEREVANHUB…/);
  }
});

test('failed initial loading keeps the homepage and retry available with an offline phrasebook', () => {
  const html = initialPage('en', 'error');
  assert.match(html, /<header[ >]/);
  assert.ok(html.includes(homeExperience('en').first));
  assert.match(html, /id="home-checkin"/);
  assert.match(html, /role="alert"/);
  assert.match(html, />Retry<\/button>/);
  assert.ok(html.includes('Please take me to Republic Square.'));
  assert.ok(!html.includes(publicSiteText('en').noStays));
});

test('direct detail URLs show a loading placeholder instead of a premature missing-property error', () => {
  const html = initialPage('en', 'loading', '/en/hostels/example-hostel');
  assert.match(html, /<header[ >]/);
  assert.match(html, /data-testid="content-loading"/);
  assert.doesNotMatch(html, /Page not found|access unavailable/);
});
