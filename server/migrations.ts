import type { Client, Transaction } from "@libsql/client";
import type { AppStoreState } from "./domain.js";

// Version 1 moves property entities out of the legacy single JSON record.
// Existing bookings, credentials, and private records are preserved byte-for-byte.
export async function migrateDatabase(client: Client) {
  const tx = await client.transaction("write");
  try {
    await tx.execute(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const applied = await tx.execute(
      "SELECT version FROM schema_migrations WHERE version=1",
    );
    if (!applied.rows.length) {
      await tx.execute(
        "CREATE TABLE IF NOT EXISTS migration_backups (version INTEGER PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)",
      );
      await tx.execute(
        "CREATE TABLE properties (id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('hostel','rental')), data TEXT NOT NULL, PRIMARY KEY(kind,id))",
      );
      await tx.execute(
        "CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, url TEXT NOT NULL, storage_key TEXT NOT NULL, backend TEXT NOT NULL, bytes INTEGER NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)",
      );
      const row = await tx.execute("SELECT data FROM app_state WHERE id=1");
      const raw = String(row.rows[0].data);
      const state = JSON.parse(raw) as AppStoreState;
      await tx.execute({
        sql: "INSERT OR IGNORE INTO migration_backups VALUES(1,?,?)",
        args: [raw, new Date().toISOString()],
      });
      await writeProperties(tx, state);
      const { hostels: _hostels, rentals: _rentals, ...remaining } = state;
      await tx.execute({
        sql: "UPDATE app_state SET data=? WHERE id=1",
        args: [JSON.stringify(remaining)],
      });
      await tx.execute({
        sql: "INSERT INTO schema_migrations VALUES(1,?)",
        args: [new Date().toISOString()],
      });
    }
    const operational = await tx.execute(
      "SELECT version FROM schema_migrations WHERE version=2",
    );
    if (!operational.rows.length) {
      await tx.execute(
        "CREATE TABLE operational_records (kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id))",
      );
      await tx.execute(
        "CREATE TABLE IF NOT EXISTS auth_tokens (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,purpose TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER)",
      );
      const raw = String(
        (await tx.execute("SELECT data FROM app_state WHERE id=1")).rows[0]
          .data,
      );
      const state = JSON.parse(raw) as AppStoreState;
      await tx.execute({
        sql: "INSERT OR IGNORE INTO migration_backups VALUES(2,?,?)",
        args: [raw, new Date().toISOString()],
      });
      await writeOperationalRecords(tx, state);
      const remaining = { ...state };
      for (const key of operationalCollections) delete remaining[key];
      await tx.execute({
        sql: "UPDATE app_state SET data=? WHERE id=1",
        args: [JSON.stringify(remaining)],
      });
      await tx.execute({
        sql: "INSERT INTO schema_migrations VALUES(2,?)",
        args: [new Date().toISOString()],
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
export async function readProperties(tx: Transaction, state: AppStoreState) {
  state.hostels = [];
  state.rentals = [];
  const rows = await tx.execute(
    "SELECT kind,data FROM properties ORDER BY rowid",
  );
  for (const row of rows.rows) {
    if (row.kind === "hostel") state.hostels.push(JSON.parse(String(row.data)));
    else state.rentals.push(JSON.parse(String(row.data)));
  }
}
export async function writeProperties(tx: Transaction, state: AppStoreState) {
  for (const [kind, values] of [
    ["hostel", state.hostels],
    ["rental", state.rentals],
  ] as const) {
    for (const value of values ?? [])
      await tx.execute({
        sql: "INSERT INTO properties(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
        args: [kind, value.id, JSON.stringify(value)],
      });
  }
}
// Run offline, after taking a full backup. Uses CURRENT properties, never restores stale initial data.
export async function rollbackPropertyMigration(client: Client) {
  if((await client.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length)throw new Error('Run npm run db:rollback -- --offline before rolling back v2/v1.');
  const tx = await client.transaction("write");
  try {
    if (
      (
        await tx.execute(
          "SELECT version FROM schema_migrations WHERE version=2",
        )
      ).rows.length
    )
      throw new Error("Rollback operations migration version 2 first.");
    const row = await tx.execute("SELECT data FROM app_state WHERE id=1");
    const state = JSON.parse(String(row.rows[0].data)) as AppStoreState;
    await readProperties(tx, state);
    await tx.execute({
      sql: "UPDATE app_state SET data=? WHERE id=1",
      args: [JSON.stringify(state)],
    });
    await tx.execute("DROP TABLE properties");
    await tx.execute("DELETE FROM schema_migrations WHERE version=1");
    // Keep media metadata/files and the protected original snapshot for recovery.
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

export const operationalCollections = [
  "bookings",
  "unitBlocks",
  "bookingChanges",
  "supportThreads",
  "financeEntries",
] as const;
export async function readOperationalRecords(
  tx: Transaction,
  state: AppStoreState,
) {
  for (const key of operationalCollections)
    (state as unknown as Record<string, unknown>)[key] = [];
  for (const row of (
    await tx.execute("SELECT kind,data FROM operational_records ORDER BY rowid")
  ).rows) {
    const key = String(row.kind) as (typeof operationalCollections)[number];
    if (operationalCollections.includes(key))
      (state[key] as unknown[]).push(JSON.parse(String(row.data)));
  }
}
export async function writeOperationalRecords(
  tx: Transaction,
  state: AppStoreState,
) {
  for (const key of operationalCollections) {
    const values = state[key] ?? [];
    const ids = new Set(values.map((value) => value.id));
    for (const row of (
      await tx.execute({
        sql: "SELECT id FROM operational_records WHERE kind=?",
        args: [key],
      })
    ).rows)
      if (!ids.has(String(row.id)))
        await tx.execute({
          sql: "DELETE FROM operational_records WHERE kind=? AND id=?",
          args: [key, String(row.id)],
        });
    for (const value of values)
      await tx.execute({
        sql: "INSERT INTO operational_records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
        args: [key, value.id, JSON.stringify(value)],
      });
  }
}
export async function rollbackOperationsMigration(client: Client) {
  if((await client.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length)throw new Error('Run npm run db:rollback -- --offline before rolling back v2/v1.');
  const tx = await client.transaction("write");
  try {
    const state = JSON.parse(
      String(
        (await tx.execute("SELECT data FROM app_state WHERE id=1")).rows[0]
          .data,
      ),
    ) as AppStoreState;
    await readOperationalRecords(tx, state);
    await tx.execute({
      sql: "UPDATE app_state SET data=? WHERE id=1",
      args: [JSON.stringify(state)],
    });
    await tx.execute("DROP TABLE operational_records");
    await tx.execute("DELETE FROM schema_migrations WHERE version=2");
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
