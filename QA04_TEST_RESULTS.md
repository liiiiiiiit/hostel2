# Task 04 — execution evidence

Run date: 2026-11-25. Node 24, npm 11. Branch `codex/04-full-platform-qa`, stacked on Task 03 commit `1fe522f87c9079ac4742c7245fb4420d7e853bbb`. Default branch inspected independently before changes; see QA04_BUG_REPORT.md.

| Command / scenario | Actual local result |
| --- | --- |
| `npm ci` | PASS, 233 packages installed; no dependency/lockfile changes |
| Baseline `npm run lint` | PASS (both TypeScript projects) |
| Baseline `npm test` | PASS, 204/204 |
| Baseline reproduction tests | 3 expected failures proving the defects; malformed/oversized JSON control passed |
| `node --import tsx --test server/qa04-regressions.test.ts` | PASS, 8/8 |
| Post-fix `npm run lint` | PASS |
| Post-fix `npm test` | PASS, 212/212, zero failed/skipped (31.38s) |
| `npm run build` | PASS baseline and final build |
| `npm run test:built` | PASS production HTML and 21 asset responses, runtime identity/banner isolation |
| `demo:seed -- --init --seed qa04-platform` | PASS independent persistent sandbox; 2,564 tracked rows and 240 physical units |
| `BROWSER_PATH=/usr/bin/chromium npm run test:browser` | BLOCKED locally: wrapper exists but `/usr/lib/chromium/chromium` binary absent, exit 127 |
| Chained local `test:providers` / `test:services` | Not reached after browser launch failure; not claimed as local passes |
| Playwright Chromium installation | BLOCKED by browser download/network failure |

## CI execution

Existing workflows are retained: Browser and responsive audit (actual Chrome workflow/provider/services/header/hero plus four language responsive matrix and installed WebKit iPad), Staging isolation (real HTTPS/basic proxy with marked staging resources), Persistence recovery. This PR extends staging smoke with native authenticated API workflows and 40 populated dashboard language/theme/role combinations. Executed workflow URLs and results are recorded below. A configured or queued workflow is not counted as a pass.

## What is and is not covered

Automated tests are deterministic, bounded and use isolated databases. Existing suite covers domain invariants, migrations, backups, concurrency and module validation; actual browser scripts exercise forms and dashboards separately. New staging smoke uses persistent full default synthetic relationships and auxiliary records, avoiding alteration of the provenance-tracked batch. It checks login, profile/password, expired sessions, manager inventory/bookings, coupon limit accounting, rental inquiries, job moderation/application statuses, tour capacity/confirmation, service requests, upload/delete, articles, role boundaries, privacy and restart persistence.

Browser coverage includes fa/en/ru/hy, RTL/LTR, light/dark and viewport emulation. It is not physical Android/iPad certification. External services/maps/images are blocked or mocked intentionally; notifications never contact real recipients. Production runtime, production records, network outage/power-loss recovery, exhaustive interaction coverage of every admin control and real sustained load remain unverified. No performance improvement is claimed without a benchmark.

## Initial CI findings

First isolated-staging attempt passed the full synthetic HTTPS API checks and all 40 dashboard layout combinations, then failed the article canary because the new test used an unsupported `/en/article/...` path. Actual canonical routes are `/en/guides/:slug`; the test was corrected to that existing route and now waits for the article heading before inspecting XSS behavior. This was a test-harness defect, not a claimed application defect. The full corrected staging rerun passed (see below).

Local `npm run db:check` on the independent populated Task 04 sandbox passed: schemaReady/mediaCleanup true, 67 indexes, no missing tables/indexes, zero FK violations, integrity_check ok; provider orphan counts all zero. `demo:validate` passed with 2,564 tracked records, 240 units and zero changed rows. `npm run test:isolation` passed 9/9.

## Executed Chrome and WebKit results (first source run)

[Browser and responsive audit, run 45562906316](https://github.com/liiiiiiiit/hostel2/actions/runs/45562906316) completed successfully on source commit `02d066a12a90294ddacbb98a59adab8f2fa1526b`. Chrome 157.0.8103.78. The later commit changes only the new staging article test and this report, not the application or these browser tests.

| Exact command | CI result and observed coverage |
| --- | --- |
| `npm run test:browser` | PASS: actual booking/tracking, female beds and private-room editor, quote/coupon, stay change, apartment/map/private address, reception unit assignment and check-in/out, finance, profile, saved properties/comparison, manager multi-property navigation, four-language mobile dashboards, offline phrasebook; no uncaught page errors |
| `npm run test:providers` | PASS: admin creates accounts, unified login, job/tour creation, moderation, public guest forms, scoped provider status updates, admin oversight and restart/session/guest tracking persistence |
| `npm run test:services` | PASS: multilingual admin CRUD/upload/publication, directory filters, contacts/maps, inquiry/admin review, restart, retry after network failure/unpublication; 176 layouts across four languages, two themes, 11 widths |
| `npm run test:header` | PASS: 112 layouts, four languages, two themes, 14 widths; touch desktop-site emulation at 980px, alignment, opening/Escape/focus and wide navigation |
| `npm run test:hero` | PASS: four languages, all six slides at 125% text at 320/390/820/1440px; keyboard/swipe/hover/progress/reduced motion and six destination routes |
| `npm run test:responsive` (four language jobs) | PASS: 624 states per language, 2,496 total, 12 widths: 320, 360, 390, 430, 640, 768, 820, 980, 1024, 1280, 1366, 1440px |
| `npm run test:ipad` | PASS installed WebKit: 200 form layouts and 40 date/search flows; 10 portrait/landscape tablet viewports, four languages |
| `npm run db:migrate` then `npm run db:check` | PASS isolated CI database |

[Persistence and recovery, run 45562906303](https://github.com/liiiiiiiit/hostel2/actions/runs/45562906303) passed 17 targeted tests and the actual managed-path acceptance script: committed-WAL relocation, preserved hashes/media, missing-source refusal, guarded offline migration, npm installation/rebuild/restart, login/session/media, encrypted backup and separate-target recovery/health.

## Module evidence map

| Module | Executed evidence | Important boundary |
| --- | --- | --- |
| Authentication/accounts/roles | Native API tests, generated-role API authentication, browser unified login and dashboards, password/reset/session regressions | Real email verification/recovery delivery mocked/disabled |
| Hostel/admin/manager/traveler | API reservation races/changes/ownership, full editor and reception browser workflows, private tracking, capacity regression | Production inventory and physical guests unavailable |
| Rentals | API conditional validation/private redaction; actual apartment editor, map links and public inquiry/status | Third-party map rendering blocked |
| Jobs | Provider/browser creation, moderation, guest application, status and restart; IDOR/duplicate/concurrency tests | No unsupported registered job-seeker dashboard claimed |
| Tours | Provider/browser moderation/booking/confirmation, capacity races and restart | No payment provider exercised |
| Services | CRUD/upload/localized filters/details/request/admin status, network errors/retry, restart and layouts | Contact destination delivery not initiated |
| Articles/reviews/coupons | API validation/locales/moderation and eligible reviews, coupon accounting/races/browser quote; actual staging article XSS canary passed | No external article sources fetched |
| Media | Real admin upload and reference protection/browser flow, rollback/retry/reattach/restore regressions | Remote blob storage mocked in existing recovery tests |
| Translation/support/finance/settings | Existing mocked translation and limits; booking-scoped support/finance API tests, actual reception finance browser flow, scoped settings authorization | External translation/notification providers disabled |

Layouts count checked states, not unique business test cases. Passing these suites does not establish exhaustive coverage of every button, linguistic quality, every screen-reader interaction or all physical devices.

## Corrected full staging run — PASS

[Staging isolation, run 45563345273](https://github.com/liiiiiiiit/hostel2/actions/runs/45563345273), source `4a2c9b3aa6bc661f6e045632eddadc71f687d36a`, completed successfully. Actual job output:

- Full synthetic native HTTPS APIs passed across all roles, ownership, profile/password/session expiration, booking/coupon races, private tracking, rental inquiries, job moderation/applications, tour capacity/replays, service requests, uploads, injection/CSRF/privilege boundaries and SQL integrity.
- All 40 authenticated populated dashboard combinations passed: five roles × four languages × two themes at rotating mobile/tablet/desktop widths; article XSS canary remained inert after the real canonical article rendered.
- Application process restart preserved authenticated role sessions, confirmed reservation, reviewed job application, tour confirmation and updated account.
- Full requested fixture ecosystem persisted through production rebuild/restart; real HTTPS Nginx/Basic Auth, noindex/banner, cookie isolation, persisted uploads, delivery-disabled worker, encrypted backup and separate-target recovery/schema checks all passed.
- The same job executed lint, 9/9 isolation tests, 212/212 main tests, build and production built-client checks successfully.

[Managed persistence rerun, run 45563345271](https://github.com/liiiiiiiit/hostel2/actions/runs/45563345271) also completed successfully on this source commit. Local idempotent `db:migrate` then `demo:validate` passed again without changing any tracked synthetic row.

## Final verified source

All three workflows completed successfully for source commit `4a2c9b3aa6bc661f6e045632eddadc71f687d36a`:

- [Browser and responsive audit 45563345239](https://github.com/liiiiiiiit/hostel2/actions/runs/45563345239): all six jobs passed, including four responsive language jobs, actual browser workflows and WebKit.
- [Staging isolation 45563345273](https://github.com/liiiiiiiit/hostel2/actions/runs/45563345273): passed.
- [Persistence and recovery 45563345271](https://github.com/liiiiiiiit/hostel2/actions/runs/45563345271): passed.

The final report-only commit modifies Markdown reports; application code and tests match this verified source. Any automatically triggered workflow for that report-only commit is a separate run and is not being substituted for the completed execution evidence above. PR: https://github.com/liiiiiiiit/hostel2/pull/15. No merge or deployment performed.
