# Database integrity and preservation report

## Baseline and test isolation

Baseline: `cc9cfa6fdc7f49c3dcb99c7736d5e8fa06f5c8f8` on the verified default branch `codex/provider-panels-sqlite`. Audit branch: `codex/full-stack-audit-20261122`.

All databases in this report were isolated temporary SQLite files. The production path `/var/lib/hostel2/hostel.db` is documented from the supplied deployment history, not an SSH-verified file. No production backup, migration, repair, restore, schema change or write was executed.

## Schema and relationships

- Current central schema: v3; migration history contains versions 1, 2 and 3.
- 29 central relational tables model users/credentials, property translations/images/rooms/physical units, bookings/events/allocations, maintenance, coupons, inquiries, reviews, guides/translations, phrases, audit, support, finance, saved places and settings.
- Infrastructure tables include sessions, authentication tokens, rate limits, durable outbox, media assets, protected migration snapshots and legacy tables.
- Five additive module tables: `provider_accounts`, `job_postings`, `job_applications`, `tour_listings`, `tour_bookings`.
- Central constraints enforce stable keys, case-insensitive unique user email, valid booking dates/quantities/money, property/room references, unique booking idempotency keys, linked physical units and restrictive preservation of referenced rooms.
- Provider profiles reference users with `ON DELETE CASCADE`. The four older job/tour tables lack equivalent declared parent FKs. API deletion guards preserve listings with requests; the enhanced health check detects missing owners/parents without deleting or fabricating records.
- Existing provider capacity/approval columns and capacity index are additive and retain legacy defaults.

This audit adds **no schema migration or table rebuild**. Changes are transaction scheduling, lifecycle/version checks, downgrade protection and read-only health diagnostics.

## Exact health checks executed

An isolated `DATABASE_URL=file:<temporary-directory>/db.sqlite` was passed to:

```sh
npm run db:migrate
npm run db:check
```

Observed result: versions `[1,2,3]`, `schemaReady: true`, **63 explicit indexes**, `foreignKeyViolations: 0`, `integrity_check: "ok"`, all five provider tables ready, and zero owner/parent orphan counts.

The health checker now validates required provider columns and `tour_bookings_capacity`, and reports table counts without exposing identities, hashes or guest details.

Two deliberate isolated defects reproduced false readiness in the baseline: a missing `job_applications` table and a job referencing an absent owner. Both now cause a nonzero `db:check` exit while preserving the user count and existing records.

## Atomicity, inventory and concurrency evidence

| Scenario | Executed evidence and outcome |
| --- | --- |
| Last private hostel room | Existing API test uses two independent API/database instances; only one confirmation succeeds |
| Daily capacity and assigned hostel boundaries | Existing concurrent confirmation, daily override and unrelated-manager tests pass |
| Maintenance plus confirmed bookings | Capacity edits count both; physical assignments reject occupied/overdue beds and incompatible historical unit removal |
| Last tour place | New independent-server race accepts one request and SQL `SUM(guests)` remains at capacity 1 |
| Duplicate job application | Two API instances submit the same request ID; both receive the same reference and SQL stores one row |
| Tour/job retries | Fingerprint mismatches reject changed retries; version/status/publication/moderation checks remain in SQL predicates |
| Single-use coupon | New independent-server race yields one accepted discounted booking, `used_count=1`, one coupon-bearing booking |
| Concurrent property editors | Versioned API writes accept one edit and reject the stale second edit; persisted winning fields remain intact |
| Concurrent workers | Two independent clients claim one durable message; exactly one mocked delivery and persisted `sent` status |
| Simultaneous local initialization | New worker test originally failed with `SQLITE_BUSY`; shared initialization/write gate corrects the same reproduction |
| Failed operations and migration | Existing transaction/migration tests assert rollback, retained original schema and failed-startup behavior |

The shared gate is process-local, keyed by the configured/normalized database location. Across separate Node processes, SQLite remains the locking authority. Local same-file multi-client races are tested; arbitrary remote-libSQL/network failover and sustained multi-process load are not claimed as tested.

Current property editors use compare-and-swap. To preserve API compatibility, old one-argument administrative property saves remain unconditional. Legacy clients must be refreshed/upgraded for editor conflict detection.

## Migration preservation

Executed suites include:

- `server/migrations.test.ts`: property/operations migration and rollback preserve later edits and can migrate forward again.
- `server/relational.test.ts`: legacy entities, optional attributes, translations, historical unresolved review references and saved places survive v3 migration; invalid data causes an atomic refusal rather than partial replacement.
- `server/provider-migration.test.ts`: captures every original column/row in every pre-upgrade table, runs the additive upgrade twice, compares preserved rows, verifies old scrypt credentials, retained job/tour identifiers and SQLite integrity.
- New downgrade regression: v3-to-v2 refuses before any table change when provider profiles exist. This prevents the old user-table drop cascading into profile deletion.

`provider-upgrade.ts --offline` remains an offline verification utility: it compares checksums/counts of all pre-existing table columns inside a write transaction before committing additive changes. It was reviewed, and the equivalent provider migration preservation suite was executed. It was not run against the live VPS.

## Backup and restoration

Executed `server/backups.test.ts` covers:

1. Authenticated AES-256-GCM encrypted backup and tamper rejection.
2. Restoration only into a separate empty target; refusal to overwrite an existing database/media directory.
3. Local media checksum checks and restoration.
4. Mocked cloud restore with new object keys and rewritten references.
5. Simulated commit failure, removal of newly written restore files, empty-target rollback and successful retry.
6. **New full SQL round trip**: compare every column and row of every exported table after restore, including provider profiles, job/tour listings and requests, credential hashes/salts, session digests and historical tables. Final SQLite integrity and FK checks pass.

Real production backups must include the active SQLite database using SQLite's backup API, uploaded media outside the application directory, and the protected environment/configuration needed for recovery. Store encryption keys separately from encrypted files.

## Persistence and residual risks

- Provider browser flows restart the server against the same temporary file and verify sessions, applicant review status, confirmed tour booking and private guest tracking persist.
- Existing independent-browser API/browser flows cover booking references, account state, saved places, published properties, prices and reception/finance persistence.
- No data-preservation assertion is based on copying or inspecting actual customer records; the production database remains unexamined.
- A production copy may contain historical inconsistencies absent from fixtures. The strengthened checker deliberately stops on them; it does not guess relationships or delete orphan records.
- Never roll back to v2 with provider profiles, drop/reseed tables, or restore an older backup over new production requests as a routine code rollback. Follow `SAFE_DEPLOYMENT_PLAN.md`.
