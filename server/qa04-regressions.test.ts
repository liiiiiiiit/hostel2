import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Database } from "./database.js";
import { createApi } from "./api.js";
import { Store } from "./domain.js";
import { operate } from "./operations.js";
import { completeHostel } from "./property-fixtures.js";
import { yerevanToday, addCalendarDays } from "../src/utils/dates.js";
async function fixture(t: TestContext) {
  const root = await mkdtemp("/tmp/yh-qa04-"),
    old = { ...process.env };
  Object.assign(process.env, {
    APP_ENV: "testing",
    NODE_ENV: "test",
    DATABASE_URL: "file:" + root + "/test.db",
    MEDIA_STORAGE: "local",
    MEDIA_DIRECTORY: root + "/uploads",
    NOTIFICATION_DELIVERY: "disabled",
    APP_URL: "http://127.0.0.1",
    DEMO_TOOLS_ENABLED: "false",
    PERSISTENT_STORAGE_MODE: "",
    REQUIRE_MIGRATION_BACKUP: "",
    RESEND_API_KEY: "",
    TELEGRAM_BOT_TOKEN: "",
    GEMINI_API_KEY: "",
    BLOB_READ_WRITE_TOKEN: "",
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
  const base =
    "http://127.0.0.1:" + (server.address() as { port: number }).port;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
    for (const key of Object.keys(process.env))
      if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
    await rm(root, { recursive: true, force: true });
  });
  function client() {
    let cookie = "";
    return {
      get cookie() {
        return cookie;
      },
      async get() {
        return (
          await fetch(base + "/api/app", { headers: { Cookie: cookie } })
        ).json();
      },
      async action(action: string, args: unknown[]) {
        const response = await fetch(base + "/api/app", {
          method: "POST",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-Requested-With": "YerevanHub",
          },
          body: JSON.stringify({ action, args }),
        });
        const next = response.headers.get("set-cookie");
        if (next) cookie = next.split(";")[0];
        return { response, data: await response.json() };
      },
    };
  }
  const admin = client();
  assert(
    (await admin.action("login", ["admin@example.test", password])).data
      .success,
  );
  const hostel = completeHostel();
  hostel.isPublished = true;
  hostel.listingStatus = "published";
  hostel.roomTypes[0].totalBedsOrRooms = 1;
  hostel.roomTypes[0].physicalUnits = hostel.roomTypes[0].physicalUnits!.slice(
    0,
    1,
  );
  assert((await admin.action("saveHostel", [hostel])).data.success);
  return { root, db, server, base, admin, client, hostel };
}
test("QA04: an overdue checked-in guest retains current-day inventory until actual checkout", async (t) => {
  const { db, hostel, admin, client } = await fixture(t),
    today = yerevanToday(),
    room = hostel.roomTypes[0];
  await db.transaction(async (state) => {
    const actor = state.users.find((u) => u.role === "admin")!;
    let clock = new Date(addCalendarDays(today, -3) + "T08:00:00Z");
    const store = new Store(state, true, { now: () => clock });
    store.getState().currentUser = actor;
    const made = store.createBooking({
      acceptedTerms: true,
      hostelId: hostel.id,
      roomTypeId: room.id,
      guestName: "Synthetic overdue guest",
      guestContact: "overdue@example.test",
      contactType: "email",
      checkIn: addCalendarDays(today, -3),
      checkOut: addCalendarDays(today, -2),
      quantity: 1,
      guestsCount: 1,
    });
    assert(made.success);
    const id = made.booking!.id;
    assert(store.updateBookingStatus(id, "confirmed").success);
    await operate(store, "assignUnits", [id, [room.physicalUnits![0].id]]);
    await operate(store, "recordStayEvent", [
      id,
      "check_in",
      "Historical synthetic arrival",
    ]);
    Object.assign(state, store.getState());
  });
  const guest = client(),
    publicState = (await guest.get()).state;
  assert.equal(
    publicState.availability.find(
      (a: { hostelId: string; roomTypeId: string; date: string }) =>
        a.hostelId === hostel.id &&
        a.roomTypeId === room.id &&
        a.date === today,
    ).available,
    0,
  );
  const request = {
    acceptedTerms: true,
    idempotencyKey: randomUUID(),
    expectedHostelUpdatedAt: hostel.updatedAt,
    hostelId: hostel.id,
    roomTypeId: room.id,
    guestName: "New guest",
    guestContact: "new@example.test",
    contactType: "email",
    checkIn: today,
    checkOut: addCalendarDays(today, 1),
    quantity: 1,
    guestsCount: 1,
  };
  request.expectedHostelUpdatedAt = (await admin.get()).state.hostels.find(
    (h: { id: string }) => h.id === hostel.id,
  ).updatedAt;
  assert.equal(
    (await guest.action("createBooking", [request])).data.success,
    false,
  );
  assert.equal(
    (await admin.action("setCapacity", [hostel.id, room.id, today, 0])).data
      .success,
    false,
  );
  const occupied = (await admin.get()).state.bookings.find(
    (b: { hostelId: string }) => b.hostelId === hostel.id,
  );
  assert(
    (
      await admin.action("recordStayEvent", [
        occupied.id,
        "check_out",
        "Actual checkout",
      ])
    ).data.success,
  );
  assert((await guest.action("createBooking", [request])).data.success);
});
test("QA04: disabling a hostel manager revokes outstanding account recovery tokens before reactivation", async (t) => {
  const { db, admin, client, hostel } = await fixture(t),
    email = "manager@example.test";
  assert(
    (
      await admin.action("createHostelManager", [
        {
          name: "Synthetic manager",
          email,
          initialPassword: randomUUID(),
          assignedHostelIds: [hostel.id],
        },
      ])
    ).data.success,
  );
  process.env.APP_URL = "https://isolated.example.test";
  const guest = client();
  assert(
    (await guest.action("requestPasswordRecovery", [email, "en"])).data.success,
  );
  const outbox = (
    await db.client.execute(
      "SELECT text FROM outbox ORDER BY created_at DESC LIMIT 1",
    )
  ).rows[0];
  const raw = String(outbox.text).match(/password\/([a-f0-9]{64})/)![1];
  const user = (
    await db.client.execute({
      sql: "SELECT id FROM users WHERE email=?",
      args: [email],
    })
  ).rows[0];
  assert((await admin.action("toggleManagerActive", [user.id])).data.success);
  assert((await admin.action("toggleManagerActive", [user.id])).data.success);
  assert.equal(
    (await guest.action("resetPassword", [raw, randomUUID()])).data.success,
    false,
  );
});
test("QA04: media deletion must not unlink a live file when its SQL transaction rolls back", async (t) => {
  const { db, admin, root, base } = await fixture(t);
  const png = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#14241a" },
  })
    .png()
    .toBuffer();
  const response = await fetch(base + "/api/app?upload=1", {
    method: "POST",
    headers: {
      Cookie: admin.cookie,
      "X-Requested-With": "YerevanHub",
      "Content-Type": "image/png",
    },
    body: png,
  });
  const image = (await response.json()).image;
  assert(image?.id);
  const file = root + "/uploads/" + image.id + ".webp",
    bytes = await readFile(file);
  const original = db.client.transaction.bind(db.client);
  db.client.transaction = async (mode?) => {
    const tx = await original(mode),
      execute = tx.execute.bind(tx);
    let deleting = false;
    tx.execute = async (q) => {
      if (
        (typeof q === "string" ? q : q.sql).startsWith(
          "DELETE FROM media_assets",
        )
      )
        deleting = true;
      return execute(q);
    };
    const commit = tx.commit.bind(tx);
    tx.commit = async () => {
      if (deleting) throw Error("Injected media commit failure");
      await commit();
    };
    return tx;
  };
  try {
    const deleted = await fetch(base + "/api/app?deleteMedia=" + image.id, {
      method: "POST",
      headers: { Cookie: admin.cookie, "X-Requested-With": "YerevanHub" },
    });
    assert.equal((await deleted.json()).success, false);
  } finally {
    db.client.transaction = original;
  }
  assert.equal(
    (
      await db.client.execute({
        sql: "SELECT id FROM media_assets WHERE id=?",
        args: [image.id],
      })
    ).rows.length,
    1,
  );
  assert.deepEqual(await readFile(file), bytes);
});
test("QA04: malformed JSON and bounded oversized requests return client errors without reflecting private input", async (t) => {
  const { base } = await fixture(t);
  const bad = await fetch(base + "/api/app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "YerevanHub",
    },
    body: '{"secret":"QA04-PRIVATE-CANARY",',
  });
  assert.equal(bad.status, 400);
  assert(!(await bad.text()).includes("QA04-PRIVATE-CANARY"));
  const large = await fetch(base + "/api/app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "YerevanHub",
    },
    body: JSON.stringify({ padding: "x".repeat(1024 * 1024) }),
  });
  assert.equal(large.status, 413);
});

async function uploadFixture(f: Awaited<ReturnType<typeof fixture>>) {
  const png = await sharp({
    create: { width: 12, height: 12, channels: 3, background: "#14241a" },
  })
    .png()
    .toBuffer();
  const response = await fetch(f.base + "/api/app?upload=1", {
    method: "POST",
    headers: {
      Cookie: f.admin.cookie,
      "X-Requested-With": "YerevanHub",
      "Content-Type": "image/png",
    },
    body: png,
  });
  const image = (await response.json()).image;
  assert(image?.id);
  return (
    await f.db.client.execute({
      sql: "SELECT * FROM media_assets WHERE id=?",
      args: [image.id],
    })
  ).rows[0];
}
test("QA04: committed media deletion survives interrupted queue cleanup and safely retries", async (t) => {
  const f = await fixture(t),
    asset = await uploadFixture(f);
  const { queueMediaDeletion, drainMediaDeletions } = await import(
    "./media-cleanup.js"
  );
  await f.db.sqlTransaction((tx) => queueMediaDeletion(tx, asset));
  const original = f.db.client.transaction.bind(f.db.client);
  f.db.client.transaction = async (mode?) => {
    const tx = await original(mode),
      execute = tx.execute.bind(tx);
    let touched = false;
    tx.execute = async (q) => {
      if (
        (typeof q === "string" ? q : q.sql).startsWith(
          "DELETE FROM media_deletions",
        )
      )
        touched = true;
      return execute(q);
    };
    const commit = tx.commit.bind(tx);
    tx.commit = async () => {
      if (touched) throw Error("Injected cleanup commit failure");
      await commit();
    };
    return tx;
  };
  try {
    await assert.rejects(
      drainMediaDeletions(f.db, String(asset.id)),
      /Injected/,
    );
  } finally {
    f.db.client.transaction = original;
  }
  assert.equal(
    (await f.db.client.execute("SELECT COUNT(*) AS n FROM media_assets"))
      .rows[0].n,
    0,
  );
  assert.equal(
    (await f.db.client.execute("SELECT COUNT(*) AS n FROM media_deletions"))
      .rows[0].n,
    1,
  );
  assert.equal((await drainMediaDeletions(f.db, String(asset.id))).pending, 0);
});
test("QA04: reattached images cancel queued deletion instead of losing referenced media", async (t) => {
  const f = await fixture(t),
    asset = await uploadFixture(f),
    { queueMediaDeletion, drainMediaDeletions } = await import(
      "./media-cleanup.js"
    );
  await f.db.sqlTransaction((tx) => queueMediaDeletion(tx, asset));
  await f.db.client.execute({
    sql: "INSERT INTO articles(id,slug,title,summary,content,language,status,created_at,updated_at,featured_image) VALUES(?,?,?,?,?,'en','draft',?,?,?)",
    args: [
      randomUUID(),
      "reattached-test",
      "Synthetic reference",
      "Summary",
      "Content",
      new Date().toISOString(),
      new Date().toISOString(),
      asset.url,
    ],
  });
  assert.equal(
    (await drainMediaDeletions(f.db, String(asset.id))).cancelled,
    1,
  );
  assert.equal(
    (
      await f.db.client.execute({
        sql: "SELECT id FROM media_assets WHERE id=?",
        args: [asset.id],
      })
    ).rows.length,
    1,
  );
  assert((await readFile(f.root + "/uploads/" + asset.storage_key)).length > 0);
});
test("QA04: restoring a pending deletion to another target cannot remove original storage", async (t) => {
  const f = await fixture(t),
    asset = await uploadFixture(f),
    { queueMediaDeletion, drainMediaDeletions } = await import(
      "./media-cleanup.js"
    ),
    { exportSnapshot, restoreSnapshot } = await import("./backups.js"),
    { createClient } = await import("@libsql/client");
  await f.db.sqlTransaction((tx) => queueMediaDeletion(tx, asset));
  const snapshot = await exportSnapshot(f.db.client);
  const target = createClient({ url: "file:" + f.root + "/recovery.db" });
  await restoreSnapshot(target, snapshot, f.root + "/recovery-media");
  target.close();
  process.env.DATABASE_URL = "file:" + f.root + "/recovery.db";
  process.env.MEDIA_DIRECTORY = f.root + "/recovery-media";
  const restored = new Database({ demo: false });
  try {
    await restored.waitUntilReady();
    const result = await drainMediaDeletions(restored);
    assert.equal(result.removed, 0);
    assert.equal(result.pending, 1);
    assert(
      (await readFile(f.root + "/uploads/" + asset.storage_key)).length > 0,
    );
    assert(
      (await readFile(f.root + "/recovery-media/" + asset.storage_key)).length >
        0,
    );
  } finally {
    await restored.close();
  }
});
test("QA04: additive media cleanup migration requires a current recovery point and preserves existing rows", async (t) => {
  const f = await fixture(t),
    { capture } = await import("./demo/provenance.js"),
    { createVerifiedBackup } = await import("./backup-files.js");
  await f.db.client.execute("DROP TABLE media_deletions");
  await f.db.client.execute(
    "DELETE FROM module_migrations WHERE name='media-cleanup-v1'",
  );
  const before = await f.db.sqlTransaction(capture, "read");
  process.env.BACKUP_ENCRYPTION_KEY = Buffer.alloc(32, 19).toString("base64");
  const backup = await createVerifiedBackup(
    f.db.client,
    f.root + "/backups",
    process.env.BACKUP_ENCRYPTION_KEY,
  );
  await f.db.close();
  process.env.REQUIRE_MIGRATION_BACKUP = "true";
  const blocked = new Database({ demo: false });
  await assert.rejects(blocked.waitUntilReady(), /blocked/);
  await blocked.close().catch(() => {});
  const migrated = new Database({ demo: false, migrationBackup: backup.file });
  try {
    await migrated.waitUntilReady();
    const after = await migrated.sqlTransaction(capture, "read");
    for (const [key, row] of before)
      assert.equal(after.get(key)?.hash, row.hash);
    assert.equal(
      (await migrated.client.execute("PRAGMA foreign_key_check")).rows.length,
      0,
    );
    assert.equal(
      (await migrated.client.execute("PRAGMA integrity_check")).rows[0]
        .integrity_check,
      "ok",
    );
  } finally {
    await migrated.close();
  }
});
