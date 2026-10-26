import assert from 'node:assert/strict';

export async function assertTheme(page, theme, label = '') {
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected && getComputedStyle(document.body).backgroundColor === (expected === 'dark' ? 'rgb(12, 25, 21)' : 'rgb(246, 247, 245)'), theme);
  const actual = await page.evaluate(() => ({ scheme: getComputedStyle(document.documentElement).colorScheme, canvas: getComputedStyle(document.body).backgroundColor }));
  assert.equal(actual.scheme, theme, label);
  assert.equal(actual.canvas, theme === 'dark' ? 'rgb(12, 25, 21)' : 'rgb(246, 247, 245)', label);
}

export async function runThemeChecks(browser, origin) {
  const errors = [];
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { if (window === window.top) localStorage.setItem('yerevanhub_lang', 'en'); });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  // Delay the React entry: the bootstrap must already have selected dark before React runs.
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
  const navigation = page.goto(origin + '/');
  await page.waitForFunction(() => window.YerevanTheme && document.getElementById('root'));
  assert.equal(await page.locator('#root').innerHTML(), '');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  release(); await navigation;
  await page.getByRole('heading', { level: 1 }).waitFor();
  await assertTheme(page, 'dark');
  const select = page.getByRole('combobox', { name: 'Appearance' });
  assert.equal(await select.inputValue(), 'system');
  assert.equal(await page.evaluate(() => localStorage.getItem('yerevanhub_theme')), null);
  await select.focus();
  assert.ok(await select.evaluate(el => el.matches(':focus-visible')));
  await select.selectOption('light'); await assertTheme(page, 'light');
  await page.reload(); await assertTheme(page, 'light');
  await select.selectOption('system'); await assertTheme(page, 'dark');
  await page.emulateMedia({ colorScheme: 'light' }); await assertTheme(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' }); await assertTheme(page, 'dark');
  await select.selectOption('dark'); await page.emulateMedia({ colorScheme: 'light' }); await assertTheme(page, 'dark');
  const second = await context.newPage(); await second.goto(origin + '/');
  await second.getByRole('combobox', { name: 'Appearance' }).selectOption('light'); await assertTheme(page, 'light');
  await second.close();
  for (const theme of ['dark', 'light']) {
    await select.selectOption(theme);
    for (const label of ['Hostels', 'Homes & apartments', 'Travel guide', 'Translator', 'Saved stays & comparison']) {
      await page.locator('header').getByRole('button', { name: label, exact: label !== 'Saved stays & comparison' }).first().click();
      await page.locator('main h1').waitFor(); await assertTheme(page, theme, label);
    }
    for (const label of ['About us', 'Contact', 'Booking policies', 'Privacy']) {
      const button = page.locator('footer').getByRole('button', { name: label, exact: true });
      await button.click(); await page.locator('main h1').waitFor(); await assertTheme(page, theme, label);
    }
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByRole('dialog').waitFor(); await assertTheme(page, theme, 'authentication overlay');
    await page.getByRole('tab', {name:'Create account',exact:true}).click(); await page.locator('#auth-name').waitFor(); await assertTheme(page,theme,'registration');
    await page.getByRole('tab', {name:'Sign In',exact:true}).click();
    await page.locator('#auth-email').fill('theme-recovery@example.test');
    await page.getByRole('button',{name:'Recover password',exact:true}).click();
    await page.getByRole('dialog').getByRole('alert').waitFor(); await assertTheme(page,theme,'password recovery');
    await page.keyboard.press('Escape');
  }
  // A native selector works at mobile sizes in every supported direction/language.
  for (const [lang, label] of [['fa','ظاهر','فهرست'], ['en','Appearance','Menu'], ['ru','Оформление','Меню'], ['hy','Տեսք','Ցանկ']]) {
    // Remove the test's language initializer for these independent contexts.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    await mobile.addInitScript(language => localStorage.setItem('yerevanhub_lang', language), lang);
    await mobile.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    const screen = await mobile.newPage(); screen.on('pageerror', e => errors.push(e.message));
    await screen.goto(origin + '/'); await screen.locator('header').waitFor();
    assert.equal(await screen.locator('html').getAttribute('dir'), lang === 'fa' ? 'rtl' : 'ltr');
    await screen.locator('button[aria-controls="mobile-navigation"]').click();
    const themeSelect = screen.getByRole('combobox', { name: label });
    assert.equal(await themeSelect.inputValue(), 'system');
    await themeSelect.selectOption('light'); await assertTheme(screen, 'light');
    await themeSelect.selectOption('dark'); await assertTheme(screen, 'dark');
    assert.ok(await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang}: theme selector overflow`);
    await screen.keyboard.press('Escape');
    await mobile.close();
  }
  // Print changes the palette without changing or saving the preference.
  await select.selectOption('dark'); await page.emulateMedia({ media: 'print' });
  await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(20, 47, 42)');
  assert.equal(await page.evaluate(() => localStorage.getItem('yerevanhub_theme')), 'dark');
  await page.emulateMedia({ media: 'screen' }); await assertTheme(page, 'dark');
  await context.close();

  const blocked = await browser.newContext({ colorScheme: 'dark' });
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await blocked.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const blockedPage = await blocked.newPage(); blockedPage.on('pageerror', e => errors.push(e.message));
  await blockedPage.goto(origin + '/'); await blockedPage.locator('header').waitFor();
  await assertTheme(blockedPage, 'dark');
  await blockedPage.locator('header select').selectOption('light'); await assertTheme(blockedPage, 'light');
  await blocked.close(); assert.deepEqual(errors, []);
  console.log('PASS pre-render theme, persistence, OS changes, tabs, keyboard, public pages, auth overlays, four mobile languages, print and denied storage');
}
