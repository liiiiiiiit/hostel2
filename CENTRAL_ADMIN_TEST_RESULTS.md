# TASK 11 verification record

Date: 2026-11-28. Base: owner-selected default `e172386ad60a0fcae1b9d4313bfd894ef3312544`. Feature: `codex/11-central-admin-dashboard`, PR #22. Production was not used. All fixtures use synthetic accounts, separate SQLite/media paths and disabled external notifications.

## Local execution

- `npm run lint`: passed (application and API TypeScript projects).
- `npm test`: **276 passed, 0 failed**, no skipped tests; executed full suite, including ten central-administration tests and six ApiStore concurrency/compatibility tests.
- `npm run build`: passed. Existing asset budget warning remains: main chunk approximately 506 kB minified; not a build failure.
- `npm run test:isolation`: 9 passed, 0 failed.
- `npm run test:built`: passed; production HTML and 24 asset responses, environment identity and no staging-banner leakage.
- `git diff --check`: passed before delivery.

## Central automated coverage

Native tests execute real SQL/API transactions: all 25 projections and counts; pagination/sorting/Unicode search; invalid identifiers and strict schemas; guest/traveler/provider/deactivated-admin denial; scoped state shell and unchanged legacy state; stale bulk rollback and retained inquiries; restore to pending review; category CSV/JSON preview/commit, uniqueness/version checks and atomic rollback; export formula escaping and receipt/contact redaction; private-report acknowledgement; private escaped casework, cursor isolation and future activity; referenced-media rejection/queue; actual receipt health without paths/secrets; migration idempotence, injected DDL failure, unchanged old rows, backup guard and separate-target recovery; four-language label parity. Store tests exercise queued writes, stale responses and explicit legacy hydration failure recovery.

## Real browser and CI

Verified code: [`fe37a2c28a6b3cc73c983c435a0f078a1b0fb4db`](https://github.com/liiiiiiiit/hostel2/commit/fe37a2c28a6b3cc73c983c435a0f078a1b0fb4db). All **8 jobs passed**, across these three workflows (PR merge ref against the unchanged base):

| Executed workflow | Jobs | Result |
| --- | --- | --- |
| [Browser and responsive audit](https://github.com/liiiiiiiit/hostel2/actions/runs/46116255194) | browser; responsive fa/en/ru/hy; ipad-webkit (6) | Success |
| [Staging isolation](https://github.com/liiiiiiiit/hostel2/actions/runs/46116255199) | isolated-staging (1) | Success |
| [Persistence and recovery](https://github.com/liiiiiiiit/hostel2/actions/runs/46116255198) | managed-persistence (1) | Success |

Staging job `140890650826` recorded central 432-layout success at 06:26:03 UTC and real restart/encrypted recovery success at 06:26:06 UTC on 2026-11-28. Banner text contrast assertions passed for four languages and both themes. Existing rental-owner and service-provider UI suites also passed afterward.

[Original 13-capture artifact](https://github.com/liiiiiiiit/hostel2/actions/runs/46116255199/artifacts/15251419002) is retained until 2026-12-12. ZIP SHA-256 `e6cf3a9d448a07857d5c72431f3ae8f996bd5edbe9c2293c040296a85060ce22` was checked after download. Six unmodified originals are committed under [docs/admin/screenshots](docs/admin/screenshots/README.md), with individual hashes; these remain in git beyond artifact expiry.

The final delivery commit only adds documentation and those actual PNG captures. Application, test, migration, dependency and workflow code remains identical to the verified code SHA. Staging instructions deliberately pin that verified SHA; documentation-only CI reruns may additionally be visible on the branch.

The central disposable staging script executes Chromium through real HTTPS Nginx/Basic Auth, secure session and isolated egress. Assertions cover actual SQL-versus-UI counts, navigation search, server pagination, CSV/JSON file downloads, private report confirmations/audit, canonical category import, atomic two-item archive/restore with public invisibility, escaped private report creation/resolution, upload/deletion worker, settings edit/restoration, activity acknowledgement, **432** section/language/theme/viewport checks plus banner contrast assertions, real restart persistence and encrypted separate-target recovery of new case/activity tables. Layout matrix: fa/en/ru/hy × light/dark × 320/360/390/430/640/768/820/1024/1366 × overview/records/cases/health/settings/media.

Additional existing staging suites cover platform operations, RBAC, seekers, recruitment, moderation, service providers and rental owners. Other workflows execute existing reservation/provider/services/header/hero regressions, four-language responsive suites, WebKit iPad search/date regressions and persistence/recovery. A passing job applies to its exact source SHA; screenshot filenames are actual captures, not mockups.

## Defects found and corrected during execution

- Navigation search left unrelated entries hidden after selection; selecting an entry now clears search.
- Historical demo audit events can be future-dated; unread counts now stop at observation time and never count future rows before acknowledgement can cover them.
- Preview confirmation must commit the exact reviewed import source; the dialog now freezes that source.
- Existing private reports needed explicit privacy acknowledgement/reason and auditable server authorization.
- Central initial load previously inherited all historical arrays; a compatible small shell now defers original editor hydration, with role-boundary and store-race tests.
- Narrow translated banner children now have explicit intrinsic-width bounds. The older responsive suite now waits for the independently loaded SQL overview before measuring the populated page; its previous initial-shell samples had transient document-width overflow without an overflowing visible element. Bulk-review assertions also wait for React to render the reviewed rows after the HTTP response.
- Visual inspection of real captures found weak contrast in the overview eyebrow. Its foreground was corrected and the browser now checks computed text contrast against the base and gradient endpoint colors (minimum 4.5:1) in both themes.
- Separate recovery needs an existing parent directory; the disposable browser recovery fixture creates one before opening SQLite.

## Limits and owner review

Legacy specialized editors still load their existing authorized arrays when opened. No production-size load benchmark, physical iPad/Android run or full manual assistive-technology audit was performed. Existing WebKit search/date tests are not claimed as a full WebKit admin audit; the central 432-check matrix uses Chromium. Build size warning remains. Receipt metadata is historical evidence, not a new backup verification. CSV/JSON import is intentionally limited to shared service categories. Automated coverage is not an assertion that every possible combination of every old workflow has been exercised.

Use CENTRAL_ADMIN_STAGING_FA.md for pinned staging deployment, encrypted backup, guarded migration and separate-target rollback/recovery. Owner review precedes merging or production deployment.
