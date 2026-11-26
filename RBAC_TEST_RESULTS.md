# Task 05 — execution results and security limits

Environment: isolated execution workspace, Node 24; no production database, uploaded production files, credentials or live services accessed.

| Execution | Result |
| --- | --- |
| `npm ci` | PASS |
| Baseline lint and tests | PASS, 212/212 before implementation |
| Post-change `npm run lint` | PASS both TypeScript projects |
| `npm test` | PASS 221/221, zero failed/skipped, initial complete run 33.13 seconds |
| `npm run build` | PASS |
| `npm run test:built` | PASS production HTML + 21 asset responses and environment/banner isolation |

Ten new tests cover the five-role permission matrix; complete action-policy coverage and unknown-action denial; admin-only role assignment, ID/hash preservation, session/reset-token revocation, injected profile fields and private-event redaction; last-admin protection/concurrent stale updates/self-demotion; manager reassignment/dormant private-data isolation; legacy upgrade/reopen/explicit revocation/non-regeneration with verified pre-backup; interrupted DDL migration rollback; provider role changes and stale native principals; atomic role/audit/session/token rollback; grant FK/uniqueness/server-derived capabilities, and two administrators concurrently attempting to demote each other. Counts reflect tests, not every assertion.

An intermediate run failed four historical-owner tests because the existing fixture injected a legacy listing after the migration had already run. The fixture now deliberately performs the one-time pre-upgrade migration; it does not grant roles through new ownership. New tests explicitly assert no implicit regrant after revocation. An earlier in-progress integration also exposed a nonadmin provider-list authorization regression; it was corrected to return an empty list, and the complete suite rerun passed. No failing run is represented as a pass.

## Browser and staging verification

The disposable HTTPS/basic-auth staging workflow now invokes `scripts/rbac-browser-smoke.mjs` after the existing full synthetic platform test. It uses actual admin UI assignment, actual menu login, session revocation, provider role change, security event visibility, and 24 role-editor layouts (four languages × two themes × mobile/tablet/desktop). Existing browser/provider/services/header/hero/responsive/WebKit, managed persistence and full staging workflows are retained. CI outcomes and source SHA will be recorded after execution; merely configuring a check is not a pass.

## Limits

Current one-primary-role/provider-profile design is retained. General multi-role provisioning, custom roles and future rental/service/moderator dashboards are intentionally not implemented. Historical compatibility grants are explicit and revocable. External SMTP/Telegram/SMS/payment delivery is not tested or enabled. Local browser binary availability and actual physical-device behavior are separate from CI emulation. No exhaustive penetration test, production configuration audit, production migration or sustained load test was performed. Administrator user-list loading currently uses the existing small-platform admin pattern; very large catalogues/accounts need pagination before scale. Security audit records require an operator retention policy as they accumulate.

Final local source checks after adding the mutual-demotion race and complete pre-existing-table migration comparison: `npm run lint` PASS; `npm test` 222/222 PASS (32.48s), no failures/skips. The prior 221 count is retained above as an earlier execution, not a different unique-test total.

Actual local `test:browser` launch is BLOCKED: `/usr/bin/chromium` is a wrapper with no installed binary and exits 127. No local browser pass is claimed.

Independent persistent sandbox `/workspace/scratch/764e2d191d37/yh-rbac-task05`: native `demo:seed -- --init --seed rbac-task05`, `demo:status`, `demo:validate` and `db:check` PASS. 2,589 tracked rows (25 new provider security events), 240 physical units, 65 generated role accounts plus bootstrap admin; zero changed tracked rows. Same business counts as Task 03; no new unsupported roles. Schema authorization=true, 68 indexes, no missing tables/indexes, foreignKeyViolations=0 and integrity_check=ok. Protected random credential manifests remain outside Git, mode 0600.
