# Task 04 — database integrity

All checks use private disposable SQLite or independently marked staging databases; the Task 03 source sandbox and production database were not modified. Local persistent Task 04 sandbox: `/workspace/scratch/764e2d191d37/yh-qa04-sandbox`. Its random credential manifests are outside Git, permission 0600.

## Changes

`media_deletions` stores primary-keyed asset ID, source storage scope hash, original asset JSON and creation date. `media-cleanup-v1` records the additive migration. Initialization, migration readiness and `db:check` now include it. No existing table is rebuilt by this migration. Deletion intent and metadata removal share a write transaction; file unlink occurs only after this transaction commits. Cleanup retries use the original stored backend and key. Reattachment cancels pending deletion. A restored database/media copy cannot drain source-scoped intents.

The managed persistence guard checks this schema before opening an existing deployment. Regression tests remove the new empty table from a representative isolated prior-schema database: upgrade without verified backup is denied; upgrade with verified pre-backup succeeds, preserving previous row hashes. Integrity and foreign keys are checked after migration.

## Executed database scenarios

The full 212-test suite includes existing relational migrations, legacy imports, provider upgrades, unique constraints, transaction rollback, booking/coupon/tour concurrency, scoped reads, backup encryption/corruption/restore, demo provenance/idempotency/cleanup, and eight new regressions. New media tests inject logical and cleanup commit failures rather than relying on happy-path success. Queue restore tests verify original and copied bytes remain present. Exact command results are in QA04_TEST_RESULTS.md.

The staging smoke extends the full Task 03 dataset through real authenticated HTTPS APIs: two bounded coupon competitors for one use, two tour requests for one spot, reservation confirmation arbitration, replayed request IDs, private tracking and role isolation. It then restarts the application and verifies sessions and persisted booking/application/tour/account changes. The pre-existing staging checks also rebuild without losing data and restore a verified encrypted backup to a separate target. CI results must be recorded before marking these extended scenarios passed.

## Limitations

SQLite on the isolated filesystem was exercised; remote libSQL network failures and actual VPS filesystem/power loss were not reproduced. This is bounded concurrency testing, not a load benchmark. Foreign-key integrity does not prove every historical business invariant; synthetic fixtures and tested migration snapshots do not substitute for a read-only audit of the unavailable production database. Overdue inventory correction affects today's availability only, preserving agreed price/dates. Pending media intents in a new storage scope remain quarantined for operator review.
