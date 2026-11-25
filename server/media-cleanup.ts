import type { Client, Transaction } from "@libsql/client";
import type { Database } from "./database.js";
import { createHash } from "node:crypto";
import { applicationEnvironment, canonicalPath } from "./environment.js";
import { mediaDirectory, deleteStoredImage } from "./media.js";
import { imageIsReferenced } from "./repository.js";
interface Asset {
  id: string;
  url: string;
  storage_key: string;
  backend: string;
  bytes: number;
  created_by: string;
  created_at: string;
}
export async function mediaCleanupReady(client: Client | Transaction) {
  const exists = (
    await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='media_deletions'",
    )
  ).rows.length;
  if (!exists) return false;
  const columns = new Set(
    (await client.execute("PRAGMA table_info(media_deletions)")).rows.map((r) =>
      String(r.name),
    ),
  );
  return ["id", "scope", "asset_json", "created_at"].every((c) =>
    columns.has(c),
  );
}
export async function migrateMediaCleanup(client: Client) {
  const tx = await client.transaction("write");
  try {
    await tx.execute(
      `CREATE TABLE IF NOT EXISTS media_deletions(id TEXT PRIMARY KEY,scope TEXT NOT NULL,asset_json TEXT NOT NULL CHECK(json_valid(asset_json)),created_at TEXT NOT NULL)`,
    );
    await tx.execute(
      "INSERT OR IGNORE INTO module_migrations(name,applied_at) VALUES('media-cleanup-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
    );
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
async function scope(tx: Transaction) {
  const remote =
    process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:");
  const file = String(
    (await tx.execute("PRAGMA database_list")).rows.find(
      (r) => r.name === "main",
    )?.file ?? "",
  );
  const database = remote
    ? new URL(process.env.DATABASE_URL!).href
    : file
      ? canonicalPath(file)
      : "";
  if (!database)
    throw Error("Media cleanup needs an explicit database identity.");
  return createHash("sha256")
    .update(
      JSON.stringify([
        applicationEnvironment(),
        database,
        mediaDirectory(),
        process.env.DATABASE_AUTH_TOKEN ?? "",
        process.env.BLOB_READ_WRITE_TOKEN ?? "",
      ]),
    )
    .digest("hex");
}
/** Commit logical removal and its retry record together; never unlink here. */
export async function queueMediaDeletion(
  tx: Transaction,
  row: Record<string, unknown>,
) {
  const asset: Asset = {
    id: String(row.id),
    url: String(row.url),
    storage_key: String(row.storage_key),
    backend: String(row.backend),
    bytes: Number(row.bytes),
    created_by: String(row.created_by),
    created_at: String(row.created_at),
  };
  await tx.execute({
    sql: "INSERT INTO media_deletions VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
    args: [
      asset.id,
      await scope(tx),
      JSON.stringify(asset),
      new Date().toISOString(),
    ],
  });
  await tx.execute({
    sql: "DELETE FROM media_assets WHERE id=?",
    args: [asset.id],
  });
}
/** The queue is already committed. A later failure can only leave a retryable
 * deletion intent, never a restored media_assets row pointing to a lost file.
 * Scope binds it to the source DB/storage: restored copies cannot delete originals. */
export async function drainMediaDeletions(
  database: Database,
  id?: string,
  limit = 2,
) {
  let removed = 0,
    cancelled = 0;
  for (let i = 0; i < limit; i++) {
    const result = await database.sqlTransaction(async (tx) => {
      const row = (
        await tx.execute({
          sql:
            "SELECT * FROM media_deletions WHERE scope=?" +
            (id ? " AND id=?" : "") +
            " ORDER BY created_at,id LIMIT 1",
          args: [await scope(tx), ...(id ? [id] : [])],
        })
      ).rows[0];
      if (!row) return null;
      const asset = JSON.parse(String(row.asset_json)) as Asset;
      if (
        (
          await tx.execute({
            sql: "SELECT id FROM media_assets WHERE id=?",
            args: [asset.id],
          })
        ).rows.length
      ) {
        await tx.execute({
          sql: "DELETE FROM media_deletions WHERE id=?",
          args: [asset.id],
        });
        return "cancelled";
      }
      if (await imageIsReferenced(tx, asset.url)) {
        await tx.execute({
          sql: "INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)",
          args: [
            asset.id,
            asset.url,
            asset.storage_key,
            asset.backend,
            asset.bytes,
            asset.created_by,
            asset.created_at,
          ],
        });
        await tx.execute({
          sql: "DELETE FROM media_deletions WHERE id=?",
          args: [asset.id],
        });
        return "cancelled";
      }
      await deleteStoredImage(asset);
      await tx.execute({
        sql: "DELETE FROM media_deletions WHERE id=?",
        args: [asset.id],
      });
      return "removed";
    });
    if (!result) break;
    if (result === "removed") removed++;
    else cancelled++;
  }
  const pending = await database.sqlTransaction(
    async (tx) =>
      Number(
        (
          await tx.execute({
            sql:
              "SELECT COUNT(*) AS n FROM media_deletions" +
              (id ? " WHERE id=?" : ""),
            args: id ? [id] : [],
          })
        ).rows[0].n,
      ),
    "read",
  );
  return { removed, cancelled, pending };
}
