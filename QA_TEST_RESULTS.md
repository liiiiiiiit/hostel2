# QA execution results

## Baseline, environment and safety

Baseline: `cc9cfa6fdc7f49c3dcb99c7736d5e8fa06f5c8f8`; branch: `codex/full-stack-audit-20261122`.
Runtime used: Node.js 24.22.3, npm 11.19.1. Browser engines: Chromium 153.0.8010.0 and Playwright WebKit 27.2/build 2370 (headless WPE).

Tests use temporary SQLite files and non-production fixtures. External notification/translation providers are mocked; external resources are blocked where deterministic layout tests require offline behavior. No live booking, production account, production database, live VPS deployment or customer notification was created.

## Commands and results

| Command | Executed result |
| --- | --- |
| `npm ci` | Pass; clean install from committed lockfile |
| `npm audit --json` | Zero known vulnerabilities: 0 critical/high/moderate/low; no dependency upgrade or new runtime dependency needed |
| Baseline `npm run lint` | Pass: frontend/server and API TypeScript checks |
| Baseline `npm test` | **154 passed, 0 failed**; 27,408 ms |
| Baseline `npm run build` | Pass |
| Final `npm run lint` | Pass after source corrections |
| Final `npm test` | **168 passed, 0 failed, 0 skipped**; 30,004 ms |
| Final `npm run build` | Pass; main bundle about 439.97 kB, 139.23 kB gzip; view chunks remain split |
| `npm run test:browser` | Pass on final build; complete existing browser workflow suite, no uncaught browser errors |
| New `npm run test:providers` | Pass: both full provider lifecycles, moderation, mobile guest forms, status changes, admin oversight and restart persistence |
| `npm run test:hero` | Pass: EN/FA/RU/HY, 320/390/820/1440px, six slides at 125% text, corrected header geometry, touch/keyboard/RTL, clock pause/resume, reduced motion and six actual CTA routes |
| `npm run test:responsive` | Baseline completed 2,496 states and exposed 18 header overlaps; corrected final matrix status below |
| `npm run test:ipad` | Pass after supplying the browser's missing environment libraries: **200 WebKit form layouts and 40 date/search flows**; final repeat status below |
| `npm run db:migrate`, `npm run db:check` | Pass on a dedicated temporary file; schema v3/provider readiness, integrity `ok`, no FK/orphan violations |
| `bash -n ops/deploy-provider-sqlite.sh` | Pass; no deployment execution |
| `git diff --check` | Pass |

### Final responsive matrix

**Pass: 2,496 responsive states; 624 per language, 12 widths per language; zero overflow/header-overlap failures and zero uncaught page errors.**

All specified widths are included: 320, 360, 390, 430, 640, 768, 820, 1024 and 1366; the existing suite also covers 980, 1280 and 1440. Public pages, language/auth menus, both themes, six enlarged-text slides, admin/manager workspaces and traveler account layouts are inspected for overflow and header overlap.

To avoid rebuilding the shared output while another browser is using it, the final matrix used one completed build and separate per-language processes:

```sh
BROWSER_PATH=<chromium> RESPONSIVE_LANGUAGES=fa RESPONSIVE_OFFLINE=true \
  BROWSER_ARTIFACTS_DIR=test-artifacts/final-responsive-fa npm run test:responsive

# After that command's build had finished, each other language used the same dist:
BROWSER_PATH=<chromium> RESPONSIVE_LANGUAGES=en RESPONSIVE_OFFLINE=true \
  BROWSER_ARTIFACTS_DIR=test-artifacts/final-responsive-en node scripts/responsive-smoke.mjs
# Repeat identically for ru and hy; each has a separate artifact directory and database.
```

Final WebKit repeat: **Pass: 200 form-layout checks and 40 date/search flows; zero uncaught WebKit errors.**

The WebKit matrix uses iPad emulation at 768, 810, 820, 834, 1024, 1080, 1112, 1180, 1194 and 1366px, four languages, light/dark hostel/rental forms, enlarged text, native date fill, check-out adjustment and real search URL parameters.

## Confirmed failures retained as audit evidence

| Before correction | Reproduction outcome | Corrected verification |
| --- | --- | --- |
| Old provider recovery token after admin reset | Reset succeeded with superseded token | Rejected; replacement password works |
| Changed provider email | Old verification timestamp and links remained | Verification cleared and tokens invalidated |
| Tour edit omitted capacity | Stored limit changed from 2 to 100,000 | Stored limit remains 2 |
| Rollback with provider profiles | Unexpectedly succeeded, enabling cascade deletion | Refused; profiles and integrity unchanged |
| `db:check` missing provider table | Exit 0 / ready | Exit 1 / missing table reported |
| `db:check` orphaned job owner | Exit 0 / ready | Exit 1 / orphan count reported |
| Two stale property editors | Second save overwrote first | Versioned second save rejected; winning fields retained |
| Independent local database startup/worker race | `SQLITE_BUSY`, 5,114 ms | Corrected worker race passes; one mocked delivery |
| 320px enlarged EN/RU/HY header | 18 overlap states in full responsive run | Narrow-width spacing fix plus extended hero/full responsive regression |

An initial browser attempt timed out while builds were being run concurrently against the same output directory. It is not counted as a passing run. The subsequent complete baseline matrix exposed the real header failures above; final runs share a stable build. Early new-provider harness failures were corrected to wait for lazy-loaded navigation and use the application's actual private hash routes; they were not classified as product defects.

The standard Chromium download was denied by the environment's download route. A temporary npm-distributed Chromium binary was used through `BROWSER_PATH`; no browser dependency was added to the application. WebKit downloaded successfully from an alternate official mirror, but host libraries were missing. Matching Debian libraries were extracted into its temporary browser bundle, then real WebKit was launched and exercised. `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` avoided the broad GTK dependency precheck only after the headless engine could launch. Application assertions, authorization, layouts and test failures were not bypassed. Ordinary CI uses `playwright-core ... install --with-deps webkit`.

## Coverage by critical workflow

| Module | Evidence |
| --- | --- |
| Booking and inventory | API/domain tests for dates, occupants, unit/bed pricing, confirmed inventory, coupon use/release, idempotent retry, immutable agreements, last-room races and cancellation; browser booking/tracking and double-room workflows |
| Reception and finance | API and browser tests for external booking, physical units, maintenance, check-in/out, overdue guests, stay changes, support and actual payment entries separate from booking price |
| Accounts | Session cookie flags, login failures/rate limits, expiry/logout/revocation, register/reopen, recovery/verification, profile and saved-state browser persistence |
| Providers/jobs/tours | Admin account UI; unified login; provider creation; approval before public display; guest forms; scoped review/confirmation; disabled accounts/password replacement; cross-provider/API ownership attacks; server restart |
| Rentals | Real editor publication, public-map coordinates, internal address redaction, conditional date/duration validation, inquiry token visibility and tracking |
| Articles/reviews/settings | Article input/slug/translation validation, escaped public metadata, review eligibility/moderation, administrative permission tests; dashboard tabs inspected by responsive suite |
| Maps/media | Coordinate/provider URL tests; browser map-point checks; admin-only upload; byte validation/conversion; rejection of referenced-image deletion; no claim of third-party map-network availability |
| Translator | Offline phrase matching, whole-text rather than substring replacement, input limits, missing-provider/failed-provider handling, mock server provider and offline browser use |
| Workers/notifications | Reminder/expiration/escalation once, failed/final-attempt handling, durable outbox, asynchronous booking response, concurrent claims and mock delivery |
| Database/migrations/backups | v1/v2/v3/additive-provider preservation, transactional failure rollback, schema diagnostics, full-table snapshot round trip, encrypted/tampered/failed restore cases |
| Responsiveness/accessibility | Four languages/directions, mobile/tablet/desktop, enlarged text, keyboard/escape, native dates, touch/swipe, reduced motion and desktop/mobile dashboard navigation |

## Concurrency and performance observations

New tests use separate API/database instances for the final tour place, duplicate application ID, single-use coupon and versioned property edits. Independent worker clients share a database and deliver one leased mocked notification. Existing tests cover two-server last-room confirmations, daily availability, physical occupancy and archived unit references. The tests assert persisted SQL counts and values, not only UI success messages.

Forty measured local public API reads after five warm-ups per sample revision produced:

| Measurement | Baseline | Early corrected revision |
| --- | --- | --- |
| p50 | 14.76 ms | 14.95 ms |
| p95 | 32.52 ms | 27.36 ms |
| Response | 99,906 bytes | 99,906 bytes |
| Observed RSS | 269 MiB | 247 MiB |

These small same-host samples are descriptive, not evidence of a statistically significant optimization, production capacity, or absence of memory leaks. The relational test also checks an indexed availability query with 300 historical bookings without loading private historical booking rows into the public response path.

## Limits on acceptance claims

- The real VPS, its database contents, remote libSQL network behavior, Nginx/TLS, backup schedule and real notification providers were not accessed or verified.
- Browser emulation includes a genuine WebKit engine, but not a physical iPad or Android handset.
- Native-language translation quality and live AI translations require provider configuration/native review; mocks establish contracts and failure behavior only.
- There is no registered job-seeker application dashboard; the supported guest/private-reference workflow is what was tested.
- Older unversioned administrative property API calls retain last-write-wins compatibility. Current property editors submit revisions.
- No coverage percentage, formal proof, exhaustive button-by-button manual audit, load-capacity guarantee, penetration-test certificate or claim of complete security is made.
