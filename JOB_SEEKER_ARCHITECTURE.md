# Task 06: private job seeker workspace

## Verified baseline

Inspected 26 November 2026. Actual GitHub default is `codex/03-demo-data-manager` at `1fe522f87c9079ac4742c7245fb4420d7e853bbb`. Task 05 PR #16 is open/unmerged, head `76868bd62899aed959e75d5d410fc68ba41c2b31`. This feature branch `codex/06-job-seeker-dashboard` is deliberately stacked on that reviewed Task 05 head. Tasks 04/05 must not be assumed to be in the default branch. Target the Task 05 branch for review; merge dependencies in order.

Inspected: `server/{database,relational-schema,relational-store,repository,api,domain,authorization,action-authorization,provider-accounts,job-postings,job-applications,persistence,backups,backup-files,media,environment,locale}.ts`, `server/demo/{fixtures,manager,materialize,provenance,counts,safety}.ts`, API/database tests, `src/{App,types/index,utils/{authorization,navigation}}`, store/auth/AccountSettings, Header, JobsView, JobApplications, ReferenceTracker, four-language dictionaries, deployment/systemd/Nginx templates and three CI workflows.

React 19, TypeScript, Vite, Tailwind, Express, Node, SQLite/libSQL with native parameterized transactions remain unchanged. Scrypt credentials and hashed durable sessions remain unchanged. The baseline application table has no applicant user ID and supports guest tracking by reference only.

## Before → after

| Area | Before | After |
|---|---|---|
| Identity | One authenticated account; job guest references | Same account gains an optional private employment workspace; no new role |
| Authorization | Task 05 `account.self`, `jobs.manage`, ownership | Reused live policies for every new action/download; no self-assigned capability |
| Applications | Guest request + reference | Guest flow retained; authenticated submissions linked by current server session, never by email |
| Resume | No private document model | Up to three simple PDFs, 2 MiB each, private SQLite BLOB storage |
| Profile | No seeker profile | Personal data, preferences, skills, languages, experience and education |
| Discovery/history | Public listings and guest tracking | Search/filter, saved jobs, account history, withdrawal and sharing revocation |
| Employer | Own applicant text | Only consented snapshots and document access for applications to own jobs |
| Demo recipes | Version 1 | Version 2 adds profiles and account applications; version 1 regenerates identically |

## Additive migration `job-seekers-v1`

Eight new tables: `job_seeker_profiles`, `job_seeker_skills`, `job_seeker_languages`, `job_seeker_experience`, `job_seeker_education`, `job_seeker_documents`, `saved_jobs`, `account_job_applications`. Three explicit indexes: `job_applications_reference_job`, `account_job_applications_current`, `account_job_applications_document`. Existing tables, IDs, credentials and guest rows are not rewritten. The module marker is transactional. Startup and `db:check` inspect marker, columns and indexes. Existing verified-backup migration guard includes this module.

`account_job_applications` references the exact `(reference,job_id)` pair and `(document_id,user_id)` pair. A partial unique index permits at most one non-withdrawn application per account/job. Guest requests retain their existing request ID/fingerprint behavior. Authenticated fingerprints additionally bind the server-derived account ID. Concurrent retries either reuse their original reference or reject conflicting/duplicate submissions atomically.

The original application's four-state CHECK remains unchanged. Withdrawal is a link timestamp overlaid on tracking/provider/history reads. Only received/reviewing applications can be withdrawn; employer updates cannot revive withdrawn records. Reapplication creates a fresh request/reference. Accepted/declined applications remain part of history and block another simultaneous application.

## Privacy and storage

Profiles have no public lookup/discovery endpoint. Any active existing role may use its own workspace through `account.self`; administrator status does not allow browsing another user's unshared profile or own-document route. Admin oversight and job owners receive only submitted contact/message plus explicitly selected snapshots/documents. Snapshot sharing is unchecked by default. Both authenticated applications and the UI require explicit consent. An `accountRequired` flag prevents an expired logged-in form silently becoming a guest submission.

Resume upload and download never use the public image route or media URLs. Protected attachment responses have no-store, nosniff and CSP sandbox. Restrictive MIME/size/signature/structure/active-content validation rejects Office files, encrypted PDFs, forms and object-stream PDFs. This is **not antivirus certification** and can reject otherwise valid complex PDFs. Users should export a plain PDF. No external scanning service or dependency is introduced. Revocation cannot recall copies already downloaded by a recipient.

Deleting a resume unlinks it first. Deleting employment profile data removes normalized profile/documents/saved jobs and revokes snapshots, while retaining the account, reservations and minimal application history/contact already submitted. This is documented clearly in the UI. Historical claiming is intentionally unsupported: guest references keep working, but an unverified email match never transfers ownership.

Encrypted snapshot backups already serialize SQL BLOBs. Restore now creates explicit unique indexes before inserting rows: SQLite requires parent key indexes at statement preparation even under deferred FK checks. The existing full snapshot regression and new BLOB restore regression cover this confirmed recovery defect. Keep protected backup keys separate from archives. The existing default `BACKUP_MAX_BYTES` is 64 MiB of serialized JSON; monitor actual verified snapshot size and adjust deliberately before growing resume storage beyond that limit. PDF base64 increases snapshot size; backup failure is explicit, never suppressed. No new environment variables, dependencies or npm commands.

## Demo, lifecycle and limits

Fresh version-2 full batches add 30 private profiles, 30 work experiences, 30 education entries, 60 skill rows, 60 language rows, 60 saved jobs, three synthetic PDFs and 30 linked applications within the existing 80 applications. Fifty applications remain guests, including repeated email contacts that deliberately are not auto-linked. Existing batches are not silently enriched; their recipes remain versioned/idempotent. Existing provenance includes BLOB hashes and child-first safe cleanup.

Employment type preferences are structured, but legacy job schedules remain free text; search supports text, location, minimum salary and pay period without inventing missing job taxonomies. Minimum salary filtering applies to the selected pay period; no exchange/pay-period conversion. Open-only public listings remain moderated exactly as before. Unavailable saved jobs retain their saved public summary; applied job titles/company remain in history after closure.

The private client rejects HTML fallback, malformed JSON, false-success envelopes and missing metadata instead of displaying an upload success. Application inputs stay disabled during profile prefill so a delayed response cannot overwrite typing; identity changes remount the public application form.

The private React view is lazy loaded at `/#/job-seeker`, linked from the header account menus and Jobs page. Four dictionaries cover Persian, English, Russian, Armenian. Hash routes retain the existing noindex treatment. Existing booking dashboard, roles, navigation design, mobile behavior and themes are preserved.

## Permission matrix

| Operation | Guest | Active account (any existing role) | Employer | Admin |
|---|---|---|---|---|
| Public jobs / reference status | Yes | Yes | Yes | Yes |
| Guest application | Yes, no document/profile | Account-linked consented application | Same | Same |
| Own profile/saved/history/CVs | No | Own only | Own only | Own only |
| Applicant snapshot/resume | No | No unless job owner capability | Own job + consent + not withdrawn | Consented applications across jobs |
| Withdraw/revoke/delete employment data | No | Own only | Own only | Own only |
| Browse unshared applicant profile | No | No | No | No |

Disabled/revoked/expired sessions fail server-side. No historical claim API exists. New source files are `server/job-seekers.ts`, `server/job-seeker-routes.ts`, `server/resume-fixtures.ts`, `src/types/jobSeeker.ts`, `src/i18n/jobSeeker.ts`, `src/services/jobSeeker.ts`, `src/views/JobSeekerView.tsx`; integrations and tests are enumerated in the PR diff. See API, test results, Persian user guide and staging deployment documents alongside this report.

## Changed-file inventory

39 intentional files; no dependency lockfile, database, media, credential manifest or secret changes.

| Area | Files |
|---|---|
| Native model/routes and regression fixtures | `server/job-seekers.ts`, `server/job-seeker-routes.ts`, `server/job-seekers.test.ts`, `server/resume-fixtures.ts` |
| API, authorization and persistence integration | `server/api.ts`, `server/action-authorization.ts`, `server/database.ts`, `server/persistence.ts`, `server/repository.ts`, `server/job-applications.ts`, `server/backups.ts`, `server/locale.ts`, `scripts/database.ts` |
| Synthetic compatibility and materialization | `server/demo/fixtures.ts`, `server/demo/manager.ts`, `server/demo/materialize.ts`, `server/demo.test.ts` |
| Frontend workspace | `src/views/JobSeekerView.tsx`, `src/services/jobSeeker.ts`, `src/services/jobSeeker.test.ts`, `src/types/jobSeeker.ts`, `src/i18n/jobSeeker.ts` |
| Existing frontend integration | `src/App.tsx`, `src/components/Header.tsx`, `src/components/JobApplications.tsx`, `src/views/JobsView.tsx`, `src/utils/navigation.ts`, `src/types/index.ts`, `src/i18n/jobApplications.ts` |
| Browser/CI entry points and preview prevention | `scripts/job-seeker-browser-smoke.mjs`, `scripts/staging-smoke.mjs`, `scripts/provider-browser-smoke.mjs`, `server/environment.ts`, `vercel.json` |
| Delivery documents | `JOB_SEEKER_ARCHITECTURE.md`, `JOB_SEEKER_API.md`, `JOB_SEEKER_GUIDE_FA.md`, `JOB_SEEKER_STAGING_DEPLOYMENT_FA.md`, `JOB_SEEKER_TEST_RESULTS.md` |
