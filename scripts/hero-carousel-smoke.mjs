import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const temp = await mkdtemp(path.join(tmpdir(), 'yh-hero-'));
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--import', 'tsx', 'server/dev.ts'], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), DATABASE_URL: `file:${temp}/test.db`, DEMO_MODE: 'true',
    SERVE_BUILT_CLIENT: 'true', DISABLE_HMR: 'true', ADMIN_EMAIL: '', ADMIN_PASSWORD: '' },
});
let output = '', browser;
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
const errors = [];
const expected = ['hostels', 'apartments', 'tours', 'jobs', 'guide', 'translator'];
const views = ['hostels', 'rentals', 'tours', 'jobs', 'guides', 'translator'];
const imageRoutes = new Map([
  ['1555854877-bab0e564b8d5', '0'], ['1522708323590-d24dbb6b0267', '1'],
  ['1695571803413-77ad09429eeb', '2'], ['1521737711867-e3b97375f902', '3'],
  ['1747598666832-2a106fce4ce7', '4'], ['1585236616251-9fd0f67b0000', '5'],
]);
async function waitFor(condition, message) {
  for (let count = 0; count < 150; count++) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(message);
}
async function launch() {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/google-chrome', headless: true,
    args: process.env.BROWSER_ARGS ? JSON.parse(process.env.BROWSER_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage'] });
}
try {
  await waitFor(() => output.includes('server ready'), `Server failed to start: ${output}`);
  for (const language of ['en', 'fa', 'ru', 'hy']) {
    await launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await context.addInitScript(lang => { localStorage.setItem('yerevanhub_lang', lang); localStorage.setItem('yerevanhub_theme', 'dark'); }, language);
    // Local fixture support allows reproducible visual tests without third-party requests.
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      const photo = [...imageRoutes].find(([id]) => url.includes(id));
      if (photo && process.env.HERO_IMAGE_FIXTURES) return route.fulfill({ path: path.join(process.env.HERO_IMAGE_FIXTURES, `${photo[1]}.jpg`), contentType: 'image/jpeg' });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/${language}/`);
    await page.locator('#site-preloader').waitFor({ state: 'detached' });
    const hero = page.locator('.hero-carousel');
    await hero.waitFor();
    // Category navigation and real CTA destinations, including enlarged text.
    for (const width of [320, 390, 820, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      for (let index = 0; index < 6; index++) {
        await page.locator('.hero-category').nth(index).click();
        assert.equal(await hero.getAttribute('data-slide'), expected[index]);
        assert.match(await page.locator('.hero-slide-actions a').getAttribute('href'), new RegExp(`/${views[index]}$`));
        await page.locator('.hero-slide-copy h1').waitFor();
        const fits = await hero.evaluate(element => {
          const slide = element.querySelector('.hero-slide').getBoundingClientRect();
          const copy = element.querySelector('.hero-slide-copy').getBoundingClientRect();
          const controls = element.querySelector('.hero-carousel-controls').getBoundingClientRect();
          const toolbar = element.querySelector('.hero-story-toolbar').getBoundingClientRect();
          const tag = element.querySelector('.hero-slide-tag').getBoundingClientRect();
          const card = element.getBoundingClientRect();
          const brand = document.querySelector('.header-brand').getBoundingClientRect();
          const buttons = document.querySelector('.header-controls').getBoundingClientRect();
          const headerFits = brand.right <= buttons.left || buttons.right <= brand.left;
          return headerFits && card.left >= 0 && card.right <= innerWidth && tag.top >= toolbar.bottom && copy.bottom <= controls.top + 1 && copy.right <= slide.right + 1;
        });
        assert(fits, `${language}/${width}/${index}: text or controls clipped`);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      console.log(`PASS ${language} ${width}px: all six slides at 125% text`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.mouse.move(0, 0);
    await page.locator('.hero-category').first().click();
    await page.locator('.hero-category').first().evaluate(e => e.blur());
    // Keyboard navigation and RTL direction.
    await page.locator('.hero-category').first().focus();
    await page.keyboard.press(language === 'fa' ? 'ArrowLeft' : 'ArrowRight');
    assert.equal(await hero.getAttribute('data-slide'), 'apartments');
    assert.equal(await hero.getAttribute('data-paused'), 'true');
    await page.evaluate(() => document.activeElement.blur());
    // A real touch swipe over the image uses browser pointer events.
    const bounds = await hero.boundingBox();
    const session = await context.newCDPSession(page);
    const start = language === 'fa' ? bounds.x + 90 : bounds.x + 240;
    const end = language === 'fa' ? bounds.x + 240 : bounds.x + 90;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y: bounds.y + 120 }] });
    assert.equal(await hero.getAttribute('data-paused'), 'true');
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end, y: bounds.y + 120 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitFor(async () => await hero.getAttribute('data-slide') === 'tours', 'Swipe did not advance');
    // Progress freezes in place and resumes from the same elapsed time.
    await hero.hover();
    const frozen = await page.locator('.hero-story-fill').evaluate(e => e.getAnimations()[0].currentTime);
    await page.waitForTimeout(250);
    assert(Math.abs(await page.locator('.hero-story-fill').evaluate(e => e.getAnimations()[0].currentTime) - frozen) < 35);
    await page.mouse.move(0, 0);
    await waitFor(async () => await hero.getAttribute('data-paused') === 'false', 'Hover did not resume');
    assert.equal(await page.locator('.hero-story-fill').evaluate(e => e.getAnimations()[0].effect.getTiming().duration), 5000);
    await page.locator('.hero-playback').click();
    await page.locator('.hero-playback').evaluate(e => e.blur());
    await page.mouse.move(0, 0);
    assert.equal(await page.locator('.hero-playback').getAttribute('aria-pressed'), 'true');
    assert.equal(await hero.getAttribute('data-paused'), 'true');
    await page.locator('.hero-playback').click();
    await page.locator('.hero-playback').evaluate(e => e.blur());
    await page.mouse.move(0, 0);
    await waitFor(async () => await hero.getAttribute('data-paused') === 'false', 'Playback button did not resume');
    // Finish the actual CSS clock; the next slide must start a new clock.
    await page.locator('.hero-story-fill').evaluate(e => { e.getAnimations()[0].currentTime = 4900; });
    await waitFor(async () => await hero.getAttribute('data-slide') === 'jobs', 'CSS progress did not advance slide');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitFor(async () => await hero.getAttribute('data-paused') === 'true', 'Reduced motion did not pause');
    assert.equal(await page.locator('.hero-story-fill').evaluate(e => e.getAnimations().length), 0);
    assert(await page.locator('.hero-playback').isDisabled());
    await page.locator('.hero-category').nth(4).click();
    assert.equal(await hero.getAttribute('data-slide'), 'guide');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.hero-category').first().click();
    await page.waitForTimeout(600);
    if (process.env.HERO_SCREENSHOTS) {
      await page.screenshot({ path: path.join(process.env.HERO_SCREENSHOTS, `hero-${language}-mobile.png`), fullPage: false });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: path.join(process.env.HERO_SCREENSHOTS, `hero-${language}-desktop.png`), fullPage: false });
    }
    // Follow every CTA through the app router and return to the hero.
    for (let index = 0; index < 6; index++) {
      await page.locator('.hero-category').nth(index).click();
      await page.locator('.hero-slide-actions a').click();
      await waitFor(() => page.url().endsWith(`/${views[index]}`), `CTA ${views[index]} did not navigate`);
      await page.goto(`${origin}/${language}/`);
      await hero.waitFor();
    }
    console.log(`PASS ${language}: keyboard, swipe, hover, progress clock, reduced motion and six CTA routes`);
    await browser.close(); browser = null;
  }
  assert.deepEqual(errors, []);
  console.log('Hero carousel browser audit passed');
} finally {
  if (browser) await browser.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  await rm(temp, { recursive: true, force: true });
}
