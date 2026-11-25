import { lstatSync, existsSync } from "node:fs";
import path from "node:path";
import type { Transaction } from "@libsql/client";
import {
  assertRuntimeEnvironment,
  assertDatabaseTarget,
  canonicalPath,
} from "../environment.js";

export function demoPaths(env: NodeJS.ProcessEnv = process.env) {
  if (
    env.DEMO_TOOLS_ENABLED !== "true" ||
    !["staging", "testing"].includes(env.APP_ENV ?? "") ||
    env.VERCEL ||
    env.PERSISTENT_STORAGE_MODE === "managed"
  )
    throw Error(
      "Demo tools require explicitly enabled isolated staging/testing.",
    );
  assertRuntimeEnvironment(env);
  if (env.NOTIFICATION_DELIVERY !== "disabled" || env.MEDIA_STORAGE !== "local")
    throw Error("Demo tools require disabled delivery and local media.");
  for (const key of [
    "DATABASE_AUTH_TOKEN",
    "RESEND_API_KEY",
    "NOTIFICATION_FROM",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "SMS_API_KEY",
    "TWILIO_AUTH_TOKEN",
    "STRIPE_SECRET_KEY",
    "PAYPAL_CLIENT_SECRET",
    "GEMINI_API_KEY",
    "BLOB_READ_WRITE_TOKEN",
    "RESTORE_BLOB_READ_WRITE_TOKEN",
    "RESTORE_DATABASE_AUTH_TOKEN",
  ])
    if (env[key])
      throw Error(
        "External credentials are forbidden for demo generation: " + key,
      );
  const staging = env.APP_ENV === "staging";
  const root = staging ? "/opt/hostel2-staging" : (env.DEMO_SANDBOX_ROOT ?? "");
  if (
    !path.isAbsolute(root) ||
    canonicalPath(root) !== root ||
    root === path.parse(root).root
  )
    throw Error("Use a dedicated canonical sandbox root.");
  if (!staging) {
    if (
      [
        "/opt/hostel2",
        "/var/lib/hostel2",
        "/opt/hostel2-staging",
        process.cwd(),
      ].some((p) => root === p || root.startsWith(p + "/"))
    )
      throw Error(
        "Testing sandbox must be outside application and deployed resources.",
      );
    const stat = lstatSync(root);
    if (!stat.isDirectory() || (stat.mode & 0o077) !== 0)
      throw Error("Testing sandbox must be private (0700).");
    if (
      env.APP_URL &&
      !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.APP_URL)
    )
      throw Error("Testing origin must be loopback.");
  }
  const database = staging ? root + "/data/staging.db" : root + "/staging.db";
  const media = staging ? root + "/data/uploads" : root + "/uploads",
    directory = root + "/demo";
  if (
    env.DATABASE_URL !== "file:" + database ||
    env.MEDIA_DIRECTORY !== media ||
    env.DEMO_DIRECTORY !== directory
  )
    throw Error(
      "Explicit sandbox database, media and manifest paths are required.",
    );
  for (const file of [database, media, directory])
    if (canonicalPath(file) !== file)
      throw Error("Sandbox resources must not contain symlink aliases.");
  assertDatabaseTarget(env.DATABASE_URL, env);
  if (existsSync(database) && lstatSync(database).nlink !== 1)
    throw Error("Sandbox database must not be hard linked.");
  return { root, database, media, directory };
}
export async function assertDemoDatabase(tx: Transaction) {
  const { database } = demoPaths();
  const databases = (await tx.execute("PRAGMA database_list")).rows;
  if (
    canonicalPath(String(databases.find((r) => r.name === "main")?.file)) !==
    database
  )
    throw Error("Connected database is not the configured sandbox.");
  const marker = (
    await tx.execute(
      "SELECT name FROM sqlite_master WHERE name='runtime_environment'",
    )
  ).rows;
  if (
    !marker.length ||
    (await tx.execute("SELECT environment FROM runtime_environment WHERE id=1"))
      .rows[0]?.environment !== process.env.APP_ENV
  )
    throw Error("Demo tools require the matching isolated database marker.");
}
export const demoEnabled = () =>
  ["staging", "testing"].includes(process.env.APP_ENV ?? "") &&
  process.env.DEMO_TOOLS_ENABLED === "true";
