# YEREVANHUB full-stack audit and corrective implementation

## Verified baseline and safety boundary

- Audit date: 2026-11-22.
- Repository: `liiiiiiiit/hostel2`.
- GitHub repository metadata and `git remote show origin` both identify **`codex/provider-panels-sqlite` as the actual default branch**. It is not currently `main`.
- Verified remote baseline: **`cc9cfa6fdc7f49c3dcb99c7736d5e8fa06f5c8f8`**.
- Working branch: **`codex/full-stack-audit-20261122`**, created directly from that fetched commit.
- The baseline has 264 tracked files. Runtime databases, uploaded files, credentials and environment files are not committed.
- All write tests ran on fresh temporary SQLite databases. No production database, VPS configuration, customer record, or live reservation was modified. No production deployment was performed.
- Existing React/TypeScript/Vite/Express/Node/SQLite/libSQL architecture and branding are retained. No runtime dependency was added.

## Architecture and principal files inspected

| Layer | Implementation and audit scope |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4; `src/App.tsx`, `src/main.tsx`, `src/services/store.ts`, language/saved-place contexts, routing and startup handling |
| Public views | `HomeView`, `HostelsView`, `HostelDetailView`, `RentalsView`, `RentalDetailView`, booking/rental tracking, jobs, tours, articles/guides, translator, recommendations and static pages |
| Panels and forms | `AdminPanelView`, `ManagerPanelView`, `TravelerAccountView`, property editor, reception/finance/operations, provider accounts, job applications, tour bookings, authentication and account settings |
| HTTP/API | `server/dev.ts`, `server/api.ts`, `api/app.ts`, API schemas, session/origin checks, body limits, error mapping, media and worker endpoints |
| Business logic | `server/domain.ts`, `server/operations.ts`, job/tour modules and `src/utils/{pricing,occupancy,dates,rental-inquiries,properties,public-routes,navigation,public-seo}.ts` |
| Persistence | `server/database.ts`, `repository.ts`, `relational-store.ts`, `relational-schema.ts`, property/relational/provider migrations and verification |
| Identity/security | `accounts.ts`, `passwords.ts`, `auth-schema.ts`, `session-config.ts`, `provider-accounts.ts`, public-state redaction and account/token storage |
| Operations | `jobs.ts`, `notifications.ts`, `media.ts`, `backups.ts`, worker/backup/database/provider-upgrade scripts, `ops/cron.example`, deployment script and environment example |
| Tests/CI | Existing unit/integration/API/migration/backup suites; browser, responsive, iPad and hero scripts; `.github/workflows/browser-audit.yml`; new provider browser coverage |

This is a focused examination of runtime code and workflows supported by executable tests, not a claim that every possible path through every file has been formally verified. `server/db.ts` is an older JSON prototype implementation; the production entry points use `server/database.ts`. It was left untouched rather than deleting historical code during this audit.

### Database and authentication model

The live code uses relational schema v3 with 29 declared domain tables, infrastructure/legacy migration tables, and five additive provider/job/tour tables. It does not use PostgreSQL or an ORM. SQL predicates are parameterized; schema/table identifiers are selected from internal allowlists.

SQLite connections enforce foreign keys. Local database initialization enables WAL and a five-second busy timeout. Domain writes run inside write transactions, load scoped records, and flush only changed selected rows. Accepted reservation pricing/conditions are frozen in booking agreements.

Passwords use salted scrypt verifiers. Browser sessions use random tokens; only SHA-256 token digests are stored in SQL. Sessions expire after seven days and account activation is checked again on server requests. Production cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` with a `__Host-` name. The explicit HTTP-test mode is a separate compatibility option, not an HTTPS deployment recommendation.

The underlying user table has admin, hostel-manager and traveler roles. Specialized provider accounts are an additive `provider_accounts` overlay; changing the underlying role constraint or rewriting existing users is unnecessary.

## Confirmed defects and corrections

### AUD-01 — P1: administrative password resets left recovery links valid

- Location: `server/provider-accounts.ts:44–62` (`saveProvider`).
- Reproduction: issue an unexpired password token for a provider; reset that account's password as administrator; redeem the old token. The baseline accepted it and overwrote the administrator's replacement password.
- Root cause: provider edits revoked sessions but did not invalidate `auth_tokens`.
- Fix: password changes and account disabling mark outstanding authentication tokens used in the same transaction as the account change. Sessions remain revoked.
- Regression: `administrator provider password resets invalidate previously issued recovery tokens` in `server/api.test.ts`. Failed before correction; passes afterward. The replacement password remains usable.

### AUD-02 — P1: provider email changes retained verification of the old address

- Location: `server/provider-accounts.ts:50–62`.
- Reproduction: mark the old email verified; change the provider email administratively; inspect verification and old authentication links. Verification remained set for the new address and old links remained active.
- Root cause: the SQL update changed email without clearing `email_verified_at` or retiring issued tokens.
- Fix: clear verification only when the address changes, invalidate outstanding tokens on identity/password/activation changes, and retain account IDs, credentials and owned content.
- Regression: `provider email changes clear verification and revoke tokens, while disabling cannot leave reusable recovery links` in `server/api.test.ts`.

### AUD-03 — P1: legacy schema rollback could delete provider profiles

- Location: `server/relational-migration.ts:62–66`.
- Reproduction: create a provider profile, then run the old v3-to-v2 rollback against the temporary database. The baseline accepted the rollback; dropping `users` cascaded into the newer profile table.
- Root cause: the old rollback table inventory predates provider accounts and v2 cannot represent their role overlay.
- Fix: refuse that downgrade before changing any table if provider profiles exist. Compatible application-code rollback remains possible without rewriting the database.
- Regression: `legacy rollback refuses to cascade-delete provider account profiles` in `server/relational.test.ts`; verifies unchanged profiles and SQLite integrity after refusal.
- No profiles are exported into invented legacy users and none are deleted to make a downgrade pass.

### AUD-04 — P1: an unrelated tour edit could silently increase capacity

- Location: `server/tours.ts:27–34`.
- Reproduction: create a tour with capacity 2; update its title through a legacy-compatible payload omitting capacity. The baseline changed capacity to 100,000.
- Root cause: the additive-field default was reapplied on updates instead of retaining the stored value.
- Fix: load the authorized, version-matched existing row and preserve its capacity when omitted. The default remains limited to creation/legacy initialization. Existing booking-count protection and optimistic tour versions remain enforced.
- Regression: `legacy tour edits that omit capacity preserve the existing booking limit` in `server/api.test.ts`.

### AUD-05 — P2: database health checks ignored provider schema and orphaned records

- Locations: `scripts/database.ts:45–49`, new `server/provider-integrity.ts`.
- Reproduction: drop `job_applications`, or insert a job with a missing owner into an isolated database. The original `db:check` exited successfully in both cases.
- Root cause: readiness checked only the central relational table list. Provider modules are outside that list and four of their tables do not have declared foreign keys.
- Fix: check all five module tables, required columns, the capacity index, row counts and owner/parent relationships. Missing schema or orphan counts now make `schemaReady` false and `db:check` fail. Diagnostics expose counts, not private record contents.
- Regression: both scenarios in `server/database-check.test.ts`; checks do not repair/delete records silently.

### AUD-06 — P2: stale property editors could overwrite a newer save

- Locations: `server/domain.ts:811–832`, `server/api.ts` property tuples, `src/services/store.ts`, `src/components/PropertyManagementPanel.tsx:34,57–61`.
- Reproduction: open two copies of a property revision, save the first, then save the second with a different value. The baseline overwrote the first editor's change.
- Fix: the current editor submits its original server revision; the server checks it inside the write transaction. Saves use monotonic timestamps, and the editor adopts the persisted response revision after successful saves. The API adapter omits an absent optional revision instead of serializing it as invalid `null` on creation.
- Regressions: stale hostel/rental domain tests, concurrent API property-edit test, optional-argument adapter test, and the existing browser property-creation/editing flows.
- Compatibility: the optional argument preserves the old one-argument API. Old clients or deliberate unversioned administrator API calls retain last-write-wins behavior; this is explicitly not a claim that every legacy caller now performs compare-and-swap.

### AUD-07 — P1: independent database clients could deadlock local startup/writes

- Locations: `server/database.ts:25–37,101,119–123`; new `server/database-write-queue.ts`.
- Reproduction: initialize two clients on the same fresh database in one Node process, then run concurrent worker claims. The baseline stalled for approximately five seconds and failed in migration with `SQLITE_BUSY`.
- Root cause: local SQLite lock acquisition is synchronous, but each `Database` instance had its own asynchronous queue. One connection could block the event loop needed by the other writer to commit. Initialization was not queued with writes.
- Fix: share a database-keyed write gate across instances, including initialization. Local absolute/relative file paths are normalized. Failed writes do not poison the queue; reference counting releases unused gates. Cross-process isolation continues to rely on SQLite transactions/WAL/busy-timeout.
- Regression: concurrent independent worker test now passes with exactly one mocked delivery. Independent API tests also exercise last-tour-place allocation, duplicate application IDs, single-use coupon redemption and versioned property edits.
- Observation: the originally failing worker reproduction took 5,114 ms; the corrected isolated run completed in 121 ms. This is a fault-recovery observation, not a general throughput benchmark.

### AUD-08 — P2: 320px header overlap with enlarged text

- Locations: `src/components/header.css:192–198`; `scripts/hero-carousel-smoke.mjs` geometry assertion.
- Reproduction: the comprehensive responsive suite found 18 failures: the six enlarged-text hero states at 320px in EN/RU/HY had overlapping brand/controls. There were no uncaught JavaScript exceptions.
- Fix: reduce only horizontal gaps/padding below 360px. All controls keep 44px touch targets; colors, logo and brand remain unchanged.
- Regression: hero geometry checks now include the header at 125% text, and the full responsive matrix is rerun after the fix.

## Permission matrix — actual implemented behavior

| Operation | Anonymous | Traveler | Hostel manager | Job provider | Tour provider | Administrator |
| --- | --- | --- | --- | --- | --- | --- |
| Public published listings/guides | Yes | Yes | Yes | Yes | Yes | Yes, plus drafts |
| Submit hostel/rental/job/tour requests | Yes, validated | Yes | Public workflow | Public workflow | Public workflow | Public workflow |
| Track a guest request | Exact private token/reference | Exact token; owned hostel stays also in account | Assigned hostel stays | Own job applications | Own tour bookings | All supported records |
| Hostel availability, arrival guide, reception | No | No | Assigned properties | No | No | All |
| Full hostel/rental listing editor, publication | No | No | No full admin editor | No | No | Yes |
| Create provider accounts/reset/disable | No | No | No | No | No | Yes |
| Job CRUD and applicant statuses | No | No* | No* | Own only | No | All |
| Tour CRUD and booking statuses | No | No* | No* | No | Own only | All |
| Property verification/coupons/articles/settings | No | No | Restricted operational actions only | No | No | Yes |
| Media upload/delete and notification administration | No | No | No | No | No | Yes |
| Profile/password/saved places | No account | Own | Own | Own | Own | Own |

`*` Historical owners retain access to listings they already owned under the previous model. Newly created specialized provider accounts have strict cross-provider role boundaries. This compatibility exception was inspected and retained, not silently removed.

## Functional/security verification and remaining gaps

- Hostel flow: search, room/date/occupancy pricing, pending request, confirmation, coupon rules, cancellation, reception/physical units, actual check-in/out, stay changes, reviews, support and financial entries have unit/API/browser coverage. Confirmed reservations consume inventory; pending requests are rechecked on confirmation rather than pretending they are guaranteed allocations.
- Rentals: admin publication, public inquiries/tracking, date/duration checks, private-address redaction, images and coordinate-based map URLs have coverage.
- Jobs/tours: complete real-form provider workflows, moderation before public display, requests, status management, ownership boundaries and restart persistence have browser/API coverage.
- Registration, sessions, password recovery, verification, profile editing and saved-place synchronization have integration/browser coverage. Provider lifecycle defects above are fixed.
- SQL injection: reviewed parameterized mutation/query boundaries and allowlists. XSS: React text rendering and escaped public HTML/metadata; malicious text/metadata regression coverage exists. CSRF: tested origin/custom-header enforcement. IDOR/privilege escalation: tested unrelated managers, travelers, providers and exact guest-token boundaries. Uploads: actual-byte validation, metadata stripping, bounded conversion and detached-only deletion are tested.
- No automated vulnerability scanner or penetration test against the public VPS was performed. Dependency metadata reported zero known npm vulnerabilities when executed; that is not a guarantee of security.
- The job applicant flow is a **guest application plus private-reference tracker**. A registered job-seeker dashboard linking applications to user accounts is not implemented. It must not be described as verified or equivalent to a full applicant account system.
- Tour capacity is per requested date; schedule/duration are free text. A structured departure calendar, waitlist or payment system is not present. Tour listings currently have no dedicated image field. These are product gaps, not features silently invented in this audit.
- Existing provider tables without declared FKs still rely on transactional APIs for normal mutations. Health checks now detect orphaned relationships; no risky historical-table rebuild was introduced.
- Free-text translation uses the configured server-side AI provider; it is not a local-only translator. Offline phrasebook requests do not need that provider.
- Real email/Telegram delivery, hosted libSQL behavior, Gemini translation quality, external map rendering and actual physical Android/iPad behavior remain environment/integration checks. Tests use mocks/offline routing or desktop/mobile/WebKit emulation as documented in the QA report.
- VPS filesystem permissions, service environment, HTTPS/Nginx and installed cron/timers could not be verified through SSH. Production readiness therefore remains conditional on the deployment preflight and operator checks.

## Performance and maintainability

A controlled local public-API benchmark used 5 warm-up plus 40 measured reads per revision on separate temporary databases. Baseline p50/p95: **14.76/32.52 ms**; corrected early-audit run: **14.95/27.36 ms**; response size **99,906 bytes** in both. Runs share host noise and do not establish a statistically meaningful latency improvement. Final correctness changes are not advertised as a scalability rewrite.

The relational suite verifies that availability uses the inventory index and loads no private historical booking rows with a 300-record historical fixture. The final main bundle is approximately **440 kB / 139 kB gzip**, with views split into separate chunks. Large catalogues/admin snapshots remain a future pagination/load-testing concern; there was no unmeasured rewrite or new dependency.

CI now includes provider lifecycle/restart flows, hero behavior and an isolated database migration/health check in addition to existing unit, responsive and WebKit jobs. See the other three reports for exact results, preservation evidence and deployment/rollback boundaries.

## Changed files

- Runtime/security/data: `server/api.ts`, `server/database.ts`, `server/database-write-queue.ts`, `server/domain.ts`, `server/provider-accounts.ts`, `server/provider-integrity.ts`, `server/tours.ts`, `server/relational-migration.ts`, `scripts/database.ts`.
- Frontend corrections: `src/components/PropertyManagementPanel.tsx`, `src/components/header.css`, `src/services/store.ts`.
- Regression and browser coverage: `server/api.test.ts`, `server/domain.test.ts`, `server/relational.test.ts`, `server/database-check.test.ts`, `server/backups.test.ts`, `server/notifications.test.ts`, `src/services/store.test.ts`, `scripts/hero-carousel-smoke.mjs`, `scripts/provider-browser-smoke.mjs`.
- CI/deployment: `.github/workflows/browser-audit.yml`, `package.json`, `ops/deploy-provider-sqlite.sh`. The deployment helper now permits a validated full branch ref or reviewed commit SHA; its default behavior is unchanged.
- Reports: `FULL_STACK_AUDIT.md`, `DATABASE_INTEGRITY_REPORT.md`, `QA_TEST_RESULTS.md`, `SAFE_DEPLOYMENT_PLAN.md`.
