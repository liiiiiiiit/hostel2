import { actualCounts, assertCounts } from "./counts.js";
import type { Transaction } from "@libsql/client";
import type { Database } from "../database.js";
import type { User } from "../../src/types/index.js";
import { randomBytes } from "node:crypto";
import { mkdir, lstat, readFile, open } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { demoPaths, assertDemoDatabase } from "./safety.js";
import { generatePlan, planHash, type DemoPlan } from "./fixtures.js";
import { materialize, type DemoAccount } from "./materialize.js";
import {
  capture,
  digest,
  assertUnchanged,
  deletionOrder,
  type CapturedRow,
} from "./provenance.js";
import { quote } from "../relational-schema.js";
import { providerIntegrity } from "../provider-integrity.js";
import { serviceIntegrity } from "../services.js";
import { storeImage } from "../media.js";

async function initialize(tx: Transaction, actor: User | null) {
  await assertDemoDatabase(tx);
  requireAdmin(actor);
  if (
    !(
      await tx.execute({
        sql: "SELECT id FROM users WHERE id=? AND role='admin' AND is_active=1",
        args: [actor!.id],
      })
    ).rows.length
  )
    throw Error("Active administrator required.");
  await tx.execute(
    `CREATE TABLE IF NOT EXISTS demo_batches(id TEXT PRIMARY KEY,recipe_hash TEXT NOT NULL UNIQUE,created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,status TEXT NOT NULL CHECK(status IN ('generated','imported','cleaned')),plan_json TEXT NOT NULL CHECK(json_valid(plan_json)),manifest_hash TEXT NOT NULL,created_at TEXT NOT NULL,imported_at TEXT,cleaned_at TEXT)`,
  );
  await tx.execute(
    `CREATE TABLE IF NOT EXISTS demo_records(batch_id TEXT NOT NULL REFERENCES demo_batches(id) ON DELETE RESTRICT,table_name TEXT NOT NULL,pk_json TEXT NOT NULL,row_hash TEXT NOT NULL,PRIMARY KEY(batch_id,table_name,pk_json),UNIQUE(table_name,pk_json))`,
  );
  await tx.execute(
    "INSERT OR IGNORE INTO module_migrations(name,applied_at) VALUES('demo-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
  );
}
function requireAdmin(actor: User | null) {
  if (actor?.role !== "admin" || !actor.isActive)
    throw Error("Active administrator required.");
}
async function protectedDirectory() {
  const { directory } = demoPaths();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw Error("Demo directory must be private (0700).");
  return directory;
}
async function writePrivate(file: string, value: unknown) {
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directory = await open(path.dirname(file), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
function decodeManifest(bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString());
  } catch {
    throw Error(
      "Protected account manifest is malformed; inspect it privately on the server.",
    );
  }
}
async function manifest(plan: DemoPlan, create = false) {
  const directory = await protectedDirectory(),
    file = path.join(directory, plan.id + ".demo-manifest.json");
  if (create) {
    const accounts: DemoAccount[] = [
      ...plan.managers.map((p) => ({ ...p, role: "hostel_manager" as const })),
      ...plan.travelers.map((p) => ({ ...p, role: "traveler" as const })),
      ...plan.employers.map((p) => ({ ...p, role: "job_provider" as const })),
      ...plan.tourProviders.map((p) => ({
        ...p,
        role: "tour_provider" as const,
      })),
    ].map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      ...((plan.rentalOwners?.some(o=>o.userId===p.id)||plan.serviceProviders?.some(o=>o.userId===p.id))?{capabilities:[...(plan.rentalOwners?.some(o=>o.userId===p.id)?['rental_owner' as const]:[]),...(plan.serviceProviders?.some(o=>o.userId===p.id)?['service_provider' as const]:[])]}:{}),
      password: randomBytes(24).toString("base64url"),
    }));
    try {
      await writePrivate(file, {
        version: 1,
        batchId: plan.id,
        recipeHash: planHash(plan),
        accounts,
      });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  const info = await lstat(file);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    (info.mode & 0o077) !== 0 ||
    info.nlink !== 1
  )
    throw Error("Account manifest must be a private regular file (0600).");
  const bytes = await readFile(file),
    data = decodeManifest(bytes) as {
      version: number;
      batchId: string;
      recipeHash: string;
      accounts: DemoAccount[];
    };
  if (
    data.version !== 1 ||
    data.batchId !== plan.id ||
    data.recipeHash !== planHash(plan) ||
    !Array.isArray(data.accounts)
  )
    throw Error("Account manifest does not match the batch.");
  const people = [
    ...plan.managers,
    ...plan.travelers,
    ...plan.employers,
    ...plan.tourProviders,
  ];
  if (
    data.accounts.length !== people.length ||
    data.accounts.some(
      (a) =>
        !people.some((p) => p.id === a.id && p.email === a.email) ||
        typeof a.password !== "string" ||
        a.password.length < 24,
    ) ||
    new Set(data.accounts.map((a) => a.id)).size !== people.length
  )
    throw Error("Account manifest is incomplete or malformed.");
  return { file, hash: digest(bytes.toString()), accounts: data.accounts };
}
async function getBatch(tx: Transaction, id: string) {
  const row = (
    await tx.execute({
      sql: "SELECT * FROM demo_batches WHERE id=?",
      args: [id],
    })
  ).rows[0];
  if (!row) throw Error("Unknown synthetic batch.");
  const plan = JSON.parse(String(row.plan_json)) as DemoPlan;
  if (
    ![1,2,3,4,5,6].includes(plan.version)||planHash(plan) !== row.recipe_hash ||
    planHash(generatePlan(plan.config,plan.version)) !== row.recipe_hash
  )
    throw Error("Stored batch recipe is invalid.");
  return { row, plan };
}
function preview(plan: DemoPlan) {
  return [
    ...plan.hostels.map((v) => ({ kind: "hostel", id: v.id, title: v.name })),
    ...plan.rentals.map((v) => ({ kind: "rental", id: v.id, title: v.title })),
    ...plan.jobs.map((v) => ({
      kind: "job",
      id: v.id,
      title: { en: v.title },
    })),
    ...plan.tours.map((v) => ({
      kind: "tour",
      id: v.id,
      title: { en: v.title },
    })),
    ...plan.services.map((v) => ({
      kind: "service",
      id: v.id,
      title: v.title,
    })),
    ...plan.articles.map((v) => ({
      kind: "article",
      id: v.id,
      title: {
        fa: v.title,
        ...Object.fromEntries(
          Object.entries(v.translations ?? {}).map(([l, t]) => [l, t?.title]),
        ),
      },
    })),
  ];
}
export class DemoManager {
  constructor(private readonly database: Database) {}
  async status(actor: User | null) {
    demoPaths();
    requireAdmin(actor);
    return this.database.sqlTransaction(async (tx) => {
      await initialize(tx, actor);
      const batches = (
        await tx.execute(
          "SELECT id,status,created_at,imported_at,cleaned_at,plan_json FROM demo_batches ORDER BY created_at DESC,id",
        )
      ).rows;
      return batches.map((b) => {
        const p = JSON.parse(String(b.plan_json)) as DemoPlan;
        return {
          id: String(b.id),
          status: String(b.status),
          createdAt: String(b.created_at),
          importedAt: b.imported_at,
          cleanedAt: b.cleaned_at,
          config: p.config,
          counts: p.config.counts,
          manifest: p.id + ".demo-manifest.json",
        };
      });
    });
  }
  async generate(actor: User | null, input: unknown) {
    demoPaths();
    requireAdmin(actor);
    const plan = generatePlan(input);
    return this.database.sqlTransaction(async (tx) => {
      await initialize(tx, actor);
      const secret = await manifest(plan, true);
      await tx.execute({
        sql: "INSERT INTO demo_batches(id,recipe_hash,created_by,status,plan_json,manifest_hash,created_at) VALUES(?,?,?,'generated',?,?,?) ON CONFLICT(id) DO NOTHING",
        args: [
          plan.id,
          planHash(plan),
          actor!.id,
          JSON.stringify(plan),
          secret.hash,
          new Date().toISOString(),
        ],
      });
      const stored = await getBatch(tx, plan.id);
      if (stored.row.manifest_hash !== secret.hash)
        throw Error("Account manifest changed.");
      return {
        id: plan.id,
        status: String(stored.row.status),
        counts: plan.config.counts,
        preview: preview(plan).slice(0, 30),
        manifest: path.basename(secret.file),
      };
    });
  }
  async inspect(actor: User | null, id: string, page = 1) {
    demoPaths();
    requireAdmin(actor);
    return this.database.sqlTransaction(async (tx) => {
      await initialize(tx, actor);
      const { row, plan } = await getBatch(tx, id);
      const records = (
        await tx.execute({
          sql: "SELECT table_name,COUNT(*) AS count FROM demo_records WHERE batch_id=? GROUP BY table_name ORDER BY table_name",
          args: [id],
        })
      ).rows;
      return {
        id,
        status: row.status,
        counts: plan.config.counts,
        records: records.map((r) => ({
          table: String(r.table_name),
          count: Number(r.count),
        })),
        preview: preview(plan).slice((page - 1) * 20, page * 20),
        page,
        total: preview(plan).length,
      };
    });
  }
  async validate(actor: User | null, id: string) {
    demoPaths();
    requireAdmin(actor);
    return this.database.sqlTransaction(async (tx) => {
      await initialize(tx, actor);
      const { row, plan } = await getBatch(tx, id),
        secret = await manifest(plan);
      if (secret.hash !== row.manifest_hash)
        throw Error("Account manifest changed.");
      const current = await capture(tx),
        records = (
          await tx.execute({
            sql: "SELECT * FROM demo_records WHERE batch_id=?",
            args: [id],
          })
        ).rows;
      const changed = records.filter((r) => {
        const value = current.get(
          String(r.table_name) + "\0" + String(r.pk_json),
        );
        return (
          !(r.table_name === "audit_logs" && !value) &&
          value?.hash !== r.row_hash
        );
      }).length;
      if (row.status === "imported" && changed)
        throw Error(
          "Synthetic records were edited/missing. Cleanup is blocked: " +
            changed,
        );
      if (
        (await tx.execute("PRAGMA foreign_key_check")).rows.length ||
        (await tx.execute("PRAGMA integrity_check")).rows.some(
          (r) => r.integrity_check !== "ok",
        )
      )
        throw Error("Database integrity failed.");
      const actual = await actualCounts(tx, id, current);
      if (row.status === "imported")
        assertCounts(plan.config.counts, actual.counts);
      return {
        valid: true,
        id,
        status: String(row.status),
        counts: plan.config.counts,
        actualCounts: actual.counts,
        physicalInventory: actual.physicalInventory,
        trackedRecords: records.length,
        changed: row.status === "cleaned" ? 0 : changed,
      };
    });
  }
  async seed(actor: User | null, id: string) {
    demoPaths();
    requireAdmin(actor);
    let writtenFile: string | undefined,
      committed = false;
    try {
      const result = await this.database.transaction(
        async (state, tx) => {
          await initialize(tx, actor);
          const { row, plan } = await getBatch(tx, id);
          if (row.status === "imported")
            return { id, imported: false, counts: plan.config.counts };
          if (row.status === "cleaned")
            throw Error(
              "Cleaned batches cannot be reimported. Generate with a new seed.",
            );
          const secret = await manifest(plan);
          if (secret.hash !== row.manifest_hash)
            throw Error("Account manifest changed.");
          const before = await capture(tx);
          const bytes = await sharp({
            create: {
              width: 640,
              height: 360,
              channels: 3,
              background: "#14241a",
            },
          })
            .composite([
              {
                input: Buffer.from(
                  '<svg width="640" height="360"><rect x="32" y="32" width="576" height="296" rx="24" fill="none" stroke="#e8c26b"/><text x="320" y="175" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">SYNTHETIC TEST IMAGE</text><text x="320" y="210" text-anchor="middle" fill="#e8c26b" font-size="16">YEREVANHUB STAGING</text></svg>',
                ),
              },
            ])
            .webp()
            .toBuffer();
          const image = await storeImage(plan.imageId, bytes);
          writtenFile = path.join(demoPaths().media, image.key);
          await tx.execute({
            sql: "INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)",
            args: [
              plan.imageId,
              image.url,
              image.key,
              image.backend,
              bytes.length,
              actor!.id,
              new Date().toISOString(),
            ],
          });
          await materialize(
            this.database,
            state,
            tx,
            plan,
            secret.accounts,
            actor!,
          );
          const after = await capture(tx);
          assertUnchanged(before, after);
          for (const [key, record] of after)
            if (!before.has(key))
              await tx.execute({
                sql: "INSERT INTO demo_records VALUES(?,?,?,?)",
                args: [
                  id,
                  record.table,
                  JSON.stringify(record.key),
                  record.hash,
                ],
              });
          const actual = await actualCounts(tx, id, after);
          assertCounts(plan.config.counts, actual.counts);
          if (
            (await tx.execute("PRAGMA foreign_key_check")).rows.length ||
            !(await providerIntegrity(tx)).ready ||
            !(await serviceIntegrity(tx)).ready
          )
            throw Error("Synthetic graph integrity failed.");
          await tx.execute({
            sql: "UPDATE demo_batches SET status='imported',imported_at=? WHERE id=?",
            args: [new Date().toISOString(), id],
          });
          return {
            id,
            imported: true,
            counts: actual.counts,
            physicalInventory: actual.physicalInventory,
            trackedRecords: actual.trackedRows,
          };
        },
        undefined,
        { retainExistingAuditRows: true },
      );
      committed = true;
      return result;
    } finally {
      if (writtenFile && !committed) {
        const { unlink } = await import("node:fs/promises");
        await unlink(writtenFile);
      }
    }
  }
  async cleanup(actor: User | null, ids: string[]) {
    demoPaths();
    requireAdmin(actor);
    if (!ids.length || new Set(ids).size !== ids.length)
      throw Error("Select distinct batch IDs.");
    return this.database.sqlTransaction(async (tx) => {
      await initialize(tx, actor);
      const batches = await Promise.all(ids.map((id) => getBatch(tx, id)));
      const imported = batches.filter((b) => b.row.status === "imported"),
        before = await capture(tx),
        owned = new Set<string>(),
        rows: CapturedRow[] = [];
      for (const batch of imported) {
        const records = (
          await tx.execute({
            sql: "SELECT * FROM demo_records WHERE batch_id=?",
            args: [batch.plan.id],
          })
        ).rows;
        for (const record of records) {
          const key = String(record.table_name) + "\0" + String(record.pk_json),
            current = before.get(key);
          if (!current && record.table_name === "audit_logs") continue;
          if (!current || current.hash !== record.row_hash)
            throw Error(
              "Cleanup refused: batch records were edited or removed.",
            );
          owned.add(key);
          rows.push(current);
        }
      }
      // Preserve unrelated saved places, even though this legacy relationship is textual.
      const places = new Set(
        rows
          .filter((r) => r.table === "properties")
          .map((r) => String(r.values.kind) + ":" + String(r.values.id)),
      );
      if (
        [...before].some(
          ([key, r]) =>
            !owned.has(key) &&
            r.table === "saved_places" &&
            places.has(String(r.values.place)),
        )
      )
        throw Error(
          "Cleanup refused: another account saved a synthetic property.",
        );
      // Login sessions belong to synthetic accounts and are explicitly revoked on cleanup.
      const users = new Set(
          rows
            .filter((r) => r.table === "users")
            .map((r) => String(r.values.id)),
        ),
        revoked = new Set<string>();
      for (const [key, r] of before)
        if (
          ["sessions", "auth_tokens"].includes(r.table) &&
          users.has(String(r.values.user_id))
        ) {
          revoked.add(key);
          rows.push(r);
        }
      const references = rows
        .filter((r) =>
          [
            "properties",
            "users",
            "job_postings",
            "tour_listings",
            "media_assets",
          ].includes(r.table),
        )
        .flatMap((r) => [
          String(r.values.id),
          ...(r.table === "media_assets" ? [String(r.values.url)] : []),
        ]);
      for (const [key, row] of before)
        if (
          !owned.has(key) &&
          !revoked.has(key) &&
          row.table !== "audit_logs" &&
          references.some((id) => JSON.stringify(row.values).includes(id))
        )
          throw Error(
            "Cleanup refused: an unowned row references synthetic data or media.",
          );
      const order = await deletionOrder(tx, [
        ...new Set(rows.map((r) => r.table)),
      ]);
      await tx.execute("PRAGMA defer_foreign_keys=ON");
      for (const table of order)
        for (const row of rows.filter((r) => r.table === table)) {
          const keys = Object.keys(row.key);
          await tx.execute({
            sql:
              "DELETE FROM " +
              quote(table) +
              " WHERE " +
              keys.map((k) => quote(k) + "=?").join(" AND "),
            args: keys.map((k) => row.key[k]) as string[],
          });
        }
      const after = await capture(tx);
      assertUnchanged(before, after, new Set([...owned, ...revoked]));
      if (
        (await tx.execute("PRAGMA foreign_key_check")).rows.length ||
        !(await providerIntegrity(tx)).ready ||
        !(await serviceIntegrity(tx)).ready
      )
        throw Error(
          "Cleanup refused: external records still depend on this batch.",
        );
      for (const batch of batches)
        if (batch.row.status !== "cleaned")
          await tx.execute({
            sql: "UPDATE demo_batches SET status='cleaned',cleaned_at=? WHERE id=?",
            args: [new Date().toISOString(), batch.plan.id],
          });
      // Keep immutable placeholder files and private manifests as recovery evidence.
      // No filesystem unlink can invalidate a transaction rollback or a later backup.
      return {
        removedRecords: owned.size,
        cleaned: ids,
        retainedMedia: true,
        revokedSessions: revoked.size,
      };
    });
  }
}
