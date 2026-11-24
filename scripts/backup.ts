import {assertRuntimeEnvironment,assertDatabaseTarget} from '../server/environment.js';
import {createVerifiedBackup,verifyBackup,retainVerifiedBackups} from '../server/backup-files.js';
import {assertRestoreSeparation} from '../server/persistence.js';
import {assertExistingBackupSource,assertPersistentConfiguration} from '../server/storage-paths.js';
import { put, del } from "@vercel/blob";
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  decryptSnapshot,
  restoreSnapshot,
} from "../server/backups.js";
assertRuntimeEnvironment();
if(process.env.DATABASE_URL)assertDatabaseTarget(process.env.DATABASE_URL);
const key = process.env.BACKUP_ENCRYPTION_KEY;
if (!key)
  throw new Error("Set BACKUP_ENCRYPTION_KEY securely before backup/restore.");
if(process.argv[2]==='verify'){
 const file=process.argv[3];if(!file)throw Error('Provide the backup filename.');const {snapshot,...report}=await verifyBackup(file,key);console.log(JSON.stringify({verified:true,...report}));
}else if (process.argv[2] === "restore") {
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
  assertDatabaseTarget(url,process.env,true);
  if(!blob)assertRestoreSeparation(process.env.DATABASE_URL??'',url,process.env.MEDIA_DIRECTORY||'data/uploads',directory);
  const client = createClient({
    url,
    intMode:'bigint',
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
  assertExistingBackupSource(url);
  assertPersistentConfiguration();
  const client = createClient({
    url,
    intMode:'bigint',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  try {
    const directory=path.resolve(process.env.BACKUP_DIRECTORY??'backups');
    const result=await createVerifiedBackup(client,directory,key);
    console.log(JSON.stringify({verified:true,...result}));
    if(process.env.BACKUP_RETENTION_DAYS){const retention=await retainVerifiedBackups(directory,key,{days:Number(process.env.BACKUP_RETENTION_DAYS),minimum:Number(process.env.BACKUP_RETENTION_MIN_COUNT??7)});console.log(JSON.stringify({retention}));if(retention.skipped.length)process.exitCode=1;}

  } finally {
    client.close();
  }
}
