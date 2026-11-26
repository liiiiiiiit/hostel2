// Imported only by the disposable, protected staging runner. Never a live-site tool.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
export async function verifyAuthorizationUI({
  request,
  adminCookie,
  proxyPassword,
}) {
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.CI !== "true")
    throw Error("Disposable CI staging required.");
  const origin = "https://test.yerevanhub.ir:8443",
    email = "qa05." + randomUUID() + "@example.test",
    password = randomUUID();
  const registered = await request("/api/app", {
    data: {
      action: "registerTraveler",
      args: ["QA05 Synthetic Account", email, "", password],
    },
  });
  assert.equal(registered.status, 200);
  const data = JSON.parse(registered.text);
  assert.equal(data.success, true, data.error);
  const userId = data.state.currentUser.id,
    oldCookie = registered.headers["set-cookie"][0].split(";")[0];
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1",
    ],
  });
  const errors = [];
  async function context(cookie, lang = "en", theme = "light", width = 1366) {
    const c = await browser.newContext({
      ignoreHTTPSErrors: true,
      httpCredentials: { username: "staging", password: proxyPassword },
      viewport: { width, height: 1000 },
    });
    if (cookie) {
      const split = cookie.indexOf("=");
      await c.addCookies([
        {
          name: cookie.slice(0, split),
          value: cookie.slice(split + 1),
          domain: "test.yerevanhub.ir",
          path: "/",
          secure: true,
          httpOnly: true,
        },
      ]);
    }
    await c.addInitScript(
      ({ lang, theme }) => {
        localStorage.setItem("yerevanhub_lang", lang);
        localStorage.setItem("yerevanhub_theme", theme);
      },
      { lang, theme },
    );
    await c.route("**/*", (r) =>
      r.request().url().startsWith(origin) ? r.continue() : r.abort(),
    );
    const p = await c.newPage();
    p.setDefaultTimeout(20000);
    p.on("pageerror", (e) => errors.push(e.message));
    return { c, p };
  }
  async function open(p, lang = "en") {
    await p.goto(origin + "/" + lang + "/#/admin");
    await p.locator("#site-preloader").waitFor({ state: "detached" });
    const tab = p.getByTestId("workspace-tab-access");
    await tab.waitFor({ state: "attached" });
    if (!(await tab.isVisible()))
      await p.locator(".dashboard-menu-toggle").click();
    await tab.click();
    await p
      .locator('[data-testid="account-access-manager"] select')
      .first()
      .locator('option[value="' + userId + '"]')
      .waitFor({ state: "attached" });
  }
  try {
    const { c, p } = await context(adminCookie);
    await open(p);
    const panel = p.getByTestId("account-access-manager");
    await panel.getByLabel("Account", { exact: true }).selectOption(userId);
    await panel
      .getByLabel("Role", { exact: true })
      .selectOption("job_provider");
    await panel
      .getByLabel("Reason for change", { exact: true })
      .fill("Synthetic browser role assignment");
    const result = p.waitForResponse(
      (r) =>
        r.url() === origin + "/api/app" &&
        r.request().postDataJSON()?.action === "setAccountAccess",
    );
    await panel
      .getByRole("button", { name: "Save access", exact: true })
      .click();
    assert.equal((await (await result).json()).success, true);
    assert.equal(
      JSON.parse((await request("/api/app", { cookie: oldCookie })).text).state
        .currentUser,
      null,
    );
    await panel
      .getByText("Synthetic browser role assignment", { exact: false })
      .waitFor();
    const account = await context();
    await account.p.goto(origin + "/en/");
    await account.p.locator("#site-preloader").waitFor({ state: "detached" });
    await account.p.locator(".header-sign-in-button").click();
    const dialog = account.p.getByRole("dialog");
    await dialog.getByLabel("Email address", { exact: true }).fill(email);
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    const logged = account.p.waitForResponse(
      (r) =>
        r.url() === origin + "/api/app" &&
        r.request().postDataJSON()?.action === "login",
    );
    await dialog.locator('button[type="submit"]').click();
    assert.equal(
      (await (await logged).json()).state.currentUser.role,
      "job_provider",
    );
    await account.p.waitForURL((u) => u.hash === "#/employer");
    await panel.getByLabel("Account", { exact: true }).selectOption(userId);
    await panel
      .getByLabel("Role", { exact: true })
      .selectOption("tour_provider");
    await panel
      .getByLabel("Reason for change", { exact: true })
      .fill("Synthetic provider role change");
    const changed = p.waitForResponse(
      (r) =>
        r.url() === origin + "/api/app" &&
        r.request().postDataJSON()?.action === "setAccountAccess",
    );
    await panel
      .getByRole("button", { name: "Save access", exact: true })
      .click();
    assert.equal((await (await changed).json()).success, true);
    const revoked = await account.c.request.get(origin + "/api/app");
    assert.equal((await revoked.json()).state.currentUser, null);
    await account.c.close();
    await c.close();
    let layouts = 0;
    for (const lang of ["fa", "en", "ru", "hy"])
      for (const theme of ["light", "dark"])
        for (const width of [360, 820, 1366]) {
          const view = await context(adminCookie, lang, theme, width);
          await open(view.p, lang);
          await view.p
            .getByTestId("account-access-manager")
            .locator("select")
            .first()
            .selectOption(userId);
          assert.equal(
            await view.p.getAttribute("html", "dir"),
            lang === "fa" ? "rtl" : "ltr",
          );
          assert.equal(
            await view.p.evaluate(() =>
              document.documentElement.classList.contains("dark"),
            ),
            theme === "dark",
          );
          assert(
            await view.p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 2,
            ),
            lang + "/" + theme + "/" + width + " overflow",
          );
          await view.c.close();
          layouts++;
        }
    assert.deepEqual(errors, []);
    console.log(
      "PASS RBAC admin browser: role assignment, unified provider login, old-session revocation, provider role change, sensitive events, " +
        layouts +
        " permission-editor layouts (four languages/two themes/three widths).",
    );
  } finally {
    await browser.close();
  }
}
