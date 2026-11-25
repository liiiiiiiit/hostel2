import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, lstat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { demoPaths } from "../server/demo/safety.js";
import { Database } from "../server/database.js";
import { DemoManager } from "../server/demo/manager.js";
import type { User } from "../src/types/index.js";
process.umask(0o077);
const args = process.argv.slice(2),
  command = args[0],
  argument = (name: string) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    if (!args[i + 1] || args[i + 1].startsWith("--"))
      throw Error("Missing argument: " + name);
    return args[i + 1];
  };
let database: Database | undefined;
try {
  const paths = demoPaths();
  if (!["generate", "validate", "seed", "status", "cleanup"].includes(command))
    throw Error("Use generate, validate, seed, status or cleanup.");
  if (!existsSync(paths.database)) {
    if (process.env.APP_ENV !== "testing" || !args.includes("--init"))
      throw Error(
        "An existing marked staging database is required. Only testing --init can create a new sandbox.",
      );
    await mkdir(paths.directory, { recursive: true, mode: 0o700 });
    const email = "sandbox.admin@example.test",
      password = randomBytes(24).toString("base64url");
    await writeFile(
      paths.directory + "/bootstrap.demo-manifest.json",
      JSON.stringify({ email, password, role: "admin" }) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    database = new Database({
      demo: false,
      adminEmail: email,
      adminPassword: password,
    });
  } else database = new Database({ demo: false });
  await database.waitUntilReady();
  const admin = await database.sqlTransaction(async (tx) => {
    const r = (
      await tx.execute(
        "SELECT id,name,email,role,is_active,created_at FROM users WHERE role='admin' AND is_active=1 ORDER BY id LIMIT 1",
      )
    ).rows[0];
    if (!r)
      throw Error(
        "Create the isolated administrator through existing bootstrap first.",
      );
    return {
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      role: "admin",
      isActive: true,
      createdAt: String(r.created_at),
    } as User;
  }, "read");
  const manager = new DemoManager(database);
  let result: unknown;
  if (command === "status") result = await manager.status(admin);
  else if (command === "generate" || command === "seed") {
    let id = argument("--batch");
    if (!id) {
      const file = argument("--config");
      const config = file ? JSON.parse(await readFile(file, "utf8")) : {};
      const seed = argument("--seed");
      if (seed) config.seed = seed;
      const modules = argument("--modules");
      if (modules) config.modules = modules.split(",");
      const content = argument("--content");
      if (content) config.content = JSON.parse(await readFile(content, "utf8"));
      const generated = await manager.generate(admin, config);
      result = generated;
      id = generated.id;
    }
    if (command === "seed") result = await manager.seed(admin, id);
  } else if (command === "validate") {
    const id = argument("--batch");
    if (!id) throw Error("Specify --batch UUID.");
    result = await manager.validate(admin, id);
  } else {
    const ids = argument("--batch")?.split(",");
    if (!ids?.length || !args.includes("--confirm"))
      throw Error(
        "Specify --batch UUID[,UUID] --confirm; only unchanged owned records can be removed.",
      );
    result = await manager.cleanup(admin, ids);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : "Demo operation failed.");
  process.exitCode = 1;
} finally {
  if (database)
    await database.close().catch(() => {
      process.exitCode = 1;
    });
}
