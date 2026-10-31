import type { Client } from '@libsql/client';
import type { AppStoreState } from './domain.js';
import { readProperties, readOperationalRecords, writeProperties, writeOperationalRecords, operationalCollections } from './migrations.js';
import { schemaSQL, indexSQL, tables, quote } from './relational-schema.js';
import { loadState, flushState, stableJSON } from './relational-store.js';
import { comparableMigrationState, migrationDifferences, MigrationVerificationError } from './migration-verification.js';
export async function migrateRelational(client: Client) {
    const tx = await client.transaction('write');
    try {
        if ((await tx.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length) {
            await tx.commit();
            return;
        }
        const raw = (await tx.execute('SELECT data FROM app_state WHERE id=1')).rows[0];
        if (!raw)
            throw new Error('Relational migration needs the existing v2 snapshot. Nothing was changed.');
        const state = JSON.parse(String(raw.data)) as AppStoreState;
        await readProperties(tx, state);
        await readOperationalRecords(tx, state);
        state.currentUser = null;
        // Preserve the exact source as well as the untouched legacy tables; no reseeding.
        await tx.execute({ sql: 'INSERT OR IGNORE INTO migration_backups(version,data,created_at) VALUES(3,?,?)', args: [JSON.stringify(state), new Date().toISOString()] });
        await tx.execute('ALTER TABLE app_state RENAME TO legacy_app_state_v2');
        await tx.execute('ALTER TABLE properties RENAME TO legacy_properties_v2');
        await tx.execute('ALTER TABLE operational_records RENAME TO legacy_operational_records_v2');
        for (const sql of schemaSQL)
            await tx.execute(sql);
        for (const sql of indexSQL)
            await tx.execute(sql);
        const empty = await loadState(tx);
        // Some historical seed reviews refer to bookings that were never imported. Preserve
        // those identifiers explicitly in legacy_booking_id; never invent a guest/booking.
        empty.legacyReviews = new Map(state.reviews.filter(r => !state.bookings.some(b => b.id === r.bookingId)).map(r => [r.id, r.bookingId]));
        empty.state = state;
        empty.baseline = new Map(tables.map(spec => [spec.table, new Map()]));
        await flushState(tx, empty);
        const migrated = await loadState(tx);
        const expected = comparableMigrationState(state), actual = comparableMigrationState(migrated.state);
        if (stableJSON(actual) !== stableJSON(expected))
            throw new MigrationVerificationError(migrationDifferences(expected, actual));
        const violations = await tx.execute('PRAGMA foreign_key_check');
        if (violations.rows.length)
            throw new Error('Relational migration found inconsistent references. Original data and schema were rolled back.');
        await tx.execute({ sql: 'INSERT INTO schema_migrations VALUES(3,?)', args: [new Date().toISOString()] });
        await tx.commit();
    }
    catch (error) {
        await tx.rollback();
        throw error;
    }
    finally {
        tx.close();
    }
}
/** Run only with the web service AND workers stopped. Rebuilds v2 from CURRENT
 * relational rows, so edits after migration are not lost. Keep a full backup too. */
export async function rollbackRelational(client: Client) {
    const tx = await client.transaction('write');
    try {
        if (!(await tx.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length)
            throw new Error('Schema v3 is not installed.');
        const { state } = await loadState(tx);
        for (const spec of [...tables].reverse())
            await tx.execute(`DROP TABLE ${quote(spec.table)}`);
        await tx.execute('ALTER TABLE legacy_app_state_v2 RENAME TO app_state');
        await tx.execute('ALTER TABLE legacy_properties_v2 RENAME TO properties');
        await tx.execute('ALTER TABLE legacy_operational_records_v2 RENAME TO operational_records');
        await tx.execute('DELETE FROM properties');
        await tx.execute('DELETE FROM operational_records');
        await writeProperties(tx, state);
        await writeOperationalRecords(tx, state);
        const remaining = { ...state } as Partial<AppStoreState>;
        delete remaining.hostels;
        delete remaining.rentals;
        remaining.currentUser = null;
        for (const key of operationalCollections)
            delete remaining[key];
        await tx.execute({ sql: 'UPDATE app_state SET data=? WHERE id=1', args: [JSON.stringify(remaining)] });
        for (const sql of indexSQL) {
            const name = sql.match(/INDEX\s+(\w+)/)?.[1];
            if (name)
                await tx.execute(`DROP INDEX IF EXISTS ${quote(name)}`);
        }
        await tx.execute('DELETE FROM schema_migrations WHERE version=3');
        // Retain the original protected v3 migration snapshot for recovery.
        await tx.commit();
    }
    catch (error) {
        await tx.rollback();
        throw error;
    }
    finally {
        tx.close();
    }
}
