import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  rm,
  readFile,
  readdir,
  lstat,
  writeFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { Database } from "./database.js";
import { DemoManager } from "./demo/manager.js";
import { demoPaths } from "./demo/safety.js";
import { generatePlan, defaults } from "./demo/fixtures.js";
import { capture } from "./demo/provenance.js";
import { createApi } from "./api.js";
import { verifyPassword } from "./passwords.js";
import type { User } from "../src/types/index.js";
const baseEnv = {
  APP_ENV: "testing",
  NODE_ENV: "test",
  DEMO_MODE: "false",
  DEMO_TOOLS_ENABLED: "true",
  MEDIA_STORAGE: "local",
  NOTIFICATION_DELIVERY: "disabled",
  APP_URL: "http://127.0.0.1",
  DATABASE_AUTH_TOKEN: "",
  RESEND_API_KEY: "",
  NOTIFICATION_FROM: "",
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
  SMS_API_KEY: "",
  TWILIO_AUTH_TOKEN: "",
  STRIPE_SECRET_KEY: "",
  PAYPAL_CLIENT_SECRET: "",
  GEMINI_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
  RESTORE_BLOB_READ_WRITE_TOKEN: "",
  RESTORE_DATABASE_AUTH_TOKEN: "",
  PERSISTENT_STORAGE_MODE: "",
  REQUIRE_MIGRATION_BACKUP: "",
};
async function fixture(t: TestContext) {
  const directory = await mkdtemp(tmpdir() + "/yh-demo-"),
    previous = { ...process.env };
  Object.assign(process.env, baseEnv, {
    DEMO_SANDBOX_ROOT: directory,
    DEMO_DIRECTORY: directory + "/demo",
    DATABASE_URL: "file:" + directory + "/staging.db",
    MEDIA_DIRECTORY: directory + "/uploads",
  });
  let database = new Database({
    demo: false,
    adminEmail: "demo.admin@example.test",
    adminPassword: randomBytes(24).toString("hex"),
  });
  await database.waitUntilReady();
  const admin = await database.transaction(
    async (state) => state.users.find((u) => u.role === "admin")!,
  );
  t.after(async () => {
    await database.close().catch(() => {});
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    await rm(directory, { recursive: true, force: true });
  });
  return {
    directory,
    admin,
    database,
    manager: new DemoManager(database),
    reopen: async () => {
      await database.close();
      database = new Database({ demo: false });
      await database.waitUntilReady();
      return { database, manager: new DemoManager(database) };
    },
  };
}
const small = {
  seed: "small-fixture",
  counts: {
    managers: 1,
    hostels: 2,
    roomTypes: 4,
    travelers: 2,
    rentals: 2,
    rentalInquiries: 3,
    employers: 2,
    applicants: 3,
    jobs: 3,
    jobApplications: 6,
    tourProviders: 2,
    tours: 3,
    tourBookings: 6,
    services: 3,
    serviceRequests: 4,
    reservations: 5,
    articles: 2,
    reviews: 3,
    coupons: 2,
  },
};
test("offline plans are deterministic, valid UUIDs and four-language fixtures; dependencies and unsafe AI content are rejected", () => {
  const a = generatePlan({}),
    b = generatePlan({});
  assert.deepEqual(a, b);
  assert.deepEqual(a.config.counts, defaults);
  assert.notEqual(generatePlan({ seed: "another" }).id, a.id);
  for (const entry of [
    ...a.managers,
    ...a.travelers,
    ...a.hostels,
    ...a.jobs,
    ...a.tours,
    ...a.services,
  ])
    assert.match(entry.id, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  assert.deepEqual(Object.keys(a.hostels[0].name), ["fa", "en", "ru", "hy"]);
  assert.equal(a.hostels.flatMap((h) => h.roomTypes).length, 60);
  assert.throws(() => generatePlan({ counts: { reviews: 61 } }));
  assert.throws(() => generatePlan({ counts: { employers: 0 } }));
  assert.throws(() => generatePlan({ counts: { hostels: -1 } }));
  assert.throws(() => generatePlan({ counts: { hostels: 2.5 } }));
  assert.throws(() =>
    generatePlan({
      content: {
        services: [{ fa: "x", en: "https://real.example", ru: "x", hy: "x" }],
      },
    }),
  );
  const custom = generatePlan({
    modules: ["articles"],
    content: {
      articles: [
        { fa: "متن ساختگی", en: "Fictional guide", ru: "Тест", hy: "Թեստ" },
      ],
    },
  });
  assert.equal(custom.hostels.length, 0);
  assert.equal(custom.articles[0].content, "متن ساختگی");
});
test("all demo operations refuse production, remote databases, symlinks, live credentials and unmarked resources", async (t) => {
  const f = await fixture(t);
  const env = { ...process.env };
  for (const change of [
    { APP_ENV: "production" },
    { APP_ENV: "development" },
    { DEMO_TOOLS_ENABLED: "false" },
    { DATABASE_URL: "libsql://remote.test" },
    { DATABASE_URL: "file:/var/lib/hostel2/hostel.db" },
    { NOTIFICATION_DELIVERY: "live" },
    { RESEND_API_KEY: "real-key" },
    { GEMINI_API_KEY: "key" },
    { APP_URL: "https://yerevanhub.ir" },
  ])
    assert.throws(() => demoPaths({ ...env, ...change }));
  await f.database.client.execute({
    sql: "UPDATE users SET is_active=0 WHERE id=?",
    args: [f.admin.id],
  });
  await assert.rejects(
    f.manager.generate(f.admin, small),
    /Active administrator/,
  );
  await f.database.client.execute({
    sql: "UPDATE users SET is_active=1 WHERE id=?",
    args: [f.admin.id],
  });
  await symlink(f.directory + "/demo", f.directory + "/alias");
  assert.throws(() =>
    demoPaths({ ...env, DEMO_DIRECTORY: f.directory + "/alias" }),
  );
  await f.database.client.execute(
    "UPDATE runtime_environment SET environment='production'",
  );
  await assert.rejects(f.manager.generate(f.admin, small), /marker/);
  assert.equal(
    (
      await f.database.client.execute(
        "SELECT name FROM sqlite_master WHERE name='demo_batches'",
      )
    ).rows.length,
    0,
  );
});
test("full requested ecosystem persists, preserves baseline, validates every relationship and imports idempotently", async (t) => {
  const f = await fixture(t);
  const before = await f.database.sqlTransaction(capture, "read");
  const batch = await f.manager.generate(f.admin, {});
  assert.deepEqual(batch.counts, defaults);
  const concurrent = await Promise.all([
    f.manager.seed(f.admin, batch.id),
    f.manager.seed(f.admin, batch.id),
  ]);
  assert.equal(concurrent.filter((r) => r.imported).length, 1);
  assert((await f.manager.validate(f.admin, batch.id)).valid);
  const after = await f.database.sqlTransaction(capture, "read");
  for (const [key, row] of before)
    assert.equal(after.get(key)?.hash, row.hash, key);
  const counts = Object.fromEntries(
    (
      await f.database.client.execute({
        sql: "SELECT table_name,COUNT(*) AS n FROM demo_records WHERE batch_id=? GROUP BY table_name",
        args: [batch.id],
      })
    ).rows.map((r) => [String(r.table_name), Number(r.n)]),
  );
  for (const [table, count] of Object.entries({
    users: 65,
    user_credentials: 65,
    properties: 35,
    room_types: 60,
    physical_units: 240,
    manager_properties: 15,
    bookings: 60,
    reviews: 40,
    rental_inquiries: 30,
    provider_accounts: 25,
    job_postings: 30,
    job_applications: 80,
    tour_listings: 20,
    tour_bookings: 40,
    service_listings: 40,
    service_requests: 30,
    articles: 20,
    article_translations: 60,
    coupons: 10,
    media_assets: 1,
  }))
    assert.equal(counts[table], count, table);
  assert.equal(
    (
      await f.database.client.execute(
        "SELECT COUNT(DISTINCT contact) AS n FROM job_applications",
      )
    ).rows[0].n,
    40,
  );
  const eligible = await f.database.client.execute({
    sql: "SELECT COUNT(*) AS n FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE b.status='completed' AND b.checked_in_at IS NOT NULL AND b.checked_out_at IS NOT NULL AND b.check_out<=?",
    args: [generatePlan({}).config.baseDate],
  });
  assert.equal(eligible.rows[0].n, 40);
  const manifest = JSON.parse(
    await readFile(f.directory + "/demo/" + batch.manifest, "utf8"),
  );
  assert.equal(manifest.accounts.length, 65);
  assert.equal(
    (await lstat(f.directory + "/demo/" + batch.manifest)).mode & 0o777,
    0o600,
  );
  for (const account of manifest.accounts) {
    const row = (
      await f.database.client.execute({
        sql: "SELECT hash,salt FROM user_credentials WHERE user_id=?",
        args: [account.id],
      })
    ).rows[0];
    assert(
      await verifyPassword(account.password, {
        hash: String(row.hash),
        salt: String(row.salt),
      }),
    );
    assert(account.email.endsWith("@example.test"));
  }
  const snapshot = await f.database.sqlTransaction(capture, "read");
  assert(
    (
      await Promise.all([
        f.manager.seed(f.admin, batch.id),
        f.manager.seed(f.admin, batch.id),
      ])
    ).every((r) => r.imported === false),
  );
  const duplicate = await f.manager.generate(f.admin, {});
  assert.equal(duplicate.id, batch.id);
  assert.deepEqual(await f.database.sqlTransaction(capture, "read"), snapshot);
  const reopened = await f.reopen();
  assert((await reopened.manager.validate(f.admin, batch.id)).valid);
  assert.equal((await reopened.manager.inspect(f.admin, batch.id, 2)).page, 2);
  assert.equal(
    (await reopened.database.client.execute("PRAGMA foreign_key_check")).rows
      .length,
    0,
  );
  assert.equal(
    (await reopened.database.client.execute("SELECT COUNT(*) AS n FROM outbox"))
      .rows[0].n,
    0,
  );
});
test("failed imports roll back SQL and owned image, detect manifest tampering and reject overwriting another image", async (t) => {
  const f = await fixture(t),
    batch = await f.manager.generate(f.admin, small),
    plan = generatePlan(small),
    original = await f.database.sqlTransaction(capture, "read");
  await mkdir(f.directory + "/uploads", { mode: 0o700 });
  await writeFile(
    f.directory + "/uploads/" + plan.imageId + ".webp",
    "unowned-file",
  );
  await assert.rejects(f.manager.seed(f.admin, batch.id), /EEXIST/);
  assert.equal(
    await readFile(f.directory + "/uploads/" + plan.imageId + ".webp", "utf8"),
    "unowned-file",
  );
  await rm(f.directory + "/uploads/" + plan.imageId + ".webp");
  // Fail a real business operation late in the transaction, after account/booking writes.
  await f.database.client.execute("UPDATE service_categories SET is_active=0");
  const raw = f.database.client.transaction.bind(f.database.client);
  f.database.client.transaction = async (mode?) => {
    const tx = await raw(mode),
      execute = tx.execute.bind(tx);
    tx.execute = async (statement) => {
      if (
        typeof statement === "object" &&
        statement.sql.startsWith("INSERT INTO service_listings")
      )
        throw Error("injected service failure");
      return execute(statement);
    };
    return tx;
  };
  await assert.rejects(
    f.manager.seed(f.admin, batch.id),
    /injected service failure/,
  );
  f.database.client.transaction = raw;
  assert.deepEqual(await readdir(f.directory + "/uploads"), []);
  assert.equal(
    (await f.database.client.execute("SELECT COUNT(*) AS n FROM demo_records"))
      .rows[0].n,
    0,
  );
  assert.equal(
    (
      await f.database.client.execute(
        "SELECT status FROM demo_batches WHERE id='" + batch.id + "'",
      )
    ).rows[0].status,
    "generated",
  );
  const file = f.directory + "/demo/" + batch.manifest;
  const m = JSON.parse(await readFile(file, "utf8"));
  m.accounts[0].password = "different-generated-password";
  await writeFile(file, JSON.stringify(m));
  await assert.rejects(f.manager.seed(f.admin, batch.id), /manifest changed/i);
  await writeFile(file, '{"password":"never-leak-this-private-value');
  await assert.rejects(
    f.manager.seed(f.admin, batch.id),
    (error) =>
      error instanceof Error &&
      /manifest is malformed/.test(error.message) &&
      !error.message.includes("never-leak"),
  );
});
test("selected-batch cleanup is atomic, refuses edits/external references, revokes owned sessions and preserves other batches", async (t) => {
  const f = await fixture(t),
    a = await f.manager.generate(f.admin, small),
    b = await f.manager.generate(f.admin, {
      seed: "unrelated-articles",
      modules: ["articles"],
      counts: { articles: 2 },
    });
  await f.manager.seed(f.admin, a.id);
  await f.manager.seed(f.admin, b.id);
  const plan = generatePlan(small),
    title = (
      await f.database.client.execute({
        sql: "SELECT title FROM job_postings WHERE id=?",
        args: [plan.jobs[0].id],
      })
    ).rows[0].title;
  await f.database.client.execute({
    sql: "UPDATE job_postings SET title='manual edit' WHERE id=?",
    args: [plan.jobs[0].id],
  });
  await assert.rejects(f.manager.cleanup(f.admin, [a.id]), /edited/);
  await f.database.client.execute({
    sql: "UPDATE job_postings SET title=? WHERE id=?",
    args: [title, plan.jobs[0].id],
  });
  await f.database.client.execute({
    sql: "INSERT INTO saved_places(user_id,place) VALUES(?,?)",
    args: [f.admin.id, "hostel:" + plan.hostels[0].id],
  });
  await assert.rejects(f.manager.cleanup(f.admin, [a.id]), /saved/);
  await f.database.client.execute("DELETE FROM saved_places");
  const external = crypto.randomUUID();
  await f.database.client.execute({
    sql: "INSERT INTO articles(id,slug,title,summary,content,language,status,created_at,updated_at,featured_image) VALUES(?,?,?,?,?,'en','draft',?,?,?)",
    args: [
      external,
      "external-media-reference",
      "External test row",
      "Summary",
      "Content",
      new Date().toISOString(),
      new Date().toISOString(),
      "/api/app?media=" + plan.imageId,
    ],
  });
  await assert.rejects(
    f.manager.cleanup(f.admin, [a.id]),
    /unowned row references/,
  );
  assert.equal(
    (
      await f.database.client.execute({
        sql: "SELECT id FROM articles WHERE id=?",
        args: [external],
      })
    ).rows.length,
    1,
  );
  await f.database.client.execute({
    sql: "DELETE FROM articles WHERE id=?",
    args: [external],
  });

  const account = plan.travelers[0];
  await f.database.client.execute({
    sql: "INSERT INTO sessions VALUES(?,?,?)",
    args: ["synthetic-session", account.id, Date.now() + 60000],
  });
  const before = await f.database.sqlTransaction(capture, "read");
  const result = await f.manager.cleanup(f.admin, [a.id]);
  assert(result.removedRecords > 0);
  assert.equal(result.revokedSessions, 1);
  assert((await f.manager.validate(f.admin, b.id)).valid);
  assert.equal((await f.manager.cleanup(f.admin, [a.id])).removedRecords, 0);
  assert.equal(
    (
      await f.database.client.execute({
        sql: "SELECT id FROM users WHERE id=?",
        args: [f.admin.id],
      })
    ).rows.length,
    1,
  );
  assert.equal(
    (await f.database.client.execute("PRAGMA foreign_key_check")).rows.length,
    0,
  );
  await assert.rejects(f.manager.seed(f.admin, a.id), /Cleaned/);
  assert.equal(
    await readFile(f.directory + "/uploads/" + plan.imageId + ".webp").then(
      (v) => v.length > 0,
    ),
    true,
  );
});
test("real API authenticates generated roles, isolates dashboards/owners, blocks nonadmins and forged origins", async (t) => {
  const f = await fixture(t),
    batch = await f.manager.generate(f.admin, small);
  await f.manager.seed(f.admin, batch.id);
  const credentials = JSON.parse(
    await readFile(f.directory + "/demo/" + batch.manifest, "utf8"),
  ).accounts;
  const server = createApi(f.database).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((r) => server.close(() => r())));
  const base =
    "http://127.0.0.1:" + (server.address() as { port: number }).port;
  async function login(account: (typeof credentials)[number]) {
    const r = await fetch(base + "/api/app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "YerevanHub",
      },
      body: JSON.stringify({
        action: "login",
        args: [account.email, account.password],
      }),
    });
    const data = await r.json();
    assert(data.success, JSON.stringify(data));
    return {
      cookie: r.headers.get("set-cookie")!.split(";")[0],
      state: data.state,
    };
  }
  assert.equal((await fetch(base + "/api/demo")).status, 401);
  for (const role of [
    "hostel_manager",
    "traveler",
    "job_provider",
    "tour_provider",
  ]) {
    const account = credentials.find((a: { role: string }) => a.role === role),
      user = await login(account);
    assert.equal(user.state.currentUser.role, role);
    assert.equal(
      (await fetch(base + "/api/demo", { headers: { Cookie: user.cookie } }))
        .status,
      403,
    );
    if (role === "hostel_manager")
      assert(user.state.currentUser.assignedHostelIds.length > 0);
    if (role === "job_provider") {
      assert(user.state.jobApplications.length > 0);
      assert.equal(user.state.tourBookings.length, 0);
      const owned = new Set(
        generatePlan(small)
          .jobs.filter((_, i) => i % 2 === 0)
          .map((j) => j.id),
      );
      assert(
        user.state.jobApplications.every((a: { jobId: string }) =>
          owned.has(a.jobId),
        ),
      );
      const other = generatePlan(small).jobs[1];
      const response = await fetch(base + "/api/app", {
        method: "POST",
        headers: {
          Cookie: user.cookie,
          "Content-Type": "application/json",
          "X-Requested-With": "YerevanHub",
        },
        body: JSON.stringify({
          action: "saveJob",
          args: [{ ...other, version: 2 }],
        }),
      });
      assert.equal((await response.json()).success, false);
    }
    if (role === "tour_provider") {
      assert(user.state.tourBookings.length > 0);
      assert.equal(user.state.jobApplications.length, 0);
    }
  }
  const raw = randomBytes(32).toString("hex"),
    { createHash } = await import("node:crypto");
  await f.database.client.execute({
    sql: "INSERT INTO sessions VALUES(?,?,?)",
    args: [
      createHash("sha256").update(raw).digest("hex"),
      f.admin.id,
      Date.now() + 60000,
    ],
  });
  const cookie = "yh_testing_session=" + raw;
  const status = await fetch(base + "/api/demo", {
    headers: { Cookie: cookie },
  });
  assert.equal(status.status, 200);
  assert(!(await status.text()).includes("password"));
  assert.equal(
    (
      await fetch(base + "/api/demo", {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-Requested-With": "YerevanHub",
          Origin: "https://yerevanhub.ir",
        },
        body: JSON.stringify({ operation: "import", batchId: batch.id }),
      })
    ).status,
    403,
  );
  const inspected = await fetch(base + "/api/demo", {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-Requested-With": "YerevanHub",
    },
    body: JSON.stringify({ operation: "inspect", batchId: batch.id, page: 1 }),
  });
  assert.equal(inspected.status, 200);
  const text = await inspected.text();
  assert(!text.includes("privateToken"));
  for (const account of credentials) assert(!text.includes(account.password));
  const old = process.env.APP_ENV;
  process.env.APP_ENV = "production";
  const prod = createApi(f.database).listen(0, "127.0.0.1");
  await once(prod, "listening");
  try {
    assert.equal(
      (
        await fetch(
          "http://127.0.0.1:" +
            (prod.address() as { port: number }).port +
            "/api/demo",
        )
      ).status,
      404,
    );
  } finally {
    await new Promise<void>((r) => prod.close(() => r()));
    process.env.APP_ENV = old;
  }
});
