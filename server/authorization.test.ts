import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import { randomUUID, randomBytes } from "node:crypto";
import { Database } from "./database.js";
import { createApi, schemas } from "./api.js";
import {
  can,
  managesHostel,
  ownsResource,
  permissions,
} from "../src/utils/authorization.js";
import { actionPolicies, authorizeAction } from "./action-authorization.js";
import {
  authorizationAccounts,
  setAccountAccess,
  migrateAuthorization,
  authorizationUser,
} from "./authorization.js";
import { completeHostel } from "./property-fixtures.js";
import { pendingMigrations, guardMigrations } from "./persistence.js";
import { createVerifiedBackup } from "./backup-files.js";
import { saveJob } from "./job-postings.js";
import { yerevanToday, addCalendarDays } from "../src/utils/dates.js";
import type { User } from "../src/types/index.js";
async function fixture(t: TestContext) {
  const root = await mkdtemp("/tmp/yh-rbac-"),
    env = { ...process.env };
  Object.assign(process.env, {
    APP_ENV: "testing",
    NODE_ENV: "test",
    DATABASE_URL: "file:" + root + "/db.sqlite",
    MEDIA_STORAGE: "local",
    MEDIA_DIRECTORY: root + "/uploads",
    BACKUP_DIRECTORY: root + "/backups",
    BACKUP_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    PERSISTENT_STORAGE_MODE: "",
    REQUIRE_MIGRATION_BACKUP: "",
    DEMO_TOOLS_ENABLED: "false",
    NOTIFICATION_DELIVERY: "disabled",
    RESEND_API_KEY: "",
    NOTIFICATION_FROM: "",
    TELEGRAM_BOT_TOKEN: "",
    GEMINI_API_KEY: "",
    BLOB_READ_WRITE_TOKEN: "",
    APP_URL: "http://127.0.0.1",
  });
  const password = randomUUID(),
    db = new Database({
      demo: false,
      adminEmail: "admin@example.test",
      adminPassword: password,
    });
  await db.waitUntilReady();
  const server = createApi(db).listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin =
    "http://127.0.0.1:" + (server.address() as { port: number }).port;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
    await rm(root, { recursive: true, force: true });
  });
  function client() {
    let cookie = "";
    return {
      get cookie() {
        return cookie;
      },
      async get(path = "/api/app") {
        const response = await fetch(origin + path, {
          headers: { Cookie: cookie },
        });
        return { response, data: await response.json() };
      },
      async action(
        action: string,
        args: unknown[],
        extra: Record<string, string> = {},
      ) {
        const response = await fetch(origin + "/api/app", {
          method: "POST",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-Requested-With": "YerevanHub",
            ...extra,
          },
          body: JSON.stringify({ action, args }),
        });
        const next = response.headers.get("set-cookie");
        if (next) cookie = next.split(";")[0];
        return { response, data: await response.json() };
      },
      async login(email: string, p = password) {
        const r = await this.action("login", [email, p]);
        assert.equal(r.data.success, true, r.data.error);
        return r.data;
      },
    };
  }
  const admin = client();
  await admin.login("admin@example.test");
  const adminUser = (await admin.get()).data.state.currentUser as User;
  const hostel = completeHostel();
  assert.equal((await admin.action("saveHostel", [hostel])).data.success, true);
  async function traveler() {
    const c = client(),
      email = randomUUID() + "@example.test";
    const result = await c.action("registerTraveler", [
      "Synthetic account",
      email,
      "",
      password,
    ]);
    assert.equal(result.data.success, true, result.data.error);
    return { c, user: result.data.state.currentUser as User, email };
  }
  async function access(id: string) {
    const list = (await admin.get("/api/admin/account-access")).data.accounts;
    return list.find((u: { id: string }) => u.id === id);
  }
  async function change(id: string, patch: Record<string, unknown> = {}) {
    const before = await access(id);
    return admin.action("setAccountAccess", [
      {
        id,
        version: before.version,
        role: before.role,
        isActive: before.isActive,
        assignedHostelIds: before.assignedHostelIds,
        reason: "Synthetic authorization test",
        ...patch,
      },
    ]);
  }
  return {
    db,
    root,
    admin,
    adminUser,
    hostel,
    password,
    client,
    traveler,
    access,
    change,
  };
}

test("permission matrix is active-only, ownership-scoped and every API action has a fail-closed policy", () => {
  for (const role of [
    "admin",
    "hostel_manager",
    "traveler",
    "job_provider",
    "tour_provider",
  ] as const) {
    const user = {
      id: "one",
      role,
      isActive: true,
      assignedHostelIds: ["assigned"],
    } as User;
    for (const permission of permissions) {
      const expected =
        role === "admin" ||
        permission === "account.self" ||
        (role === "hostel_manager" && permission === "hostels.manage") ||
        (role === "job_provider" && permission === "jobs.manage") ||
        (role === "tour_provider" && permission === "tours.manage");
      assert.equal(can(user, permission), expected, role + "/" + permission);
      assert.equal(can({ ...user, isActive: false }, permission), false);
      assert.equal(can(null, permission), false);
    }
    assert.equal(managesHostel(user, "other"), role === "admin");
    assert.equal(ownsResource(user, "jobs.manage", "other"), role === "admin");
  }
  assert.deepEqual(
    Object.keys(schemas).sort(),
    Object.keys(actionPolicies).sort(),
  );
  assert.throws(() => authorizeAction(null, "futureUnknownAction"));
});

test("admin role assignment preserves identity/hash, revokes sessions/tokens and audits; stale and self-granted changes fail", async (t) => {
  const f = await fixture(t),
    a = await f.traveler(),
    b = await f.traveler();
  const credentials = (
    await f.db.client.execute({
      sql: "SELECT * FROM user_credentials WHERE user_id=?",
      args: [a.user.id],
    })
  ).rows;
  const before = await f.access(a.user.id);
  assert.equal(
    (
      await a.c.action("setAccountAccess", [
        {
          id: a.user.id,
          version: before.version,
          role: "admin",
          isActive: true,
          assignedHostelIds: [],
          reason: "Privilege injection",
        },
      ])
    ).response.status,
    403,
  );
  assert.equal(
    (await a.c.get("/api/admin/account-access")).response.status,
    403,
  );
  assert.equal(
    (
      await a.c.action("updateProfile", [
        {
          name: "Updated",
          phone: "",
          language: "en",
          emailNotifications: false,
          role: "admin",
          legacyProviderRoles: ["job_provider"],
        },
      ])
    ).data.success,
    true,
  );
  await f.db.client.execute({
    sql: "INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,'password',?)",
    args: ["synthetic-token", a.user.id, Date.now() + 60000],
  });
  assert.equal(
    (await f.change(a.user.id, { role: "job_provider" })).data.success,
    true,
  );
  assert.equal((await a.c.get()).data.state.currentUser, null);
  assert(
    (
      await f.db.client.execute(
        "SELECT used_at FROM auth_tokens WHERE token_hash='synthetic-token'",
      )
    ).rows[0].used_at,
  );
  assert.deepEqual(
    (
      await f.db.client.execute({
        sql: "SELECT * FROM user_credentials WHERE user_id=?",
        args: [a.user.id],
      })
    ).rows,
    credentials,
  );
  const login = await a.c.login(a.email);
  assert.equal(login.state.currentUser.role, "job_provider");
  assert.equal(login.state.currentUser.id, a.user.id);
  const stale = await f.admin.action("setAccountAccess", [
    {
      id: a.user.id,
      version: before.version,
      role: "tour_provider",
      isActive: true,
      assignedHostelIds: [],
      reason: "Stale writer",
      revokeLegacyAccess: false,
    },
  ]);
  assert.equal(stale.data.success, false);
  assert.equal(
    (await f.change(a.user.id, { isActive: false })).data.success,
    true,
  );
  assert.equal(
    (await a.c.action("login", [a.email, f.password])).data.success,
    false,
  );
  assert.equal(
    (await f.change(a.user.id, { isActive: true })).data.success,
    true,
  );
  await a.c.login(a.email);
  assert.equal(
    (
      await b.c.action("saveJob", [
        {
          id: randomUUID(),
          version: 0,
          title: "Denied",
          company: "Test",
          location: "Test",
          schedule: "Test",
          description: "Test",
          contact: "test@example.test",
          salary: null,
          period: "month",
          status: "open",
        },
      ])
    ).response.status,
    403,
  );
  const events = (await f.admin.get("/api/admin/account-access")).data.events;
  assert(events.some((e: { target_id: string }) => e.target_id === a.user.id));
  assert(!JSON.stringify(events).includes(f.password));
});

test("last administrator protection, concurrent assignments and self-demotion clear the response principal", async (t) => {
  const f = await fixture(t),
    second = await f.traveler();
  assert.equal(
    (await f.change(f.adminUser.id, { role: "traveler" })).data.success,
    false,
  );
  assert.equal(
    (await f.change(f.adminUser.id, { isActive: false })).data.success,
    false,
  );
  const entry = await f.access(second.user.id),
    payload = {
      id: entry.id,
      version: entry.version,
      role: "admin",
      isActive: true,
      assignedHostelIds: [],
      reason: "Create second administrator",
    };
  const results = await Promise.all([
    f.admin.action("setAccountAccess", [payload]),
    f.admin.action("setAccountAccess", [{ ...payload, role: "job_provider" }]),
  ]);
  assert.equal(results.filter((r) => r.data.success).length, 1);
  await f.change(second.user.id, { role: "admin" });
  const changed = await f.change(f.adminUser.id, { role: "traveler" });
  assert.equal(changed.data.success, true);
  assert.equal(changed.data.state.currentUser, null);
  assert.equal(changed.data.state.users.length, 0);
  assert.equal(
    (await f.admin.get("/api/admin/account-access")).response.status,
    403,
  );
});

test("manager reassignment revokes the old session and dormant assignments do not leak private property data after role removal", async (t) => {
  const f = await fixture(t),
    a = await f.traveler(),
    other = completeHostel();
  await f.admin.action("saveHostel", [other]);
  assert.equal(
    (
      await f.change(a.user.id, {
        role: "hostel_manager",
        assignedHostelIds: [f.hostel.id],
      })
    ).data.success,
    true,
  );
  await a.c.login(a.email);
  assert.equal(
    (
      await a.c.action("setCapacity", [
        other.id,
        other.roomTypes[0].id,
        addCalendarDays(yerevanToday(), 3),
        0,
      ])
    ).data.success,
    false,
  );
  assert.equal(
    (
      await f.change(a.user.id, {
        role: "hostel_manager",
        assignedHostelIds: [other.id],
      })
    ).data.success,
    true,
  );
  assert.equal((await a.c.get()).data.state.currentUser, null);
  await a.c.login(a.email);
  assert.deepEqual((await a.c.get()).data.state.currentUser.assignedHostelIds, [
    other.id,
  ]);
  assert.equal(
    (await f.change(a.user.id, { role: "traveler" })).data.success,
    true,
  );
  await a.c.login(a.email);
  const state = (await a.c.get()).data.state;
  assert.equal(state.hostels.length, 0);
  assert.equal(state.bookings.length, 0);
  assert.equal(state.financeEntries.length, 0);
  assert.equal(state.unitBlocks.length, 0);
  assert.equal(
    (
      await a.c.action("setCapacity", [
        other.id,
        other.roomTypes[0].id,
        addCalendarDays(yerevanToday(), 3),
        0,
      ])
    ).response.status,
    403,
  );
  assert.equal(
    (
      await f.db.client.execute({
        sql: "SELECT COUNT(*) AS n FROM manager_properties WHERE user_id=?",
        args: [a.user.id],
      })
    ).rows[0].n,
    1,
  );
});

test("historical owner privileges are migrated once, preserved across reopen, explicitly revocable and never inferred again", async (t) => {
  const f = await fixture(t),
    a = await f.traveler(),
    job = {
      id: randomUUID(),
      version: 0,
      title: "Historical job",
      company: "Test",
      location: "Test",
      schedule: "Test",
      description: "Test",
      contact: "test@example.test",
      salary: null,
      period: "month" as const,
      status: "open" as const,
    };
  await f.db.sqlTransaction((tx) => saveJob(tx, f.adminUser, job));
  await f.db.client.execute({
    sql: "UPDATE job_postings SET owner_id=? WHERE id=?",
    args: [a.user.id, job.id],
  });
  await f.db.client.execute(
    "DELETE FROM module_migrations WHERE name='authorization-v1'",
  );
  await f.db.client.execute("DROP TABLE legacy_provider_access");
  assert.equal(await pendingMigrations(f.db.client), true);
  await assert.rejects(
    guardMigrations(f.db.client, undefined, {
      ...process.env,
      REQUIRE_MIGRATION_BACKUP: "true",
    }),
    /Pending migration blocked/,
  );
  const old = (
    await f.db.client.execute(
      "SELECT id,hash,salt FROM users JOIN user_credentials ON users.id=user_credentials.user_id ORDER BY id",
    )
  ).rows;
  const archive = await createVerifiedBackup(
    f.db.client,
    f.root + "/backups",
    process.env.BACKUP_ENCRYPTION_KEY!,
  );
  await guardMigrations(f.db.client, archive.file, {
    ...process.env,
    REQUIRE_MIGRATION_BACKUP: "true",
  });
  await migrateAuthorization(f.db.client);
  assert.equal(await pendingMigrations(f.db.client), false);
  assert.deepEqual(
    (
      await f.db.client.execute(
        "SELECT id,hash,salt FROM users JOIN user_credentials ON users.id=user_credentials.user_id ORDER BY id",
      )
    ).rows,
    old,
  );
  assert.equal(
    can((await a.c.get()).data.state.currentUser, "jobs.manage"),
    true,
  );
  const connection = new Database({ demo: false });
  await connection.waitUntilReady();
  await connection.close();
  assert.equal(
    can((await a.c.get()).data.state.currentUser, "jobs.manage"),
    true,
  );
  assert.equal(
    (await f.change(a.user.id, { revokeLegacyAccess: true })).data.success,
    true,
  );
  await a.c.login(a.email);
  await migrateAuthorization(f.db.client);
  const state = (await a.c.get()).data.state;
  assert.equal(can(state.currentUser, "jobs.manage"), false);
  assert.equal(
    state.jobs.find((j: { id: string }) => j.id === job.id)?.manageable,
    false,
  );
  assert.equal(
    (await a.c.action("saveJob", [{ ...job, version: 1 }])).response.status,
    403,
  );
  assert.equal(
    (await f.db.client.execute("PRAGMA foreign_key_check")).rows.length,
    0,
  );
  assert.equal(
    (await f.db.client.execute("PRAGMA integrity_check")).rows[0]
      .integrity_check,
    "ok",
  );
});

test("authorization migration rolls back DDL and grants when interrupted", async (t) => {
  const f = await fixture(t);
  await f.db.client.execute("DROP TABLE legacy_provider_access");
  await f.db.client.execute("DROP TABLE authorization_events");
  await f.db.client.execute(
    "DELETE FROM module_migrations WHERE name='authorization-v1'",
  );
  const wrapper = {
    transaction: async () => {
      const tx = await f.db.client.transaction("write"),
        execute = tx.execute.bind(tx);
      tx.execute = (async (query) => {
        if (
          String(typeof query === "string" ? query : query.sql).includes(
            "INSERT OR IGNORE INTO legacy_provider_access",
          )
        )
          throw Error("Injected migration failure");
        return execute(query);
      }) as typeof tx.execute;
      return tx;
    },
  };
  await assert.rejects(
    migrateAuthorization(wrapper as unknown as Database["client"]),
    /Injected migration failure/,
  );
  assert.equal(
    (
      await f.db.client.execute(
        "SELECT name FROM sqlite_master WHERE name IN ('legacy_provider_access','authorization_events')",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await f.db.client.execute(
        "SELECT name FROM module_migrations WHERE name='authorization-v1'",
      )
    ).rows.length,
    0,
  );
  await migrateAuthorization(f.db.client);
  assert.equal(await pendingMigrations(f.db.client), false);
});

test("supported provider roles remain isolated after explicit changes, including legacy claims and stale native principals", async (t) => {
  const f = await fixture(t),
    a = await f.traveler();
  await f.change(a.user.id, { role: "job_provider" });
  await a.c.login(a.email);
  const old = (await a.c.get()).data.state.currentUser as User;
  await f.change(a.user.id, { role: "tour_provider" });
  await a.c.login(a.email);
  assert.equal((await a.c.get()).data.state.currentUser.role, "tour_provider");
  const job = {
    id: randomUUID(),
    version: 0,
    title: "Denied stale caller",
    company: "Test",
    location: "Test",
    schedule: "Test",
    description: "Test",
    contact: "test@example.test",
    salary: null,
    period: "month" as const,
    status: "open" as const,
  };
  await assert.rejects(
    f.db.sqlTransaction((tx) => saveJob(tx, old, job)),
    /دسترسی/,
  );
  assert.equal((await a.c.action("saveJob", [job])).response.status, 403);
  assert.equal(
    (
      await a.c.action("setAccountAccess", [
        {
          id: a.user.id,
          role: "admin",
          version: (await f.access(a.user.id)).version,
          isActive: true,
          assignedHostelIds: [],
          reason: "Escalation",
        },
      ])
    ).response.status,
    403,
  );
  assert.equal(
    (
      await f.admin.action("setAccountAccess", [
        {
          id: a.user.id,
          role: "moderator",
          version: (await f.access(a.user.id)).version,
          isActive: true,
          assignedHostelIds: [],
          reason: "Unsupported role",
        },
      ])
    ).response.status,
    400,
  );
  assert.equal(
    (
      await f.change(a.user.id, {
        role: "hostel_manager",
        assignedHostelIds: ["unknown"],
      })
    ).data.success,
    false,
  );
  assert.equal(
    (
      await f.admin.action(
        "setAccountAccess",
        [
          {
            id: a.user.id,
            role: "traveler",
            version: (await f.access(a.user.id)).version,
            isActive: true,
            assignedHostelIds: [],
            reason: "Forged origin",
          },
        ],
        { Origin: "https://untrusted.invalid" },
      )
    ).response.status,
    403,
  );
});

test("role change audit failure rolls back permissions, assignments, sessions and tokens atomically", async (t) => {
  const f = await fixture(t),
    a = await f.traveler(),
    before = await f.access(a.user.id);
  await f.db.client.execute({
    sql: "INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,'password',?)",
    args: ["rollback-token", a.user.id, Date.now() + 60000],
  });
  await assert.rejects(
    f.db.sqlTransaction(async (tx) => {
      const execute = tx.execute.bind(tx);
      tx.execute = (async (query) => {
        if (
          String(typeof query === "string" ? query : query.sql).startsWith(
            "INSERT INTO authorization_events",
          )
        )
          throw Error("Injected audit failure");
        return execute(query);
      }) as typeof tx.execute;
      await setAccountAccess(tx, f.adminUser, {
        id: a.user.id,
        version: before.version,
        role: "hostel_manager",
        isActive: true,
        assignedHostelIds: [f.hostel.id],
        revokeLegacyAccess: false,
        reason: "Must roll back",
      });
    }),
    /Injected audit failure/,
  );
  assert.equal((await a.c.get()).data.state.currentUser.role, "traveler");
  assert.deepEqual(await f.access(a.user.id), before);
  assert.equal(
    (
      await f.db.client.execute(
        "SELECT used_at FROM auth_tokens WHERE token_hash='rollback-token'",
      )
    ).rows[0].used_at,
    null,
  );
  assert.equal(
    (
      await f.db.client.execute(
        "SELECT id FROM authorization_events WHERE reason='Must roll back'",
      )
    ).rows.length,
    0,
  );
});

test("legacy grants enforce uniqueness and foreign keys; user-controlled extras cannot create capabilities", async (t) => {
  const f = await fixture(t),
    a = await f.traveler();
  await assert.rejects(
    f.db.sqlTransaction((tx) =>
      tx.execute({
        sql: "INSERT INTO legacy_provider_access VALUES(?,'job_provider')",
        args: ["nonexistent"],
      }),
    ),
  );
  await f.db.sqlTransaction((tx) =>
    tx.execute({
      sql: "INSERT INTO legacy_provider_access VALUES(?,'job_provider')",
      args: [a.user.id],
    }),
  );
  await assert.rejects(
    f.db.sqlTransaction((tx) =>
      tx.execute({
        sql: "INSERT INTO legacy_provider_access VALUES(?,'job_provider')",
        args: [a.user.id],
      }),
    ),
  );
  await f.db.client.execute({
    sql: "DELETE FROM legacy_provider_access WHERE user_id=?",
    args: [a.user.id],
  });
  const hydrated = await f.db.sqlTransaction(
    (tx) =>
      authorizationUser(tx, {
        ...a.user,
        role: "admin",
        legacyProviderRoles: ["job_provider"],
      }),
    "read",
  );
  assert.equal(hydrated!.role, "traveler");
  assert.equal(can(hydrated, "jobs.manage"), false);
  assert.equal(
    (await f.db.client.execute("PRAGMA foreign_key_check")).rows.length,
    0,
  );
});
