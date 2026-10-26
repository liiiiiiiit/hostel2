import { put, del } from "@vercel/blob";
import "dotenv/config";
import { createClient } from "@libsql/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  exportSnapshot,
  encryptSnapshot,
  decryptSnapshot,
  restoreSnapshot,
} from "../server/backups.js";
const key = process.env.BACKUP_ENCRYPTION_KEY;
if (!key)
  throw new Error("Set BACKUP_ENCRYPTION_KEY securely before backup/restore.");
if (process.argv[2] === "restore") {
  const url = process.env.RESTORE_DATABASE_URL,
    directory = process.env.RESTORE_MEDIA_DIRECTORY ?? "",
    file = process.argv[3],
    blob = process.env.RESTORE_MEDIA_STORAGE === "blob";
  if (
    !url ||
    (!blob && !directory) ||
    !file ||
    url === process.env.DATABASE_URL
  )
    throw new Error(
      "Restore needs a separate empty RESTORE_DATABASE_URL, RESTORE_MEDIA_DIRECTORY and backup filename.",
    );
  const client = createClient({
    url,
    authToken: process.env.RESTORE_DATABASE_AUTH_TOKEN,
  });
  try {
    if (blob && !process.env.RESTORE_BLOB_READ_WRITE_TOKEN)
      throw new Error("Set RESTORE_BLOB_READ_WRITE_TOKEN securely.");
    const storage = blob
      ? {
          upload: async (name: string, bytes: Buffer) =>
            (
              await put(name, bytes, {
                access: "public",
                addRandomSuffix: false,
                contentType: "image/webp",
                token: process.env.RESTORE_BLOB_READ_WRITE_TOKEN,
              })
            ).url,
          remove: async (url: string) => {
            await del(url, {
              token: process.env.RESTORE_BLOB_READ_WRITE_TOKEN,
            });
          },
        }
      : undefined;
    await restoreSnapshot(
      client,
      decryptSnapshot(await readFile(file), key),
      directory,
      storage,
    );
    console.log(
      "Restored into the separate target. Verify it before changing production configuration.",
    );
  } finally {
    client.close();
  }
} else {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  try {
    const snapshot = await exportSnapshot(client);
    const directory = process.env.BACKUP_DIRECTORY ?? "backups";
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const file = path.join(
      directory,
      `yerevanhub-${new Date().toISOString().replace(/[:.]/g, "-")}.yhbak`,
    );
    await writeFile(file, encryptSnapshot(snapshot, key), {
      mode: 0o600,
      flag: "wx",
    });
    console.log(
      `Encrypted backup saved: ${file}. Copy it to separate protected storage.`,
    );
  } finally {
    client.close();
  }
}
