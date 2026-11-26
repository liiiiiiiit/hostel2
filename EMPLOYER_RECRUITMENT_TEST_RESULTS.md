# Task 07 verification

Base: Task06 `94cbb677b41255d0fae0383cbb6a573c72361d15`; Task07 separate branch. Default branch is Task03, not assumed to include Tasks04–06. No production database/media/service/Nginx changes or deployment.

## Executed locally

- Baseline `npm run lint` and `npm test`: passed, 233 tests, zero failures.
- `node --import tsx --test server/recruitment.test.ts server/demo.test.ts`: passed, 15 tests, zero failures (before adding the admin-reason negative assertion; full rerun also passed).
- `npm run lint`: frontend/API TypeScript passed.
- `npm test`: passed, 241 tests, zero failures.
- `npm run build`: passed.
- `npm run test:built`: passed production-mode HTML and 24 assets.
- `npm run test:isolation`: passed nine environment tests.
- Actual isolated `node --import tsx scripts/demo.ts seed --init --seed task07-recruitment-20261126`: imported full ecosystem, 3370 tracked records. New persistent data: 15 organization profiles, 30 moderation records, 80 private recruitment records, ten proposed interviews, 343 audit events. Original requested counts unchanged (80 applications, 60 hostel reservations, 40 reviews, etc.). No candidate confirmation was seeded. All credentials remain in protected manifests outside Git.
- `node --import tsx scripts/database.ts check` on that sandbox: schemaReady/recruitment/jobSeekers/authorization true; integrity `ok`, zero foreign-key violations.
- Recipe v1 static hash remains unchanged; new regression also locks Task06 v2 hash `44470969294b41f7bc5982356532f4d020f503c35c8d31e374ebb2f69ab75453` for baseDate 2026-11-26.

New API/native coverage: organization ownership/stale edits; incomplete draft/submission/approval/rejection; forged moderation denied; close/renew visibility; effective account statuses; private notes and optimistic writes; consented CV access and audit; proposed interview validation, duplicate scheduling races, no premature completion, explicit completed record without auto-hiring, terminal transitions, withdrawal/cancellation; expiry across public/save/apply; Unicode search/pagination/scoped statistics; audit-failure rollback; disabled sessions; admin oversight; additive old-row preservation, injected migration failure, verified encrypted recovery and reopening persistence.

The first expiry test incorrectly expected a duplicate save of an already-saved expired job to fail. Existing idempotent-save behavior was preserved; the test now uses a new account to verify that a new save is rejected. No validation/authorization was weakened.

## Browser execution

Local Chromium executable is unavailable (known wrapper-only environment). Browser success is not inferred from build/unit results. Existing provider browser tests now watch the new validated action names; their job creation/admin approval/guest applicant workflow is retained.

The disposable HTTPS/Basic Auth staging workflow invokes `scripts/recruitment-browser-smoke.mjs`: shared employer login, organization edit, real incomplete draft, submission/admin approval, authenticated applicant profile/CV consent/application, shortlist, private note, proposed interview, authorized CV download/audit, explicit outcome and close/renew. It also checks all four tabs in four languages/two themes/nine widths (288 layouts), and guards every browser request to the loopback-mapped staging origin. Native tests cover cross-employer/guest/disabled access and state races.

Verified source: `61417fbf74a7b74f2a4f8528ca6bab3159b3d753` (tree `b80df966437db282bdbd1bf71153dd568bb14c72`). Subsequent documentation-only commits do not change tested code.

- [Staging isolation run 29](https://github.com/liiiiiiiit/hostel2/actions/runs/45871956644): **success**, including actual HTTPS/Basic Auth Nginx, synthetic APIs, full platform role boundaries, restart persistence, RBAC editor, Task06 job-seeker regression (112 layouts), the full Task07 recruitment workflow and **288 recruitment layouts**. Full ecosystem also passed rebuild/restart, safe worker, encrypted backup/restoration and schema integrity. No browser page errors.
- [Persistence and recovery run 23](https://github.com/liiiiiiiit/hostel2/actions/runs/45871956600): **success**.
- [Browser and responsive audit run 73](https://github.com/liiiiiiiit/hostel2/actions/runs/45871956550): **success**, all six jobs: browser workflows, provider/restart workflows, services, header, hero, isolated schema health, responsive fa/en/ru/hy and iPad WebKit. `npm ci`, lint, 241 tests, build and built-client checks also passed on the disposable CI runner.

First-source CI found an ambiguous legacy provider test locator (publication filter option had the same translation) and an actual stale-version follow-up mutation on immediate close/renew. The locator is now scoped to the job card. Dashboard mutation controls wait for refreshed data; the native version checks remain intact. The identical full recruitment browser flow subsequently passed. All 241 native/unit tests, build and built-client verification were rerun successfully after that source fix.

 Existing full platform, Task06 seeker, responsive, WebKit, persistence/recovery and isolation workflows remain enabled. No uncontrolled load or production tests. No real Android/iPad hardware, external notification/RSVP, independent penetration test or screen-reader certification claimed. SQL-scale search beyond the tested fixture sizes remains a documented limit.
