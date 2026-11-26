# Task 05 — execution results and security limits

Environment: isolated execution workspace, Node 24; no production database, uploaded production files, credentials or live services accessed.

| Execution | Result |
| --- | --- |
| `npm ci` | PASS |
| Baseline lint and tests | PASS, 212/212 before implementation |
| Post-change `npm run lint` | PASS both TypeScript projects |
| `npm test` | PASS final 223/223, zero failed/skipped, 34.49 seconds; earlier complete runs 221 and 222 also passed |
| `npm run build` | PASS |
| `npm run test:built` | PASS production HTML + 21 asset responses and environment/banner isolation |

Eleven new tests cover the five-role permission matrix; complete action-policy coverage and unknown-action denial; admin-only role assignment, ID/hash preservation, session/reset-token revocation, injected profile fields and private-event redaction; last-admin protection/concurrent stale updates/self-demotion; manager reassignment/dormant private-data isolation; legacy upgrade/reopen/explicit revocation/non-regeneration with verified pre-backup; interrupted DDL migration rollback; provider role changes and stale native principals; atomic role/audit/session/token rollback; grant FK/uniqueness/server-derived capabilities, and two administrators concurrently attempting to demote each other. Counts reflect tests, not every assertion.

An intermediate run failed four historical-owner tests because the existing fixture injected a legacy listing after the migration had already run. The fixture now deliberately performs the one-time pre-upgrade migration; it does not grant roles through new ownership. New tests explicitly assert no implicit regrant after revocation. An earlier in-progress integration also exposed a nonadmin provider-list authorization regression; it was corrected to return an empty list, and the complete suite rerun passed. No failing run is represented as a pass.

## Browser and staging verification

The disposable HTTPS/basic-auth staging workflow now invokes `scripts/rbac-browser-smoke.mjs` after the existing full synthetic platform test. It uses actual admin UI assignment, actual menu login, session revocation, provider role change, security event visibility, and 24 role-editor layouts (four languages × two themes × mobile/tablet/desktop). Existing browser/provider/services/header/hero/responsive/WebKit, managed persistence and full staging workflows are retained. CI outcomes and source SHA will be recorded after execution; merely configuring a check is not a pass.

## Limits

Current one-primary-role/provider-profile design is retained. General multi-role provisioning, custom roles and future rental/service/moderator dashboards are intentionally not implemented. Historical compatibility grants are explicit and revocable. External SMTP/Telegram/SMS/payment delivery is not tested or enabled. Local browser binary availability and actual physical-device behavior are separate from CI emulation. No exhaustive penetration test, production configuration audit, production migration or sustained load test was performed. Administrator user-list loading currently uses the existing small-platform admin pattern; very large catalogues/accounts need pagination before scale. Security audit records require an operator retention policy as they accumulate.

Final local source checks after adding the mutual-demotion race and complete pre-existing-table migration comparison: `npm run lint` PASS; `npm test` 222/222 PASS (32.48s), no failures/skips. Earlier complete runs had 221 and then 222 tests; the final total after the legacy-profile regression is 223.

Actual local `test:browser` launch is BLOCKED: `/usr/bin/chromium` is a wrapper with no installed binary and exits 127. No local browser pass is claimed.

Independent persistent sandbox `/workspace/scratch/764e2d191d37/yh-rbac-task05`: native `demo:seed -- --init --seed rbac-task05`, `demo:status`, `demo:validate` and `db:check` PASS. 2,589 tracked rows (25 new provider security events), 240 physical units, 65 generated role accounts plus bootstrap admin; zero changed tracked rows. Same business counts as Task 03; no new unsupported roles. Schema authorization=true, 68 indexes, no missing tables/indexes, foreignKeyViolations=0 and integrity_check=ok. Protected random credential manifests remain outside Git, mode 0600.

## Initial CI feedback and correction

Source `0f02248088d2c18403344e094ee08a2a99b22ec0` passed Browser/responsive workflow 45745621759 (all six jobs) and Persistence/recovery 45745621718. Full staging 45745621746 passed existing full synthetic APIs, 40 authenticated dashboard combinations, XSS canary and restart checks, then the new role-editor test timed out locating the Account selector by its accessible name. Explicit localized aria-labels were added to account/role/reason controls; the corrected source also exercises manager hostel selection and all 24 layouts with that editor visible. This first failed staging run is not claimed as a pass. Corrected source workflow results follow below after completion.

## Legacy-ID compatibility regression

A new test first reproduced failure to edit a provider profile after converting an existing traveler identity (`user-traveler-…`) to a provider: `saveProvider` rejected its preserved ID because its old schema allowed only bare UUIDs. Existing-ID validation now accepts bounded nonempty identity strings, matching the existing user model; the live-admin check and existing-profile/immutable-role checks still prevent arbitrary account creation or reassignment through that endpoint. The same test passes and preserves ID/hash/salt/login. The staging browser also exercises this through the existing Provider accounts editor.

Latest local results: lint PASS, main suite **223/223 PASS** (34.49s), build PASS and built-client PASS. Final verified source is `a44498d2a3de50678e70aaafe0c4772cd48d3751`; completed CI evidence is below.

Source `05e47f0d17ee591bf72bed8a9a6b9487949319cb` passed real manager assignment, role assignment and unified provider login, but a test-only `APIRequestContext.get` used independent Node DNS instead of Chromium's localhost resolver. A connection to the domain's resolved port 8443 was refused before HTTP exchange; no live resource was read or mutated. The check now uses browser `fetch` with the guarded loopback resolver; the browser route guard compares exact origins. No production/user credentials were used; only disposable synthetic cookies existed. The failed attempt is recorded rather than marked successful.

## Completed final-source CI — all PASS

Verified code commit: `a44498d2a3de50678e70aaafe0c4772cd48d3751`. These are actual completed runs, not scheduled checks:

| Workflow / exact commands | Result and evidence |
| --- | --- |
| [Staging isolation 45746866026](https://github.com/liiiiiiiit/hostel2/actions/runs/45746866026) | PASS: npm ci, lint, 9/9 isolation tests, 223/223 main tests, build and built-client. Real disposable HTTPS/basic-auth Nginx; full synthetic imports/validation, rebuild/restart, private sessions/media, disabled-delivery worker, encrypted backup and separate-target recovery/schema health. |
| New RBAC UI within that staging run | PASS: actual manager hostel assignment, role assignment, existing provider profile edit for a converted legacy ID, menu login to employer panel, revoked old sessions, provider role switch, security events and 24 editor layouts (fa/en/ru/hy × light/dark × 360/820/1366px). |
| Existing full-platform staging checks | PASS: all supported roles and ownership, profile/password/expired sessions, reservation/coupon races, private tracking, rental inquiries, job moderation/applications, tour capacity/replays, services, uploads/deletion, injection/CSRF/privilege boundaries and SQL integrity. 40 populated role/language/theme dashboard combinations, inert article XSS canary and post-restart persistence. |
| [Browser/responsive 45746865969](https://github.com/liiiiiiiit/hostel2/actions/runs/45746865969) | All six jobs PASS; actual Chrome 157.0.8103.78 and installed WebKit. |
| `npm run test:browser` | PASS: native browser booking/tracking, property/room editors, coupons/changes, private rental/map fields, reception assignment/check-in/out, finance, profiles/saved places/comparison and four-language dashboards; no uncaught page errors. |
| `npm run test:providers` | PASS: admin-created accounts, unified login, jobs/tours moderation, guest forms, owner review/confirmation and restart persistence. |
| `npm run test:services` | PASS: multilingual CRUD/upload/filter/detail/inquiry/review/retry/unpublication and restart; 176 layouts in four languages/two themes/11 widths. |
| `npm run test:header` | PASS 112 layouts, four languages/two themes/14 widths, desktop-site touch mode, opening/Escape/focus. |
| `npm run test:hero` | PASS four languages, all six slides at 125% text and keyboard/swipe/hover/progress/reduced-motion/routes. |
| `npm run test:responsive` (four jobs) | PASS 624 states per language, 2,496 total, 12 widths including 320/360/390/430/640/768/820/1024/1366px. |
| `npm run test:ipad` | PASS 200 WebKit form layouts and 40 date/search flows. |
| `npm run db:migrate` and `npm run db:check` | PASS isolated workflow database, in addition to populated local sandbox checks. |
| [Persistence/recovery 45746865992](https://github.com/liiiiiiiit/hostel2/actions/runs/45746865992) | PASS 17 targeted checks and managed acceptance: WAL-safe relocation, preserved credentials/media, refused absent-source backup, verified pre-migration guard, offline upgrade, install/rebuild/restart, persistent sessions/media and encrypted separate-target recovery. |

The final report-only commit updates Markdown documents; application and test code remain identical to this verified source. A workflow triggered by that documentation commit is a separate run, not substituted for these completed results. PR: https://github.com/liiiiiiiit/hostel2/pull/16. No merge or VPS/production deployment performed.
