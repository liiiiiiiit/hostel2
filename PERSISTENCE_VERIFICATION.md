# Task 02 — Persistence, backup and recovery verification

## Scope and baseline

Actual default branch inspected: `codex/fix-menu-desktop-site-20261124`, `fe1a6b3f7e55f71e51dfb23a694248826b434aa1`.
Working branch: `codex/02-persistence-backup-recovery`, stacked on Task 01 `8c5f8df2d6d1fe2d148bcc05a9f52fcfb7c44ddc` (PR #12). No live system/database inspection or production changes were performed. Historical VPS paths are not treated as verified current configuration.

Inspected: `server/database.ts`, `relational-schema.ts`, `relational-store.ts`, `migrations.ts`, `relational-migration.ts`, provider/services migrations and health checks, `media.ts`, `backups.ts`, auth/session/environment configuration, CLI backup/database/upgrade/rollback commands, worker startup and media deletion, deployment/operations/staging docs, systemd templates, existing backup/migration/integrity tests and CI workflows.

## Confirmed findings and corrections

| Priority | Root cause | Correction and regression evidence |
|---|---|---|
| P1 | Local media could be deleted after SQL capture and before archive read. | `server/backups.ts` pins immutable local files under the SQL write lock, reads them after commit; independent-client deletion regression preserves the snapshot bytes. |
| P1 | No recovery verification was required before publishing a backup as successful. | `server/backup-files.ts` writes/fsyncs a private partial, decrypts, restores separately, compares every SQL value and sequence, checks media hashes/integrity/FK, then atomically publishes exclusively and writes a receipt. Truncation, corruption, wrong key and metadata mismatch tests fail closed. |
| P1 | Restart auto-migrations had no enforced verified recovery point. | Opt-in managed storage requires current verified backup for pending upgrades. `server/persistence.ts`, `database.ts` and CLI migration/rollback commands reject absent/stale recovery points; web/worker/backup shared flock and offline migration exclusive flock templates prevent cooperating writers racing migration. Legacy version-1 account/hash/booking/listing preservation and interrupted-transaction recovery tested. |
| P1 | Local backup CLI could create an empty DB at a mistyped source URL. | `assertExistingBackupSource` runs before creating the source client; missing-source test ensures no file is created. Managed runtime also refuses absent persistent DB. |
| P2 | Only registered media was exported; historical/unregistered files were omitted. | Recursive relative-path extra media included, checksummed and separately restored; nested recovery/failed-commit cleanup/retry tests. Symlinks fail instead of being followed. |
| P2 | JSON serialization of BLOB/int64 and sqlite_sequence high-water state was incomplete. | Backward-compatible tagged values and optional sequences in YHBK1; BLOB, max signed int64 and high-water 100 round-trip regression. CLI uses bigint mode. |
| P2 | Restore CLI only compared literal source/target URLs. | Canonical/symlink and media ancestor/descendant checks; existing target DB refused. Restore rechecks emptiness under transaction. |
| P2 | No integrated safe retention/scheduling, and deployments could use release-relative storage. | Opt-in exact persistent paths outside app, private services/config templates and safe copy procedure. Retention fully re-verifies candidates, preserves minimum count, skips corrupt/unverified/partial evidence, reports nonzero failure for skipped archives. |

## Database changes and compatibility

No new application table, destructive migration, stack change, credential reset or production seed was introduced. Existing core migrations v1–v3 and transactional additive provider/services upgrades are reused. Providers use existing column/index introspection; services additionally record `services-v1` in `module_migrations`. This task does not invent a competing schema version ledger.

Core and module migrations each use their existing transactions; the entire startup sequence is not one globally atomic transaction. The guard runs before migrations or environment initialization. A source/media fingerprint must match the verified archive; offline maintenance and exclusive writer lock remain required across verification and migration. On failure, stop and recover separately; do not automatically point production at an older database.

Physical relocation uses Python's SQLite backup API, never an ordinary live `.db` copy. It compares SQL schema and every user-table row, integrity/FK and all media SHA-256s, checks source unchanged and publishes `VERIFIED.json` only after fsync. The original DB/media/config remain untouched. The committed-WAL test intentionally keeps a source client open to demonstrate committed WAL content is captured; operators must still stop all production writers for the whole relocation.

Encrypted logical backups are format-compatible with existing YHBK1 archives; optional new fields preserve more data. Current project schema has no views/triggers; arbitrary custom views/triggers are explicitly refused by logical backup rather than silently lost. Physical offline copy preserves them. Managed mode is opt-in; old deployments remain compatible until the documented storage adoption is explicitly performed.

## Executed local checks

- `npm run lint`: passed (TypeScript frontend/server and API project).
- `node --import tsx --test server/persistence.test.ts server/backups.test.ts`: **15/15 passed**, including 11 new persistence tests and 4 existing backup tests.
- `npm test`: final full suite **198/198 passed**, 0 failed, 0 skipped (34.05 seconds on the final local rerun).
- `npm run build`: passed.
- `npm run test:built`: passed; production-mode HTML, 18 built asset responses, runtime identity and no staging banner leakage.
- `npm run test:isolation`: **9/9 passed**.
- `python3 -m py_compile ops/persistence/copy-storage.py`, `bash -n ops/persistence/migrate-offline.sh`, `node --check scripts/persistence-smoke.mjs`, `git diff --check`: passed.

No production DB, service, worker, Nginx, key or account was modified. Unit fixtures use temporary databases and deterministic media; no real external delivery is enabled. No dependencies were added.

## CI and operational boundaries

`.github/workflows/persistence-recovery.yml` adds fresh-runner-only managed production-path checks: WAL-safe relocation, credential/media preservation, absent-source rejection, migration/startup refusal without backup, verified offline upgrade, login/session after npm installation + build + restart, schema checks and separately restored media/database. It refuses nonempty deployment roots and cannot be used as a VPS diagnostic script.

Existing staging isolation CI is retained and exercises actual HTTPS Basic Auth, distinct cookies, staging identity, persisted upload/session after rebuild/restart, disabled worker delivery and encrypted backup/recovery. Existing browser/responsive/WebKit workflows remain enabled. See the executed CI results below; results are attributed to their tested commits.

Real VPS restart, systemd sandbox execution on the user's machine, disk/power failure injection, actual off-host backup storage/alerts and recovery time measurements are not verified. The Persian operations guide explicitly separates discovery, manual cutover, scheduling, rehearsal and rollback. JSON archives default to a 64 MiB encoded-content budget and use RAM; oversized/missing/unsupported inputs fail closed. Remote blob deletion during download may fail a backup, but cannot produce a verified-success archive. Retention verification cost grows with recovery-point count; measure production duration and capacity before scheduling.

CI first attempt (`8c6d17f`): managed persistence completed every application/recovery assertion, then the fixture cleanup waited a second time for an already-signalled child process (Node exit 13). The cleanup now clears its child reference and checks signal state; this was a smoke-harness defect, not a suppressed application failure. Rerun results follow after publication.

## Executed CLI and CI evidence

- Local isolated real CLI rehearsal: `scripts/database.ts migrate`, `check`, `scripts/backup.ts`, `verify FILE`, `restore FILE` and recovered-target `check` all passed. Historical media bytes matched and recovered DB permissions were 0600. All paths were new temporary directories, with external delivery disabled.
- Managed database `status`/`check`/rollback commands now validate persistent configuration before opening a SQL client; the regression rejects a mistyped managed URL without creating the file.
- Existing full-suite `real migration mismatches still roll back and startup never announces readiness for a failed migration` regression also passed; failure recovery is not inferred solely from a successful build or a toy SQL transaction.
- [Managed persistence CI run 45440379048](https://github.com/liiiiiiiit/hostel2/actions/runs/45440379048): **success** on code commit `8a9f9ea2e5bac55990d8de8be5a62173eb7a9162`. `npm ci`, lint, 17 focused backup/persistence/legacy/provider migration tests, build and the full managed fixed-path relocation/install/build/restart/recovery scenario passed.
- [Staging CI run 45440378851](https://github.com/liiiiiiiit/hostel2/actions/runs/45440378851): **success** on the same code commit. Includes 198 full tests, 9 environment-isolation tests, built-client checks and real HTTPS/Basic Auth Nginx + persistent staging/session/upload + separate recovery.
- [Browser/responsive CI run 45440032517](https://github.com/liiiiiiiit/hostel2/actions/runs/45440032517): **all six jobs passed** on initial implementation commit `8c6d17f3fefd0a82d06859427c94c0ce7513bc9c`: browser/provider/services/header/hero/schema workflows, fa/en/ru/hy responsive matrices and iPad WebKit. Subsequent-commit CI remains visible on PR #13; do not assume a pending run passed.

The npm install in these CI runs reported zero dependency vulnerabilities at execution time. That is a point-in-time package audit result, not a claim that the application is vulnerability-free.
