# Task08 verification evidence

Baseline: actual default `codex/07-employer-recruitment-dashboard`, `3e2139917ff6191465537ca8bea0fcf82f4b1c4f`. New branch `codex/08-content-moderation`. No VPS deployment, live database mutation or automatic merge.

## Executed

- Baseline `npm run lint`, `npm test`: passed, 241 tests.
- `npm run lint`: passed frontend and API TypeScript.
- `node --import tsx --test server/moderation.test.ts server/demo.test.ts`: passed16 tests (before adding history-cursor coverage; final full run recorded below).
- Full suite reached249 passed/0failed; build, built-client24 assets and isolation9 also passed. Final source rerun and CI evidence will be pinned below.
- Actual isolated generator `node --import tsx scripts/demo.ts seed --init --seed task08-moderation-final-20261127`: success, all original requested counts preserved. 3880 provenance-tracked records;185 moderation rows;325 events. Each of hostel/rental/job/tour/service/article/review has all8 moderation states. Protected random account credentials remain outside Git.
- Actual isolated `node --import tsx scripts/database.ts check`: schemaReady/moderation true; integrity ok, foreign-key violations0.
- Legacy recipe1/2 hashes remain locked; added Task07 recipe3 hash `ebf6f5a71339ba53f5a13aef8dfc40c991ab4c8cf53879046e59f6fe787ab44e` for 2026-11-26.

Native/API regressions cover all64 from/to pairs; seven-module approval/publication visibility, direct details and sitemap; no automatic verification; scoped provider correction feedback; expired/disabled/forged-role/unauthorized sessions; atomic bulk decisions; simultaneous stale writes; content hash and metadata version conflicts; audit failure rollback; sanction bypass via legacy editor; strict schema/publication completeness; Unicode filtering/pagination; history cursor; additive/idempotent migration, injected migration failure, hashed preservation of every old table, backup guard, encrypted recovery to a separate target.

Existing hostel-location regression now explicitly requires a fresh admin publication decision after manager material edits and still separately verifies map confirmation. The prior tour test's raw SQL approval bypass was replaced by authenticated admin publication. The scoped-persistence regression now expects exactly one business-row write plus one decision metadata row and one event; no-op/public reads remain write-free. Existing security assertions were not removed.

## Browser verification

Local Chromium is unavailable (wrapper without executable). Actual browser verification uses disposable GitHub Actions with real HTTPS/Nginx Basic Auth, isolated SQLite and synthetic accounts; no public production requests. New moderation workflow tests real admin navigation/filter/search/preview, explicitly confirmed bulk publication/suspension, public visibility, escaped history and72 combinations of four locales/two themes/nine widths. Existing platform/provider/service/recruitment/seeker/responsive/WebKit/backup regressions remain enabled.

CI links and exact final results pending execution; pending is not a pass. No real-device, screen-reader or independent penetration-test certification, production load test or real provider notification delivery is claimed. Unicode catalog search at very large scale remains unbenchmarked.
