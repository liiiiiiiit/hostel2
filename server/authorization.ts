import type { Client, Transaction } from "@libsql/client";
import type { User } from "../src/types/index.js";
import { can, requirePermission } from "../src/utils/authorization.js";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

export async function authorizationReady(db: Client | Transaction) {
  const names = new Set(
    (
      await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
    ).rows.map((r) => String(r.name)),
  );
  if (
    !names.has("legacy_provider_access") ||
    !names.has("authorization_events") ||
    !names.has("module_migrations")
  )
    return false;
  for (const [table, required] of [
    ["legacy_provider_access", ["user_id", "provider_role"]],
    [
      "authorization_events",
      [
        "id",
        "actor_id",
        "target_id",
        "before_json",
        "after_json",
        "reason",
        "created_at",
      ],
    ],
  ] as const) {
    const columns = new Set(
      (await db.execute("PRAGMA table_info(" + table + ")")).rows.map((r) =>
        String(r.name),
      ),
    );
    if (required.some((column) => !columns.has(column))) return false;
  }
  return (
    !!(
      await db.execute(
        "SELECT name FROM module_migrations WHERE name='authorization-v1'",
      )
    ).rows.length &&
    !!(
      await db.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='authorization_events_target'",
      )
    ).rows.length
  );
}
/** Ownership used to imply provider privileges on every request. Freeze those
 * historical privileges once, so an explicit revocation cannot recreate them. */
export async function migrateAuthorization(client: Client) {
  const tx = await client.transaction("write");
  try {
    await tx.execute(
      `CREATE TABLE IF NOT EXISTS legacy_provider_access(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,provider_role TEXT NOT NULL CHECK(provider_role IN ('job_provider','tour_provider')),PRIMARY KEY(user_id,provider_role))`,
    );
    // Audit identities deliberately outlive account deletion; no contact/secrets.
    await tx.execute(
      `CREATE TABLE IF NOT EXISTS authorization_events(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,target_id TEXT NOT NULL,before_json TEXT NOT NULL CHECK(json_valid(before_json)),after_json TEXT NOT NULL CHECK(json_valid(after_json)),reason TEXT NOT NULL,created_at TEXT NOT NULL)`,
    );
    await tx.execute(
      "CREATE INDEX IF NOT EXISTS authorization_events_target ON authorization_events(target_id,created_at)",
    );
    if (
      !(
        await tx.execute(
          "SELECT name FROM module_migrations WHERE name='authorization-v1'",
        )
      ).rows.length
    ) {
      for (const [role, table] of [
        ["job_provider", "job_postings"],
        ["tour_provider", "tour_listings"],
      ])
        await tx.execute({
          sql: `INSERT OR IGNORE INTO legacy_provider_access SELECT DISTINCT u.id,? FROM users u JOIN ${table} p ON p.owner_id=u.id WHERE u.role<>'admin' AND NOT EXISTS(SELECT 1 FROM provider_accounts a WHERE a.user_id=u.id)`,
          args: [role],
        });
      await tx.execute({
        sql: "INSERT INTO module_migrations VALUES('authorization-v1',?)",
        args: [new Date().toISOString()],
      });
    }
    if (!(await authorizationReady(tx)))
      throw Error("Authorization schema is incomplete.");
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
export async function authorizationUser(
  tx: Transaction,
  user: User | null,
): Promise<User | null> {
  if (!user) return null;
  const row = (
    await tx.execute({
      sql: "SELECT u.role,u.is_active,p.provider_role,p.organization FROM users u LEFT JOIN provider_accounts p ON p.user_id=u.id WHERE u.id=?",
      args: [user.id],
    })
  ).rows[0];
  if (!row || !row.is_active) return null;
  const legacy = (
    await tx.execute({
      sql: "SELECT provider_role FROM legacy_provider_access WHERE user_id=? ORDER BY provider_role",
      args: [user.id],
    })
  ).rows.map(
    (r) => String(r.provider_role) as "job_provider" | "tour_provider",
  );
  return {
    ...user,
    isActive: true,
    role: (row.provider_role ?? row.role) as User["role"],
    organization: row.provider_role ? String(row.organization) : undefined,
    ...(legacy.length
      ? { legacyProviderRoles: legacy }
      : { legacyProviderRoles: undefined }),
  };
}
export async function requireLivePermission(
  tx: Transaction,
  user: User | null,
  permission: Parameters<typeof can>[1],
) {
  const actor = await authorizationUser(tx, user);
  requirePermission(actor, permission);
  return actor!;
}
export async function revokeAuthorizationSessions(tx: Transaction, id: string) {
  await tx.execute({ sql: "DELETE FROM sessions WHERE user_id=?", args: [id] });
  await tx.execute({
    sql: "UPDATE auth_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL",
    args: [Date.now(), id],
  });
}
export async function auditAuthorization(
  tx: Transaction,
  actorId: string,
  targetId: string,
  before: unknown,
  after: unknown,
  reason: string,
) {
  await tx.execute({
    sql: "INSERT INTO authorization_events VALUES(?,?,?,?,?,?,?)",
    args: [
      randomUUID(),
      actorId,
      targetId,
      JSON.stringify(before),
      JSON.stringify(after),
      reason,
      new Date().toISOString(),
    ],
  });
}
async function access(tx: Transaction, id: string) {
  const row = (
    await tx.execute({
      sql: "SELECT u.id,u.role,u.is_active,p.provider_role,p.organization FROM users u LEFT JOIN provider_accounts p ON p.user_id=u.id WHERE u.id=?",
      args: [id],
    })
  ).rows[0];
  if (!row) throw new Error("اطلاعات واردشده معتبر نیست.");
  return {
    role: String(row.provider_role ?? row.role) as User["role"],
    isActive: !!row.is_active,
    organization: String(row.organization ?? ""),
    assignedHostelIds: (
      await tx.execute({
        sql: "SELECT hostel_id FROM manager_properties WHERE user_id=? ORDER BY hostel_id",
        args: [id],
      })
    ).rows.map((r) => String(r.hostel_id)),
    legacyProviderRoles: (
      await tx.execute({
        sql: "SELECT provider_role FROM legacy_provider_access WHERE user_id=? ORDER BY provider_role",
        args: [id],
      })
    ).rows.map((r) => String(r.provider_role)),
  };
}
const version = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function authorizationAccounts(
  tx: Transaction,
  actor: User | null,
) {
  await requireLivePermission(tx, actor, "accounts.assign");
  const rows = (
    await tx.execute("SELECT id,name,email FROM users ORDER BY name,id")
  ).rows;
  return Promise.all(
    rows.map(async (row) => {
      const current = await access(tx, String(row.id));
      return {
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        ...current,
        version: version(current),
      };
    }),
  );
}
export const accessInput = z
  .object({
    id: z.string().min(1).max(500),
    version: z.string().regex(/^[a-f0-9]{64}$/),
    role: z.enum([
      "admin",
      "hostel_manager",
      "traveler",
      "job_provider",
      "tour_provider",
    ]),
    isActive: z.boolean(),
    assignedHostelIds: z.array(z.string().min(1).max(500)).max(100),
    revokeLegacyAccess: z.boolean().default(false),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export async function setAccountAccess(
  tx: Transaction,
  actor: User | null,
  input: z.infer<typeof accessInput>,
) {
  const admin = await requireLivePermission(tx, actor, "accounts.assign"),
    before = await access(tx, input.id);
  if (input.version !== version(before))
    throw new Error("دسترسی این حساب تغییر کرده است؛ دوباره بارگذاری کنید.");
  if (
    before.role === "admin" &&
    before.isActive &&
    (!input.isActive || input.role !== "admin") &&
    Number(
      (
        await tx.execute(
          "SELECT COUNT(*) AS n FROM users u WHERE role='admin' AND is_active=1 AND NOT EXISTS(SELECT 1 FROM provider_accounts p WHERE p.user_id=u.id)",
        )
      ).rows[0].n,
    ) <= 1
  )
    throw new Error("آخرین مدیر فعال را نمی‌توان غیرفعال یا تغییر نقش داد.");
  const assigned = [...new Set(input.assignedHostelIds)].sort();
  if (input.role === "hostel_manager" && !assigned.length)
    throw new Error("حداقل یک هاستل انتخاب کنید.");
  for (const id of assigned)
    if (
      !(
        await tx.execute({
          sql: "SELECT id FROM properties WHERE kind='hostel' AND id=?",
          args: [id],
        })
      ).rows.length
    )
      throw new Error("اطلاعات واردشده معتبر نیست.");
  const roleChanged = before.role !== input.role;
  if (input.role === "job_provider" || input.role === "tour_provider") {
    await tx.execute({
      sql: "UPDATE users SET role='traveler',is_active=? WHERE id=?",
      args: [Number(input.isActive), input.id],
    });
    await tx.execute({
      sql: "INSERT INTO provider_accounts(user_id,provider_role,organization) VALUES(?,?,'') ON CONFLICT(user_id) DO UPDATE SET provider_role=excluded.provider_role",
      args: [input.id, input.role],
    });
  } else {
    await tx.execute({
      sql: "DELETE FROM provider_accounts WHERE user_id=?",
      args: [input.id],
    });
    await tx.execute({
      sql: "UPDATE users SET role=?,is_active=? WHERE id=?",
      args: [input.role, Number(input.isActive), input.id],
    });
  }
  // Non-manager roles retain dormant assignments for historical compatibility.
  // Changing a manager's selection is an explicit administrator operation.
  if (input.role === "hostel_manager") {
    await tx.execute({
      sql: "DELETE FROM manager_properties WHERE user_id=?",
      args: [input.id],
    });
    for (const id of assigned)
      await tx.execute({
        sql: "INSERT INTO manager_properties(user_id,hostel_id,property_kind) VALUES(?,?,'hostel')",
        args: [input.id, id],
      });
  }
  if (roleChanged || input.revokeLegacyAccess)
    await tx.execute({
      sql: "DELETE FROM legacy_provider_access WHERE user_id=?",
      args: [input.id],
    });
  const after = await access(tx, input.id);
  if (version(before) !== version(after)) {
    await revokeAuthorizationSessions(tx, input.id);
    await auditAuthorization(
      tx,
      admin.id,
      input.id,
      before,
      after,
      input.reason,
    );
  }
}
