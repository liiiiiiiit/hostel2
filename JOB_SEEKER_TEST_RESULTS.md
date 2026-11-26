# Task 06 verification — 26 November 2026

Baseline: Task05 `76868bd62899aed959e75d5d410fc68ba41c2b31`; dedicated Task06 branch. No production database, service, media or Nginx configuration was modified. All mutations/testing use disposable or private isolated SQLite targets.

## Local execution

| Command/check | Actual result |
|---|---|
| `npm ci` | Success; 233 packages installed; npm reports allowScripts notices for existing dependency lifecycle scripts |
| Baseline `npm run lint` / `npm test` | Success; 223 tests, zero failures |
| `node --import tsx --test server/job-seekers.test.ts server/demo.test.ts` | 14 tests passed, zero failures |
| `npm run lint` | Success; TypeScript frontend and API projects |
| `npm test` | Success; 233 tests, zero failures |
| `npm run build` / `npm run test:built` / `npm run test:isolation` | Success; production build, built HTML + 24 assets, nine environment isolation tests |
| Isolated `npm run demo:seed -- --init --seed task06-verified-20261126` | Imported full ecosystem; 2,892 tracked records; manifest outside Git, protected permissions |
| `npm run db:check` on that isolated seed | schemaReady/jobSeekers true; integrity ok; zero foreign-key violations |
| Task05 version-1 recipe comparison | Byte-identical plan hash `b37800cfc38155e0b9aba5c91c5e4f0593efd4aab0527c6bf124c82193958589` for baseDate 2026-11-26, compared to the actual baseline source |

Additional seeded rows: 30 profiles; 60 skills; 60 languages; 30 experiences; 30 education rows; three private PDF documents; 60 saved jobs; 30 account-linked applications within 80 total. Fifty remain guests. All original requested module counts preserved. New fixtures use only reserved `.test` contact information and offline synthetic images/PDFs. No credentials included in this report.

`node --import tsx --test src/services/jobSeeker.test.ts`: two tests passed, zero failures; malformed/HTML/false-success responses reject, headers/credentials and validated upload metadata are preserved.

## Regression coverage

New isolated authenticated API/native tests and the delayed-prefill browser regression exercise profile normalization/strict schema/optimistic writes; private defaults; forged target rejection; guest reference/fingerprint compatibility; same-email non-claiming; explicit consent; stale logged-in form rejection; another account's document/request denial; duplicate active requests; idempotent retries; frozen snapshots; employer-specific download access; disabled sessions; withdrawal and status-transition guards and reapplication; accepted-state withdrawal denial; sharing revocation; private attachment headers/content; invalid MIME/signature/active-content/oversize/unsafe filename; per-user file quota and durable attempt limits; saved jobs after closure; profile deletion preserving credentials/basic records; additive migrations, injected failure rollback and historical row preservation; restart persistence; encrypted BLOB backup verification, corrupted archive rejection and separate-target restoration. Existing full SQL snapshot test caught the explicit unique-index restore ordering defect, now fixed.

`server/demo.test.ts` checks new rows through persistent provenance, idempotent import and existing batch cleanup/permission scenarios. Existing action-policy exhaustive coverage includes every new action.

## Browser verification

`npm run test:browser` was executed locally and failed at launch (exit 127), before browser assertions. Local Chromium is unavailable: `/usr/bin/chromium` is a wrapper without the real executable. Browser success is not inferred from build or unit tests. The existing disposable GitHub staging workflow now executes `scripts/job-seeker-browser-smoke.mjs`: actual authenticated registration identity, profile/skills/experience save, private PDF upload, saved job, consented application, employer/admin permitted attachment download, withdrawal/revocation and refresh persistence. It uses loopback-only Nginx HTTPS/Basic Auth and an origin guard; it never sends tests to public staging/production.

The new UI suite checks nine widths (320/360/390/430/640/768/820/1024/1366), four languages, both themes plus each dashboard tab at mobile width, 112 layout checks. Existing CI also runs public/booking/provider/services workflows, hero/header, full responsive language matrix, iPad/WebKit, persistence/recovery and staging rebuild/restart/backup flows. Exact completed run URLs and outcomes are recorded below.

## Limits

No real Android/iPad hardware run, screen-reader audit, antivirus service or uncontrolled load test. PDF validation deliberately restricts supported formats and is not malware certification. No historical guest application claim feature. Minimum-salary filter does not normalize daily/monthly/hourly salaries. Consent is necessary for authenticated submissions; legacy guest API payloads remain compatible. Existing backup size cap requires operational monitoring as private resumes accumulate. No live deployment executed.

## Completed GitHub Actions evidence

All three workflows completed successfully for verified source commit **`6390486f81130a60323a9f26c4160c98991ea516`**:

| Workflow | Result and evidence |
|---|---|
| [Browser and responsive audit](https://github.com/liiiiiiiit/hostel2/actions/runs/45767304607) | Success: all six jobs — browser workflows/providers/services/header/hero/db checks; responsive fa/en/ru/hy; iPad/WebKit. WebKit log: 200 form layouts and 40 date/search flows passed. |
| [Staging isolation](https://github.com/liiiiiiiit/hostel2/actions/runs/45767304655) | Success: 233 tests; runtime/config isolation; real loopback HTTPS/Basic Auth staging, seeded data, rebuild/restart, encrypted recovery, full platform APIs/browser roles, Task05 RBAC UI; Task06 actual profile/experience/skills, private PDF upload, saved job, consented linked application, authorized download, withdrawal/revocation, delayed-prefill protection, refresh persistence and **112** locale/theme/viewport checks. |
| [Persistence and recovery](https://github.com/liiiiiiiit/hostel2/actions/runs/45767304588) | Success: 17 targeted tests and real managed-path WAL-safe relocation, credential/media preservation, guarded offline migration, installation/rebuild/restart, login/session/media, encrypted backup and separate-target recovery/schema health. |

The documentation completion commit after this source changes only reports/deployment text, with no source/config/test changes. Deployment instructions intentionally pin the source commit above. The local browser launch failure remains recorded honestly; browser success comes from the actual completed CI jobs, not from the local build. No live VPS deployment, real device validation, public certificate issuance or production database manipulation was performed.
