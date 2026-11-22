import type { Transaction } from '@libsql/client';

/** These additive modules are outside relational-schema.ts and still need health checks. */
export const providerColumns = {
  job_postings: 'id owner_id title company location schedule description contact salary period status version created_at approved',
  job_applications: 'reference request_id fingerprint job_id name contact message submitted_at status',
  tour_listings: 'id owner_id title organizer destination departure schedule duration description contact price published hidden version created_at approved capacity',
  tour_bookings: 'reference request_id fingerprint tour_id title organizer price name contact travel_date guests notes created_at status',
  provider_accounts: 'user_id provider_role organization',
} as const;

export async function providerIntegrity(tx: Transaction) {
  const existing = new Set((await tx.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(row => String(row.name)));
  const missingTables: string[] = [], missingColumns: string[] = [];
  const counts: Record<string, number> = {};
  for (const [table, columns] of Object.entries(providerColumns)) {
    if (!existing.has(table)) { missingTables.push(table); continue; }
    const present = new Set((await tx.execute(`PRAGMA table_info(${table})`)).rows.map(row => String(row.name)));
    for (const column of columns.split(' ')) if (!present.has(column)) missingColumns.push(`${table}.${column}`);
    counts[table] = Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
  }
  const indexes = new Set((await tx.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(row => String(row.name)));
  const missingIndexes = ['tour_bookings_capacity'].filter(index => !indexes.has(index));
  const orphanedRows: Record<string, number> = {};
  if (!missingTables.length && !missingColumns.length && existing.has('users')) {
    const relationships = {
      jobsWithoutOwner: 'job_postings child LEFT JOIN users parent ON parent.id=child.owner_id WHERE parent.id IS NULL',
      toursWithoutOwner: 'tour_listings child LEFT JOIN users parent ON parent.id=child.owner_id WHERE parent.id IS NULL',
      applicationsWithoutJob: 'job_applications child LEFT JOIN job_postings parent ON parent.id=child.job_id WHERE parent.id IS NULL',
      bookingsWithoutTour: 'tour_bookings child LEFT JOIN tour_listings parent ON parent.id=child.tour_id WHERE parent.id IS NULL',
      profilesWithoutUser: 'provider_accounts child LEFT JOIN users parent ON parent.id=child.user_id WHERE parent.id IS NULL',
    };
    for (const [name, join] of Object.entries(relationships)) orphanedRows[name] = Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${join}`)).rows[0].n);
  }
  const ready = !missingTables.length && !missingColumns.length && !missingIndexes.length && Object.values(orphanedRows).every(count => count === 0);
  return { ready, missingTables, missingColumns, missingIndexes, orphanedRows, counts };
}
