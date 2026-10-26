import type { Client } from "@libsql/client";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { mediaDirectory } from "./media.js";
interface Snapshot {
  version: 1;
  createdAt: string;
  tables: { name: string; sql: string; columns: string[]; rows: unknown[][] }[];
  assets: { id: string; url: string; bytes: string; sha256: string }[];
}
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const identifier = (name: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))
    throw new Error("Unsupported database identifier");
  return '"' + name + '"';
};
export async function exportSnapshot(
  client: Client,
  readAsset?: (asset: Record<string, unknown>) => Promise<Buffer>,
): Promise<Snapshot> {
  const tx = await client.transaction("write");
  let committed = false;
  try {
    const schema = (
      await tx.execute(
        "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
    ).rows;
    const tables: Snapshot["tables"] = [];
    for (const table of schema) {
      const result = await tx.execute(
        `SELECT * FROM ${identifier(String(table.name))}`,
      );
      tables.push({
        name: String(table.name),
        sql: String(table.sql),
        columns: result.columns,
        rows: result.rows.map((row) =>
          result.columns.map((column) => {
            const value = row[column];
            return typeof value === "bigint" ? Number(value) : value;
          }),
        ),
      });
    }
    await tx.commit();
    committed = true;
    const assetTable = tables.find((t) => t.name === "media_assets");
    const assets: Snapshot["assets"] = [];
    if (assetTable)
      for (const row of assetTable.rows) {
        const asset = Object.fromEntries(
          assetTable.columns.map((key, index) => [key, row[index]]),
        );
        let bytes: Buffer;
        if (readAsset) bytes = await readAsset(asset);
        else if (asset.backend === "local")
          bytes = await readFile(
            path.join(
              mediaDirectory(),
              path.basename(String(asset.storage_key)),
            ),
          );
        else {
          const url = new URL(String(asset.url));
          if (
            url.protocol !== "https:" ||
            !url.hostname.endsWith(".blob.vercel-storage.com")
          )
            throw new Error("Unsupported asset origin");
          const response = await fetch(url, {
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error("Asset backup download failed");
          bytes = Buffer.from(await response.arrayBuffer());
        }
        assets.push({
          id: String(asset.id),
          url: String(asset.url),
          bytes: bytes.toString("base64"),
          sha256: hash(bytes),
        });
      }
    return { version: 1, createdAt: new Date().toISOString(), tables, assets };
  } catch (error) {
    if (!committed) await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
function keyBytes(key: string) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  return bytes;
}
export function encryptSnapshot(snapshot: Snapshot, key: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv),
    encrypted = Buffer.concat([
      cipher.update(JSON.stringify(snapshot)),
      cipher.final(),
    ]);
  return Buffer.concat([
    Buffer.from("YHBK1"),
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}
export function decryptSnapshot(bytes: Buffer, key: string): Snapshot {
  if (bytes.subarray(0, 5).toString() !== "YHBK1")
    throw new Error("Invalid backup format");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(key),
    bytes.subarray(5, 17),
  );
  cipher.setAuthTag(bytes.subarray(17, 33));
  const data = JSON.parse(
    Buffer.concat([
      cipher.update(bytes.subarray(33)),
      cipher.final(),
    ]).toString(),
  ) as Snapshot;
  if (
    data.version !== 1 ||
    !Array.isArray(data.tables) ||
    !Array.isArray(data.assets)
  )
    throw new Error("Unsupported backup");
  return data;
}
export async function restoreSnapshot(
  client: Client,
  snapshot: Snapshot,
  targetMediaDirectory: string,
  storage?: {
    upload: (key: string, bytes: Buffer) => Promise<string>;
    remove: (url: string) => Promise<void>;
  },
) {
  if (
    (
      await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
    ).rows.length
  )
    throw new Error(
      "Restore requires a new empty database. Existing data is never overwritten.",
    );
  if (!storage) await mkdir(targetMediaDirectory, { recursive: true });
  if (!storage && (await readdir(targetMediaDirectory)).length)
    throw new Error("Restore requires an empty media directory.");
  for (const asset of snapshot.assets)
    if (
      !/^[a-f0-9-]{36}$/.test(asset.id) ||
      hash(Buffer.from(asset.bytes, "base64")) !== asset.sha256
    )
      throw new Error("Backup asset checksum mismatch");
  const locations = new Map<string, string>();
  const prefix = "restores/" + crypto.randomUUID() + "/";
  if (storage) {
    try {
      for (const asset of snapshot.assets)
        locations.set(
          asset.id,
          await storage.upload(
            prefix + asset.id + ".webp",
            Buffer.from(asset.bytes, "base64"),
          ),
        );
    } catch (error) {
      for (const url of locations.values())
        await storage.remove(url).catch(() => {});
      throw error;
    }
  }
  const urls = new Map(
    snapshot.assets.map((asset) => [
      asset.url,
      storage ? locations.get(asset.id)! : `/api/app?media=${asset.id}`,
    ]),
  );
  const replace = (value: unknown) => {
    if (typeof value !== "string") return value;
    for (const [from, to] of urls)
      value = (value as string).split(from).join(to);
    return value;
  };
  const tx = await client.transaction("write");
  try {
    for (const table of snapshot.tables) {
      identifier(table.name);
      if (!/^CREATE TABLE\s/i.test(table.sql) || /;\s*\S/.test(table.sql))
        throw new Error("Invalid backup schema");
      await tx.execute(table.sql);
      for (const original of table.rows) {
        const row = original.map(replace);
        if (table.name === "media_assets") {
          row[table.columns.indexOf("backend")] = storage ? "blob" : "local";
          row[table.columns.indexOf("storage_key")] = storage
            ? locations.get(String(row[table.columns.indexOf("id")]))
            : String(row[table.columns.indexOf("id")]) + ".webp";
        }
        await tx.execute({
          sql: `INSERT INTO ${identifier(table.name)} (${table.columns.map(identifier).join(",")}) VALUES(${row.map(() => "?").join(",")})`,
          args: row as (string | number | null)[],
        });
      }
    }
    if (!storage)
      for (const asset of snapshot.assets)
        await writeFile(
          path.join(targetMediaDirectory, asset.id + ".webp"),
          Buffer.from(asset.bytes, "base64"),
          { mode: 0o600, flag: "wx" },
        );
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    if (storage)
      for (const url of locations.values())
        await storage.remove(url).catch(() => {});
    throw error;
  } finally {
    tx.close();
  }
}
