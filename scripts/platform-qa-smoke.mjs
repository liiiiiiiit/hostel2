// Authorized synthetic staging only. This is not a live-site audit/load tool.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yerevan" });
const day = (n) =>
  new Date(Date.parse(today() + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export async function verifyPlatform({
  request,
  root,
  env,
  adminCookie,
  seedBatchId,
  proxyPassword,
}) {
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.CI !== "true" ||
    root !== "/opt/hostel2-staging" ||
    env.APP_ENV !== "staging"
  )
    throw Error(
      "Disposable marked staging runner required; never target production.",
    );
  const { createClient } = await import("@libsql/client");
  const sql = createClient({ url: env.DATABASE_URL });
  const plan = JSON.parse(
    String(
      (
        await sql.execute({
          sql: "SELECT plan_json FROM demo_batches WHERE id=?",
          args: [seedBatchId],
        })
      ).rows[0].plan_json,
    ),
  );
  const manifest = JSON.parse(
    await readFile(
      root + "/demo/" + seedBatchId + ".demo-manifest.json",
      "utf8",
    ),
  );
  const check = (result) => {
    assert.equal(result.success, true, result.error);
    return result;
  };
  function client(initial = "") {
    let cookie = initial;
    return {
      get cookie() {
        return cookie;
      },
      async get(extraHeaders = {}) {
        const r = await request("/api/app", { cookie, extraHeaders });
        assert.equal(r.status, 200);
        return JSON.parse(r.text).state;
      },
      async action(action, args) {
        const r = await request("/api/app", { cookie, data: { action, args } });
        if (r.headers["set-cookie"])
          cookie = r.headers["set-cookie"][0].split(";")[0];
        return JSON.parse(r.text);
      },
      async login(account) {
        return check(
          await this.action("login", [account.email, account.password]),
        );
      },
    };
  }
  const admin = client(adminCookie),
    guest = client(),
    actors = { admin };
  try {
    for (const role of [
      "hostel_manager",
      "traveler",
      "job_provider",
      "tour_provider",
    ]) {
      const c = client();
      await c.login(manifest.accounts.find((a) => a.role === role));
      assert.equal((await c.get()).currentUser.role, role);
      actors[role] = c;
    }
    const id = randomUUID(),
      hostel = structuredClone(plan.hostels[0]);
    hostel.id = id;
    hostel.slug = "qa04-" + id;
    hostel.name = Object.fromEntries(
      ["fa", "en", "ru", "hy"].map((l) => [l, "QA04 Synthetic Hostel"]),
    );
    hostel.floorAndDoorCode = "QA04-PRIVATE-DOOR";
    hostel.roomTypes = [
      {
        ...hostel.roomTypes.find((r) => r.type === "private"),
        id: randomUUID(),
        totalBedsOrRooms: 1,
        physicalUnits: [{ id: randomUUID(), label: "QA04-PRIVATE-1" }],
      },
    ];
    check(await admin.action("saveHostel", [hostel]));
    const managerAccount = {
      email: "qa04.manager." + id + "@example.test",
      password: randomUUID(),
    };
    check(
      await admin.action("createHostelManager", [
        {
          name: "QA04 Synthetic Manager",
          email: managerAccount.email,
          initialPassword: managerAccount.password,
          assignedHostelIds: [id],
        },
      ]),
    );
    const manager = client();
    await manager.login(managerAccount);
    actors.qa_manager = manager;
    assert.equal(
      (
        await actors.hostel_manager.action("setCapacity", [
          id,
          hostel.roomTypes[0].id,
          day(3),
          0,
        ])
      ).success,
      false,
    );
    const current = (await admin.get()).hostels.find((h) => h.id === id),
      room = current.roomTypes[0];
    const booking = {
      acceptedTerms: true,
      idempotencyKey: randomUUID(),
      expectedHostelUpdatedAt: current.updatedAt,
      hostelId: id,
      roomTypeId: room.id,
      guestName: "QA04 guest",
      guestContact: "qa04.guest@example.test",
      contactType: "email",
      checkIn: day(3),
      checkOut: day(5),
      quantity: 1,
      guestsCount: 2,
    };
    const first = check(await guest.action("createBooking", [booking])).booking;
    assert.equal(
      check(await guest.action("createBooking", [booking])).booking.id,
      first.id,
    );
    const second = check(
      await guest.action("createBooking", [
        { ...booking, idempotencyKey: randomUUID() },
      ]),
    ).booking;
    check(await manager.action("updateBookingStatus", [first.id, "confirmed"]));
    assert.equal(
      (await manager.action("updateBookingStatus", [second.id, "confirmed"]))
        .success,
      false,
    );
    assert.equal(
      (
        await actors.traveler.action("updateBookingStatus", [
          first.id,
          "cancelled",
          "Unauthorized",
        ])
      ).success,
      false,
    );
    assert(!(await client().get()).bookings.some((b) => b.id === first.id));
    assert(
      (
        await guest.get({ "X-Booking-Token": first.privateToken })
      ).bookings.some((b) => b.id === first.id),
    );
    assert(!JSON.stringify(await guest.get()).includes("QA04-PRIVATE-DOOR"));
    assert.equal(
      (
        await guest.action("submitReview", [
          first.privateToken,
          4,
          "Not eligible yet",
        ])
      ).success,
      false,
    );
    // Two bounded writers compete for one coupon; no load/stress traffic.
    const updated = structuredClone(
      (await admin.get()).hostels.find((h) => h.id === id),
    );
    updated.roomTypes[0].totalBedsOrRooms = 2;
    updated.roomTypes[0].physicalUnits.push({
      id: randomUUID(),
      label: "QA04-PRIVATE-2",
    });
    check(await admin.action("saveHostel", [updated, updated.updatedAt]));
    const code = "QA04-" + id.slice(0, 8);
    check(
      await admin.action("addCoupon", [
        {
          code,
          percent: 10,
          minAmountAMD: 0,
          maxUses: 1,
          usedCount: 0,
          active: true,
          startsAt: day(-1),
          expiresAt: day(7),
          description: "Synthetic single-use coupon",
        },
      ]),
    );
    const version = (await admin.get()).hostels.find(
      (h) => h.id === id,
    ).updatedAt;
    const races = await Promise.all(
      [client(), client()].map((c) =>
        c.action("createBooking", [
          {
            ...booking,
            expectedHostelUpdatedAt: version,
            idempotencyKey: randomUUID(),
            couponCode: code,
          },
        ]),
      ),
    );
    assert.equal(races.filter((r) => r.success).length, 1);
    const discounted = races.find((r) => r.success).booking;
    assert.equal(discounted.discountPercent, 10);
    assert.equal(
      (
        await sql.execute({
          sql: "SELECT used_count FROM coupons WHERE code=?",
          args: [code],
        })
      ).rows[0].used_count,
      1,
    );
    check(
      await client().action("cancelBookingByGuest", [
        discounted.privateToken,
        "Synthetic cancellation",
      ]),
    );
    assert.equal(
      (
        await sql.execute({
          sql: "SELECT used_count FROM coupons WHERE code=?",
          args: [code],
        })
      ).rows[0].used_count,
      0,
    );
    const rental = structuredClone(plan.rentals[0]);
    rental.id = randomUUID();
    rental.slug = "qa04-" + rental.id;
    rental.addressExactInternal = "QA04-PRIVATE-ADDRESS";
    rental.landlordInternalNotes = "QA04-PRIVATE-OWNER";
    check(await admin.action("saveRental", [rental]));
    const inquiry = check(
      await guest.action("createRentalInquiry", [
        {
          propertyId: rental.id,
          guestName: "QA04 rental guest",
          contact: "qa04.rental@example.test",
          requestType: "visit",
          proposedVisitDate: day(4) + "T14:00",
          residentsCount: 1,
        },
      ]),
    ).inquiry;
    check(
      await admin.action("updateRentalInquiryStatus", [
        inquiry.id,
        "coordinating",
        "QA04-PRIVATE-INQUIRY",
      ]),
    );
    assert.equal(
      (
        await manager.action("updateRentalInquiryStatus", [
          inquiry.id,
          "agreed",
        ])
      ).success,
      false,
    );
    const publicRental = (await guest.get()).rentals.find(
      (r) => r.id === rental.id,
    );
    assert.equal(publicRental.addressExactInternal, "");
    assert.equal(publicRental.landlordInternalNotes, "");
    assert(
      !(await guest.get()).rentalInquiries.some((r) => r.id === inquiry.id),
    );
    const job = {
      ...plan.jobs[0],
      id: randomUUID(),
      title: "QA04 Synthetic Job",
      version: 0,
      status: "open",
    };
    check(await actors.job_provider.action("saveJob", [job]));
    assert(!(await guest.get()).jobs.some((j) => j.id === job.id));
    check(
      await admin.action("saveJob", [{ ...job, version: 1, approved: true }]),
    );
    const application = {
      requestId: randomUUID(),
      jobId: job.id,
      version: 2,
      name: "QA04-PRIVATE-APPLICANT",
      contact: "qa04.applicant@example.test",
      message: "Synthetic experience",
    };
    const applied = check(await guest.action("applyForJob", [application]));
    assert.equal(
      check(await guest.action("applyForJob", [application]))
        .applicationReference,
      applied.applicationReference,
    );
    check(
      await actors.job_provider.action("reviewApplication", [
        applied.applicationReference,
        "received",
        "reviewing",
      ]),
    );
    assert.equal(
      (
        await actors.tour_provider.action("reviewApplication", [
          applied.applicationReference,
          "reviewing",
          "accepted",
        ])
      ).success,
      false,
    );
    assert(
      !JSON.stringify(await guest.get()).includes("QA04-PRIVATE-APPLICANT"),
    );
    const tour = {
      ...plan.tours[0],
      id: randomUUID(),
      title: "QA04 Synthetic Tour",
      capacity: 1,
      version: 0,
    };
    check(await actors.tour_provider.action("saveTour", [tour]));
    check(
      await admin.action("saveTour", [{ ...tour, version: 1, approved: true }]),
    );
    const tourRequests = [0, 1].map(() => ({
      requestId: randomUUID(),
      tourId: tour.id,
      tourVersion: 2,
      name: "QA04 passenger",
      contact: "qa04.passenger@example.test",
      travelDate: day(6),
      guests: 1,
      notes: "Synthetic",
    }));
    const tourRace = await Promise.all(
      tourRequests.map((r) => client().action("bookTour", [r])),
    );
    assert.equal(tourRace.filter((r) => r.success).length, 1);
    const winner = tourRace.findIndex((r) => r.success),
      reference = tourRace[winner].tourReference;
    assert.equal(
      check(await guest.action("bookTour", [tourRequests[winner]]))
        .tourReference,
      reference,
    );
    check(
      await actors.tour_provider.action("changeTourBooking", [
        reference,
        "pending",
        "confirmed",
      ]),
    );
    assert.equal(
      (
        await actors.job_provider.action("changeTourBooking", [
          reference,
          "confirmed",
          "cancelled",
        ])
      ).success,
      false,
    );
    const service = {
      ...plan.services[0],
      id: randomUUID(),
      slug: "qa04-" + randomUUID(),
      title: Object.fromEntries(
        ["fa", "en", "ru", "hy"].map((l) => [l, "QA04 Synthetic Service"]),
      ),
    };
    check(await admin.action("saveService", [service]));
    const serviceInput = {
      requestId: randomUUID(),
      serviceId: service.id,
      version: 1,
      name: "QA04-PRIVATE-SERVICE",
      contact: "qa04.service@example.test",
      preferredDate: day(4),
      note: "Synthetic appointment",
    };
    const serviceRequest = check(
      await guest.action("requestService", [serviceInput]),
    );
    assert.equal(
      check(await guest.action("requestService", [serviceInput]))
        .serviceReference,
      serviceRequest.serviceReference,
    );
    check(
      await admin.action("updateServiceRequest", [
        serviceRequest.serviceReference,
        "new",
        "contacted",
      ]),
    );
    assert.equal(
      (
        await request("/api/admin/service-requests", {
          cookie: actors.job_provider.cookie,
        })
      ).status,
      403,
    );
    assert.equal(
      JSON.parse(
        (
          await request(
            "/api/services?search=" + encodeURIComponent("' OR 1=1 --"),
          )
        ).text,
      ).total,
      0,
    );
    assert.equal((await request("/api/app?media=..%2F..%2F.env")).status, 404);
    assert.equal(
      (
        await request("/api/app", {
          cookie: admin.cookie,
          data: { action: "toggleManagerActive", args: ["unused"] },
          extraHeaders: { Origin: "https://untrusted.invalid" },
        })
      ).status,
      403,
    );
    const account = client(),
      email = "qa04.account." + id + "@example.test",
      password = randomUUID(),
      newPassword = randomUUID();
    check(
      await account.action("registerTraveler", [
        "QA04 Account",
        email,
        "",
        password,
      ]),
    );
    check(
      await account.action("updateProfile", [
        {
          name: "QA04 Updated",
          phone: "",
          language: "en",
          emailNotifications: false,
          role: "admin",
        },
      ]),
    );
    assert.equal((await account.get()).currentUser.role, "traveler");
    assert.equal(
      (await account.action("changePassword", ["incorrect", newPassword]))
        .success,
      false,
    );
    check(await account.action("changePassword", [password, newPassword]));
    assert.equal((await account.get()).currentUser, null);
    await account.login({ email, password: newPassword });
    const accountState = await account.get();
    const token = account.cookie.slice(account.cookie.indexOf("=") + 1);
    await sql.execute({
      sql: "UPDATE sessions SET expires_at=? WHERE token_hash=?",
      args: [Date.now() - 1, createHash("sha256").update(token).digest("hex")],
    });
    assert.equal((await account.get()).currentUser, null);
    assert.equal(
      (
        await account.action("updateProfile", [
          {
            name: "Forged",
            phone: "",
            language: "en",
            emailNotifications: false,
          },
        ])
      ).success,
      false,
    );
    await account.login({ email, password: newPassword });
    actors.qa_traveler = account;
    const image = await sharp({
      create: { width: 30, height: 20, channels: 3, background: "#14241a" },
    })
      .png()
      .toBuffer();
    assert.equal(
      (
        await request("/api/app?upload=1", {
          cookie: actors.traveler.cookie,
          raw: image,
        })
      ).status,
      403,
    );
    const uploaded = JSON.parse(
      (await request("/api/app?upload=1", { cookie: admin.cookie, raw: image }))
        .text,
    ).image;
    assert(uploaded?.id);
    assert.equal(
      (
        await request("/api/app?deleteMedia=" + plan.imageId, {
          cookie: admin.cookie,
          data: {},
        })
      ).status,
      400,
    );
    check(
      JSON.parse(
        (
          await request("/api/app?deleteMedia=" + uploaded.id, {
            cookie: admin.cookie,
            data: {},
          })
        ).text,
      ),
    );
    assert.equal((await request(uploaded.url)).status, 404);
    const article = {
      ...plan.articles[0],
      id: randomUUID(),
      slug: "qa04-" + randomUUID(),
      title: '<img src=x onerror="window.__qa04Xss=true"> QA04',
      status: "published",
      isSampleDraft: false,
      translations: {
        en: {
          title: '<img src=x onerror="window.__qa04Xss=true"> QA04',
          summary: "Synthetic XSS canary",
          content: "<script>window.__qa04Xss=true</script>",
        },
      },
    };
    check(await admin.action("saveArticle", [article]));
    assert.equal(
      (await sql.execute("PRAGMA integrity_check")).rows[0].integrity_check,
      "ok",
    );
    assert.equal(
      (await sql.execute("PRAGMA foreign_key_check")).rows.length,
      0,
    );
    console.log(
      "PASS full synthetic staging APIs: all roles/ownership, profile/password/session expiration, reservation/coupon races, private tracking, rental inquiries, moderation/applications, tour capacity/duplicates, services, articles, uploads/deletion, injection/CSRF/privilege boundaries and SQL integrity.",
    );
    await browserAudit({
      actors,
      origin: "https://test.yerevanhub.ir:8443",
      proxyPassword,
      article,
      job,
    });
    return async () => {
      assert(
        (await manager.get()).bookings.some(
          (b) => b.id === first.id && b.status === "confirmed",
        ),
      );
      assert(
        (await actors.job_provider.get()).jobApplications.some(
          (a) =>
            a.reference === applied.applicationReference &&
            a.status === "reviewing",
        ),
      );
      assert(
        (await actors.tour_provider.get()).tourBookings.some(
          (b) => b.reference === reference && b.status === "confirmed",
        ),
      );
      assert.equal(
        (await account.get()).currentUser.id,
        accountState.currentUser.id,
      );
      assert.equal(
        (await sql.execute("PRAGMA foreign_key_check")).rows.length,
        0,
      );
      sql.close();
      console.log(
        "PASS restart preserves authenticated role sessions, booking, job application, tour confirmation and updated account.",
      );
    };
  } catch (error) {
    sql.close();
    throw error;
  }
}
async function browserAudit({ actors, origin, proxyPassword, article, job }) {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--host-resolver-rules=MAP test.yerevanhub.ir 127.0.0.1",
    ],
  });
  const errors = [];
  try {
    const views = [
      ["admin", "admin", ".dashboard-shell"],
      ["qa_manager", "manager", ".dashboard-shell"],
      ["qa_traveler", "account", ".dashboard-shell"],
      ["job_provider", "employer", "main h1"],
      ["tour_provider", "tour-organizer", "main h1"],
    ];
    let checked = 0;
    for (const [i, lang] of ["fa", "en", "ru", "hy"].entries())
      for (const [j, theme] of ["light", "dark"].entries())
        for (const [role, route, selector] of views) {
          const width = [360, 820, 1366][(i + j) % 3],
            context = await browser.newContext({
              ignoreHTTPSErrors: true,
              httpCredentials: { username: "staging", password: proxyPassword },
              viewport: { width, height: 1000 },
            }),
            cookie = actors[role].cookie,
            split = cookie.indexOf("=");
          await context.addCookies([
            {
              name: cookie.slice(0, split),
              value: cookie.slice(split + 1),
              domain: "test.yerevanhub.ir",
              path: "/",
              secure: true,
              httpOnly: true,
            },
          ]);
          await context.addInitScript(
            ({ lang, theme }) => {
              localStorage.setItem("yerevanhub_lang", lang);
              localStorage.setItem("yerevanhub_theme", theme);
            },
            { lang, theme },
          );
          await context.route("**/*", (r) =>
            r.request().url().startsWith(origin) ? r.continue() : r.abort(),
          );
          const page = await context.newPage();
          page.setDefaultTimeout(20000);
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(origin + "/" + lang + "/#/" + route);
          await page.locator("#site-preloader").waitFor({ state: "detached" });
          await page.locator(selector).first().waitFor();
          assert.equal(
            await page.getAttribute("html", "dir"),
            lang === "fa" ? "rtl" : "ltr",
          );
          assert.equal(
            await page.evaluate(() =>
              document.documentElement.classList.contains("dark"),
            ),
            theme === "dark",
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 2,
            ),
            role + "/" + lang + "/" + theme + " overflow",
          );
          if (role === "job_provider")
            await page
              .getByRole("heading", { name: job.title, exact: true })
              .waitFor();
          checked++;
          await context.close();
        }
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      httpCredentials: { username: "staging", password: proxyPassword },
      viewport: { width: 390, height: 900 },
    });
    await context.route("**/*", (r) =>
      r.request().url().startsWith(origin) ? r.continue() : r.abort(),
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/en/article/" + article.slug);
    await page.locator("#site-preloader").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.__qa04Xss), undefined);
    assert((await page.locator("body").innerText()).includes("QA04"));
    assert.equal(await page.locator('main img[src="x"]').count(), 0);
    await context.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS synthetic staging browsers: " +
        checked +
        " authenticated dashboard combinations, five roles, fa/en/ru/hy, RTL/LTR, light/dark, mobile/tablet/desktop and inert article XSS canary.",
    );
  } finally {
    await browser.close();
  }
}
