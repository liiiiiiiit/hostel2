import { chromium } from 'playwright-core';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const directory = await mkdtemp(path.join(tmpdir(), 'yh-responsive-'));
const artifacts = path.resolve(process.env.BROWSER_ARTIFACTS_DIR || 'test-artifacts/responsive');
await mkdir(artifacts, { recursive: true });
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--import', 'tsx', 'server/dev.ts'], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), DATABASE_URL: `file:${directory}/test.db`, MEDIA_DIRECTORY: path.join(directory, 'uploads'),
    DEMO_MODE: 'true', DISABLE_HMR: 'true', NODE_ENV: 'development', APP_URL: origin,
    ADMIN_EMAIL: '', ADMIN_PASSWORD: '', RESEND_API_KEY: '', NOTIFICATION_FROM: '', TELEGRAM_BOT_TOKEN: '', GEMINI_API_KEY: '' },
});
let output = '', browser;
server.stdout.on('data', chunk => { output += String(chunk); });
server.stderr.on('data', chunk => { output += String(chunk); });
const results = [], pageErrors = [];
const viewports = [
  { width: 320, height: 740 }, { width: 360, height: 800 }, { width: 390, height: 844 },
  { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 },
  { width: 1024, height: 768 }, { width: 1366, height: 900 },
];
const headers = { 'X-Requested-With': 'YerevanHub' };
async function action(context, name, args) {
  const response = await context.request.post(origin + '/api/app', { headers, data: { action: name, args } });
  const data = await response.json();
  assert.equal(data.success, true, `${name}: ${JSON.stringify(data)}`);
  return data;
}
async function navigate(page, url) {
  const loaded = page.waitForResponse(r => r.url() === origin + '/api/app' && r.request().method() === 'GET' && r.ok());
  await page.goto(origin + url, { waitUntil: 'domcontentloaded' });
  await loaded;
  await page.locator('.app-shell > header').waitFor();
  await page.getByTestId('content-loading').first().waitFor({ state: 'hidden' });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); });
}
async function inspect(page, label, screenshot = false) {
  const state = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const hasHorizontalScroller = element => {
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) return true;
      }
      return false;
    };
    const overflow = [...document.querySelectorAll('body *')].flatMap(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden' || element.closest('dialog:not([open])') || hasHorizontalScroller(element)) return [];
      if (rect.left >= -1 && rect.right <= width + 1) return [];
      if (element.classList.contains('skip-link')) return [];
      return [{ tag: element.tagName, class: String(element.className).slice(0, 150), text: element.textContent?.trim().slice(0, 100), left: Math.round(rect.left), right: Math.round(rect.right) }];
    }).slice(0, 12);
    return { width, documentWidth: document.documentElement.scrollWidth, dir: document.documentElement.dir, overflow };
  });
  const passed = state.documentWidth <= state.width + 1 && state.overflow.length === 0;
  const result = { label, passed, ...state };
  results.push(result);
  console.log('RESPONSIVE ' + JSON.stringify(result));
  if (screenshot || !passed) await page.screenshot({ path: path.join(artifacts, label.replace(/[^a-z0-9_-]/gi, '-') + '.png'), fullPage: true, timeout: 15000 });
}
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 30000);
    server.stdout.on('data', chunk => { if (String(chunk).includes('server ready')) { clearTimeout(timer); resolve(); } });
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
  browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  console.log('BROWSER ' + browser.version());
  const setup = await browser.newContext();
  const initial = await (await setup.request.get(origin + '/api/app')).json();
  const hostel = initial.state.hostels.find(h => !h.publicPreview), rental = initial.state.rentals.find(r => !r.publicPreview);
  assert.ok(hostel && rental, 'Bookable demo properties are required');
  const admin = await browser.newContext();
  await action(admin, 'login', ['admin@yerevanhub.com', 'Admin@2026']);
  const manager = await browser.newContext();
  await action(manager, 'login', ['manager.kentron@yerevanhub.com', 'Hostel@2026']);
  const traveler = await browser.newContext();
  await action(traveler, 'login', ['traveler@example.com', 'Traveler@2026']);
  const routes = [['home', ''], ['hostels', 'hostels'], ['hostel', `hostels/${hostel.slug || hostel.id}`],
    ['rentals', 'rentals'], ['rental', `rentals/${rental.slug || rental.id}`], ['guides', 'guides'],
    ['translator', 'translator'], ['recommendations', 'recommendations'], ['contact', 'contact']];
  for (const language of ['fa', 'en', 'ru', 'hy']) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 1024, hasTouch: viewport.width < 1366, deviceScaleFactor: 1 });
      await context.addInitScript(lang => localStorage.setItem('yerevanhub_lang', lang), language);
      await context.route('**/*', route => {
        const request = route.request();
        return request.url().startsWith(origin) || ['image', 'font', 'stylesheet'].includes(request.resourceType()) ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => pageErrors.push({ language, width: viewport.width, error: error.message }));
      const prefix = `${language}-${viewport.width}`;
      for (const [name, segment] of routes) {
        await navigate(page, `/${language}/${segment}`);
        await inspect(page, `${prefix}-${name}`, language === 'fa' && [390, 768, 1024].includes(viewport.width) && ['home', 'hostel', 'translator'].includes(name));
        await page.getByTestId('theme-toggle').click();
        assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true);
        await inspect(page, `${prefix}-${name}-dark`, language === 'fa' && [390, 768].includes(viewport.width) && name === 'home');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('theme-toggle').waitFor();
        assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true, 'Appearance must survive reload');
        await page.getByTestId('theme-toggle').click();
        if (name === 'hostels') {
          await page.locator('[aria-controls="stay-extra-filters"]').click();
          await inspect(page, `${prefix}-hostel-filters`);
        }
      }
      await navigate(page, `/${language}/`);
      if (viewport.width < 1280) {
        const toggle = page.locator('[aria-controls="mobile-navigation"]');
        await toggle.click();
        await inspect(page, `${prefix}-mobile-menu`);
        await page.locator('main h1').click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Outside tap must close the mobile menu');
      }
      await page.getByRole('button', { name: 'Select language', exact: true }).click();
      await inspect(page, `${prefix}-language-menu`);
      await page.keyboard.press('Escape');
      if (viewport.width < 640) {
        await page.locator('[aria-controls="mobile-navigation"]').click();
        await page.locator('#mobile-navigation > div > div button').last().click();
      } else await page.locator('.app-shell > header').getByRole('button').filter({ has: page.locator('svg.lucide-user-round') }).last().click();
      await page.getByRole('dialog').waitFor();
      await inspect(page, `${prefix}-sign-in`);
      await page.keyboard.press('Escape');
      for (const [role, authenticated] of [['admin', admin], ['manager', manager], ['account', traveler]]) {
        await context.addCookies(await authenticated.cookies());
        await navigate(page, `/#/${role}`);
        const dashboard = role === 'account' ? 'traveler' : role;
        await page.getByTestId(`${dashboard}-dashboard`).waitFor();
        await inspect(page, `${prefix}-${role}`);
        for (const tabName of ['profile', 'reception', 'finance', 'operations', 'hostels', 'rentals', 'articles']) {
          const tab = page.getByTestId('workspace-tab-' + tabName);
          if (await tab.count()) {
            await tab.click();
            await inspect(page, `${prefix}-${role}-${tabName}`);
          }
        }
      }
      await context.close();
    }
  }
  assert.deepEqual(pageErrors, [], 'Uncaught browser errors');
  assert.ok(results.every(result => result.passed), `${results.filter(r => !r.passed).length} responsive layouts failed`);
  console.log(`PASS ${results.length} responsive states across 8 widths and 4 languages`);
} finally {
  await writeFile(path.join(artifacts, 'results.json'), JSON.stringify({ results, pageErrors }, null, 2));
  await writeFile(path.join(artifacts, 'server.log'), output);
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await rm(directory, { recursive: true, force: true });
}
