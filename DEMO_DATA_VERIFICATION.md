# Task 03 — Synthetic ecosystem implementation and verification

## Verified baseline and implementation

Actual default branch inspected: `codex/fix-menu-desktop-site-20261124`, commit `fe1a6b3f7e55f71e51dfb23a694248826b434aa1`. Working branch `codex/03-demo-data-manager` is stacked on Task 02 `e9f9f50a6b5a381c244674747fcae9a868f60d0c` to preserve explicit environment isolation and backup safety. No SSH, production database access or live deployment was performed.

Inspected core relational schema/storage/migrations, existing seed/property factories, Store/domain validation, property publication/occupancy/pricing, reception operations, reviews, account hashing/session/auth, provider profiles and ownership, jobs/applications, tours/bookings, services, articles, API schemas/rate limits, admin navigation/i18n and staging units/proxy/CI.

New components:

- `server/demo/{safety,fixtures,provenance,counts,materialize,manager,routes}.ts`: strict isolated targets; deterministic offline recipes; native service orchestration; actual SQL counts; transactional import and conservative selected-batch cleanup.
- `demo_batches` and `demo_records`, version marker `demo-v1`, created transactionally only after isolated DB identity and active persisted-admin checks. Recipes/provenance are persistent SQLite data, not browser mocks or temporary seed JSON files.
- `scripts/demo.ts` and five npm commands; 0600 manifests outside Git/app; random passwords and scrypt credentials, UUID identities, reserved-domain email, local Sharp-generated WebP.
- `DemoDataManager.tsx`, client-safe shared count definitions, four-language labels and staging-only admin integration. Existing design and public production UI remain unchanged.
- Extended existing staging CI with full synthetic generation, actual HTTPS-protected UI flows, restart/rebuild, backup and separate recovery. The fixed-path harness refuses pre-existing deployment data and only runs on disposable GitHub Actions runners.

## Confirmed defects found during implementation

1. **P2 — equal SQL sort ranks caused no-op persistence to rewrite unrelated users/credentials.** Additive provider inserts use default rank zero. `orderRows` treated equal ranks as a requested reorder (`<=`), so repeat import or importing an unrelated batch could renumber existing rows. It now compares existing key sequence with the requested sequence. Full ecosystem idempotency and second-batch preservation tests reproduced the failure and pass after the fix; existing photo/reorder/scoped-write regressions also pass.
2. **P2 — ordinary audit retention could prune old batches while bulk seeding.** Both Store and relational flush enforce the normal 500-entry cap. Explicit internal fixture options preserve existing audit rows during import. Normal API retention remains unchanged; provenance tolerates already-retained-away audit rows only, never edited/missing business records. No production authorization or validation is bypassed.
3. An initial fixture used a date-only rental visit. The actual existing workflow requires Yerevan `datetime-local`. The fixture was corrected to `YYYY-MM-DDT14:00`; the failed import rolled back all domain changes and its newly created image. This was corrected fixture input, not a relaxation of validation.

Historical stays use injected Store clock/identity dependencies with unchanged production defaults. Reception/date checks still execute, and global Date/timers are never patched. UUID strategies apply only in the explicit internal synthetic workflow. Passwords/salts and private tracking tokens remain cryptographically random.

## Actual persistent execution

Executed the real npm CLI in a new private authorized sandbox outside the repository:

`/workspace/scratch/764e2d191d37/yh-demo-task03`

This is an execution-workspace testing sandbox, **not the user's VPS staging**. Actual APP_ENV was `testing`, delivery disabled, local SQLite/media only, no external credentials. The same code is tested against actual `APP_ENV=staging` paths/proxy in disposable CI.

Active imported batch: `2b7a3776-74cc-40df-aeb1-91be949af930`, seed `yerevanhub-task03-verified`.

Actual database: `/workspace/scratch/764e2d191d37/yh-demo-task03/staging.db`.
Protected account manifest: `/workspace/scratch/764e2d191d37/yh-demo-task03/demo/2b7a3776-74cc-40df-aeb1-91be949af930.demo-manifest.json`.
Protected bootstrap-admin manifest: same private directory, `bootstrap.demo-manifest.json`. Neither manifest or DB is committed/published. Counts-only execution summary: `generation-summary.json` inside the same sandbox.

| Entity | Actual imported count |
|---|---:|
| Hostel managers | 10 |
| Hostels | 15 |
| Room types | 60 |
| Physical beds/rooms | 240 |
| Traveler accounts (excluding provider profiles) | 30 |
| Rentals / rental inquiries | 20 / 30 |
| Employers / jobs | 15 / 30 |
| Distinct guest applicant contacts / applications | 40 / 80 |
| Tour providers / tours / bookings | 10 / 20 / 40 |
| Services / requests | 40 / 30 |
| Hostel reservations / eligible reviews | 60 / 40 |
| Articles / translation rows | 20 / 60 |
| Coupons | 10 |
| Functional generated accounts / credentials | 65 / 65 |
| Tracked new SQL rows, including children/audit | 2,564 |

Additionally, all 65 password verifiers in this persistent sandbox were verified and the bootstrap admin plus one generated account of each supported role logged in through the real API. Provenance remained unchanged after those logins.

All counts were checked against persisted rows, including effective account roles and distinct applicant contacts, not merely echoed from requested configuration. `PRAGMA integrity_check` and `foreign_key_check` passed. A prior isolated synthetic batch was safely cleaned (2,564 rows); the existing administrator, pre-batch rows and protected media evidence remained. Its metadata persists as cleaned. The active batch remains imported and persistent.

## Executed checks

- `npm run lint`: passed, frontend/server and API TypeScript projects.
- `node --import tsx --test server/demo.test.ts server/relational.test.ts`: 18/18 passed.
- `node --import tsx --test server/demo.test.ts`: 6/6 passed; default full ecosystem, all 65 password verifiers, schema/relationship/count preservation, concurrent repeat imports, restart, private manifests, collision/tampering/injected-failure rollback, selected cleanup, other-batch preservation, session revocation, saved-place protection, generated-role real API login, owner isolation, forged Origin and production route absence.
- `npm test`: 204/204 passed (30.67 seconds at the final pre-publication full-suite checkpoint); CI evidence is recorded in PR checks.
- `npm run build`: passed.
- `npm run test:built`: passed, production-built HTML and 18 actual JS/CSS responses, environment identity/no staging UI leakage.
- Actual CLI `demo:seed -- --init`, `demo:generate`, `demo:status`, `demo:validate`, repeat import and confirmed selected `demo:cleanup` executed against isolated SQLite. Successful full run and post-cleanup fresh seed counts shown above.
- New `.mjs` scripts passed syntax checks; `git diff --check` passed. No runtime dependencies or package lock changes were introduced.

## Remaining operational boundaries

No claim of populated VPS staging is made. Run the Persian staging instructions after reviewing the dependent branches. The execution sandbox and CI-generated plaintext test manifests are private and are not uploaded as public CI artifacts. On a real staging server, its persistent demo directory survives rebuild/service/VPS restart; actual VPS reboot has not been performed here.

UI/HTTP batch import is synchronous, with a transaction and replay-safe status. Large custom counts should use CLI in a quiet staging window. After a network/proxy timeout, inspect batch status rather than assuming success or rollback. Whole-batch metadata persists; no async import queue is claimed.

Cleanup deliberately refuses edited or externally referenced records; no force cleanup is supplied. Placeholder files/private manifests remain as recovery evidence, avoiding filesystem deletion that cannot roll back with SQL. A separate physical GC policy is future work. Normal application workers can change pending records; such batches are preserved as changed, not force-deleted.

The account model has no independent registered job-seeker/resume dashboard, rental-owner or service-provider role. Guest applicant personas persist through real application contacts and the stored recipe; 40 extra fictitious account roles were not invented. Jobs/tours have single-language content fields today; localization is provided only where the actual model supports it. Optional AI assistance accepts validated offline plain-text enrichment; staging never calls a live model/provider.
