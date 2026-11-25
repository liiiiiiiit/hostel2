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

Existing workflows are retained: Browser and responsive audit (actual Chrome workflow/provider/services/header/hero plus four language responsive matrix and installed WebKit iPad), Staging isolation (real HTTPS/basic proxy with marked staging resources), Persistence recovery. This PR extends staging smoke with native authenticated API workflows and 40 populated dashboard language/theme/role combinations. Execution URLs and results are added after the workflows finish. A configured or queued workflow is not evidence of a pass.

## What is and is not covered

Automated tests are deterministic, bounded and use isolated databases. Existing suite covers domain invariants, migrations, backups, concurrency and module validation; actual browser scripts exercise forms and dashboards separately. New staging smoke uses persistent full default synthetic relationships and auxiliary records, avoiding alteration of the provenance-tracked batch. It checks login, profile/password, expired sessions, manager inventory/bookings, coupon limit accounting, rental inquiries, job moderation/application statuses, tour capacity/confirmation, service requests, upload/delete, articles, role boundaries, privacy and restart persistence.

Browser coverage includes fa/en/ru/hy, RTL/LTR, light/dark and viewport emulation. It is not physical Android/iPad certification. External services/maps/images are blocked or mocked intentionally; notifications never contact real recipients. Production runtime, production records, network outage/power-loss recovery, exhaustive interaction coverage of every admin control and real sustained load remain unverified. No performance improvement is claimed without a benchmark.
