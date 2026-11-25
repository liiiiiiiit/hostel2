// Invoked only by the disposable staging HTTPS smoke, never against a public site.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
export async function verifyDemoUI({
  origin,
  proxyPassword,
  cookie,
  seedBatchId,
}) {
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.CI !== "true" ||
    origin !== "https://test.yerevanhub.ir:8443"
  )
    throw Error("Disposable staging UI fixture required.");
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1",
    ],
  });
  const words = {
    fa: { preview: "پیش‌نمایش رکوردها", validate: "اعتبارسنجی" },
    en: { preview: "Preview records", validate: "Validate" },
    ru: { preview: "Предпросмотр записей", validate: "Проверить" },
    hy: { preview: "Գրառումների նախադիտում", validate: "Ստուգել" },
  };
  const errors = [];
  try {
    for (const lang of ["fa", "en", "ru", "hy"])
      for (const width of [390, 1366]) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          httpCredentials: { username: "staging", password: proxyPassword },
          viewport: { width, height: 900 },
        });
        const split = cookie.indexOf("=");
        await context.addCookies([
          {
            name: cookie.slice(0, split),
            value: cookie.slice(split + 1),
            domain: "test.yerevanhub.ir",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        await context.addInitScript((language) => {
          localStorage.setItem("yerevanhub_lang", language);
          localStorage.setItem("yerevanhub_theme", "light");
        }, lang);
        await context.route("**/*", (route) =>
          route.request().url().startsWith(origin)
            ? route.continue()
            : route.abort(),
        );
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(origin + "/" + lang + "/#/admin");
        await page.locator("#site-preloader").waitFor({ state: "detached" });
        const tab = page.getByTestId("workspace-tab-demo");
        await tab.waitFor({ state: "attached" });
        if (!(await tab.isVisible()))
          await page.locator(".dashboard-menu-toggle").click();
        await tab.click();
        const manager = page.getByTestId("demo-manager");
        await manager.waitFor();
        await manager
          .getByTestId("demo-batch")
          .filter({ hasText: seedBatchId })
          .waitFor();
        await manager
          .getByTestId("demo-batch")
          .filter({ hasText: seedBatchId })
          .getByRole("button", { name: words[lang].preview, exact: true })
          .click();
        await manager.getByTestId("demo-preview").waitFor();
        const validation = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/demo") &&
            r.request().method() === "POST" &&
            r.request().postDataJSON()?.operation === "validate",
        );
        await manager
          .getByTestId("demo-batch")
          .filter({ hasText: seedBatchId })
          .getByRole("button", { name: words[lang].validate, exact: true })
          .click();
        assert((await (await validation).json()).result.valid);
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="demo-manager"]')
              ?.getAttribute("aria-busy") === "false",
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 2,
          ),
          lang + ":" + width + " overflow",
        );
        if (lang === "en" && width === 1366) {
          await manager
            .getByLabel("Reproducible seed", { exact: true })
            .fill("browser-articles-only");
          for (const label of [
            "Hostels & travelers",
            "Rentals",
            "Jobs",
            "Tours",
            "Services",
            "Coupons",
          ])
            await manager
              .getByRole("checkbox", { name: label, exact: true })
              .uncheck();
          await manager
            .getByRole("spinbutton", { name: "Articles", exact: true })
            .fill("2");
          const generated = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/demo") &&
              r.request().method() === "POST" &&
              r.request().postDataJSON()?.operation === "generate",
          );
          await manager
            .getByRole("button", { name: "Generate preview", exact: true })
            .click();
          const data = await (await generated).json();
          assert(data.success);
          const id = data.result.id;
          await page.waitForFunction(
            () =>
              document
                .querySelector('[data-testid="demo-manager"]')
                ?.getAttribute("aria-busy") === "false",
          );
          const batch = manager
            .getByTestId("demo-batch")
            .filter({ hasText: id });
          const imported = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/demo") &&
              r.request().method() === "POST" &&
              r.request().postDataJSON()?.operation === "import",
          );
          await batch
            .getByRole("button", { name: "Import into staging", exact: true })
            .click();
          assert((await (await imported).json()).result.imported);
          await page.waitForFunction(
            () =>
              document
                .querySelector('[data-testid="demo-manager"]')
                ?.getAttribute("aria-busy") === "false",
          );
          await batch.getByRole("checkbox").check();
          page.once("dialog", (dialog) => dialog.accept());
          const removed = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/demo") &&
              r.request().method() === "POST" &&
              r.request().postDataJSON()?.operation === "cleanup",
          );
          await manager
            .getByRole("button", { name: /Remove selected batches/ })
            .click();
          assert((await (await removed).json()).result.removedRecords > 0);
        }
        await context.close();
      }
    assert.deepEqual(errors, []);
    console.log(
      "PASS staging-only demo UI: fa/en/ru/hy, RTL/LTR, 390/1366 px, preview/validate, real generation/import/selected cleanup; no page errors or overflow.",
    );
  } finally {
    await browser.close();
  }
}
