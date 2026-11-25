import type { Transaction } from "@libsql/client";
import { createHash } from "node:crypto";
import { quote } from "../relational-schema.js";
import { encodeSQLValue } from "../backups.js";
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface CapturedRow {
  table: string;
  key: Record<string, unknown>;
  hash: string;
  values: Record<string, unknown>;
}
export async function capture(tx: Transaction) {
  const result = new Map<string, CapturedRow>();
  const tables = (
    await tx.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'demo_%' ORDER BY name",
    )
  ).rows;
  for (const entry of tables) {
    const table = String(entry.name),
      info = (await tx.execute("PRAGMA table_info(" + quote(table) + ")")).rows;
    const keys = info
      .filter((r) => Number(r.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk))
      .map((r) => String(r.name));
    if (!keys.length)
      throw Error("Provenance requires a primary key: " + table);
    const rows = await tx.execute("SELECT * FROM " + quote(table));
    for (const row of rows.rows) {
      const values = Object.fromEntries(
          rows.columns.map((c) => [c, encodeSQLValue(row[c])]),
        ),
        key = Object.fromEntries(keys.map((c) => [c, values[c]]));
      result.set(table + "\0" + JSON.stringify(key), {
        table,
        key,
        values,
        hash: digest(values),
      });
    }
  }
  return result;
}
export function assertUnchanged(
  before: Map<string, CapturedRow>,
  after: Map<string, CapturedRow>,
  except = new Set<string>(),
) {
  for (const [key, row] of before)
    if (!except.has(key) && after.get(key)?.hash !== row.hash)
      throw Error("Refusing to change an existing/unowned row: " + row.table);
}
export async function deletionOrder(tx: Transaction, tables: string[]) {
  const dependencies = new Map<string, Set<string>>();
  for (const table of tables) {
    const parents = (
      await tx.execute("PRAGMA foreign_key_list(" + quote(table) + ")")
    ).rows.map((r) => String(r.table));
    if (table === "tour_bookings") parents.push("tour_listings");
    if (["job_postings", "tour_listings"].includes(table))
      parents.push("users");
    dependencies.set(
      table,
      new Set(parents.filter((p) => tables.includes(p) && p !== table)),
    );
  }
  const order: string[] = [],
    pending = new Set(tables);
  while (pending.size) {
    const ready = [...pending].filter((t) =>
      [...dependencies.get(t)!].every((p) => !pending.has(p)),
    );
    if (!ready.length) throw Error("Cannot safely order cyclic cleanup.");
    for (const table of ready) {
      pending.delete(table);
      order.push(table);
    }
  }
  return order.reverse();
}
