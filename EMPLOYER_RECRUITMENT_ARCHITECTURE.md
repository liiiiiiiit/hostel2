# Task 07 — employer recruitment workspace

## Verified baseline and architecture

Actual GitHub default: `codex/03-demo-data-manager`, fetched SHA `1fe522f87c9079ac4742c7245fb4420d7e853bbb`. Task06 PR #17 remains open/unmerged, head `94cbb677b41255d0fae0383cbb6a573c72361d15`; its implementation and regressions were inspected, not presumed merged. Task07 branch `codex/07-employer-recruitment-dashboard` starts from that reviewed Task06 head. It is stacked on Task06 (which depends on Task05); review dependency order before any merge/deployment.

Inspected `server/{api,database,relational-schema,repository,authorization,action-authorization,provider-accounts,job-postings,job-applications,job-seekers,job-seeker-routes,persistence,backups,backup-files,jobs,environment,locale}.ts`, demo generation/materialization/provenance, account/provider tests, JobsView/JobApplications/JobSeekerView/AdminPanel, store/auth/locales, CI and staging/persistence/systemd/Nginx documentation. No AGENTS instructions were present. Baseline lint and 233 tests passed.

React/TypeScript/Vite/Tailwind, Express/Node and SQLite/libSQL remain unchanged. Scrypt credentials, hashed durable sessions, Task05 live capabilities and Task06 private PDF BLOBs are reused. No new role, permission, dependency, environment variable or npm command is introduced.

Before: simple job editor, pending/approved flag, open/closed and four base application statuses; Task06 added private applicant snapshots/CVs/account history/withdrawal. There was no organization workspace, proper draft lifecycle, expiration, interview model, private notes or recruitment audit trail.

After: dedicated responsive employer/admin recruitment workspace, organization profile, true incomplete drafts, submission/rejection/approval, expiration/close/renew, Unicode applicant search, filters, paginated lists, consented profile/CV access, private notes, proposed interviews, enforced transitions, activity history and scoped statistics.

## Additive schema `employer-recruitment-v1`

| New table | Purpose / integrity |
|---|---|
| `employer_organizations` | User PK/FK, optimistic version, name/description/website/phone/city; no account or role duplication |
| `recruitment_jobs` | Job PK/FK cascade; draft/pending/approved/rejected, expiration/publication times, private moderation reason |
| `recruitment_applications` | Application reference PK/FK cascade; optional shortlist/interview stage, private note, optimistic version |
| `recruitment_interviews` | UUID, application FK, UTC start, 15–240 minutes, type/location, proposed/cancelled/completed; partial unique index permits one active proposal per application |
| `recruitment_events` | UUID, owner/actor/job references, target, kind, bounded business metadata and timestamp; private audit, no note bodies, CV bytes, passwords or contact copies |

Indexes: `recruitment_interviews_active`, `recruitment_events_owner`, `recruitment_events_job`, `job_applications_job_submitted`. Startup, pending-migration guard and `db:check` include marker/table/column/index readiness. Migration is transactional and does not backfill or rewrite historical users, credentials, application statuses, listings or resumes. Publication history cannot be reconstructed for old records and is not fabricated. Module migration rollback is tested with injected failure and old-record comparison.

The base job CHECK remains open/closed and base application CHECK remains received/reviewing/accepted/declined. New stages overlay reviewing; Task06 withdrawal overrides everything. Effective status is shared by public tracking, seeker history and employer reads. Private notes never enter public/global applicant records or seeker history. Interviews are shown only in their authenticated applicant's history; guest reference tracking still returns status only.

## Lifecycle and publication

Legacy listings without metadata retain prior approval/availability; no invented expiration. Provider edits/submissions/renewals require admin approval, including edits to approved jobs. Providers cannot approve/reject or write an admin moderation reason. Admin rejection requires a reason. Drafts require a title but allow incomplete other content; submission/publication requires the existing complete job schema.

A shared server predicate requires open, approved, active owner and non-draft/non-rejected/non-expired metadata for public discovery, new applications and newly saved jobs. Expiration is enforced at read/write time even if no worker runs. Job renewal preserves the job ID, existing applications and deduplication rules; it does not reset hiring outcomes or create new applications. An employer renewal returns to pending; an administrator can explicitly publish. For a separate recruitment round with new reapplications, create a new listing rather than silently overwriting final decisions.

Allowed transitions (same-state retry is a no-op):

| From | Allowed destinations |
|---|---|
| received | reviewing, shortlisted, interview_scheduled, accepted, declined |
| reviewing | shortlisted, interview_scheduled, accepted, declined |
| shortlisted | reviewing, interview_scheduled, accepted, declined |
| interview_scheduled | reviewing, shortlisted, accepted, declined |
| accepted / declined / withdrawn | Terminal; no transitions |

`interview_scheduled` requires a real stored active proposal; selecting that status without scheduling is rejected. Scheduling requires a future date within a year, explicit details, expected previous status and previous proposal ID. Rescheduling cancels the old proposal and preserves its history. Completion cannot be recorded before the scheduled start and is explicitly **employer-recorded**, not candidate confirmation. Completing/cancelling returns an active interview stage to reviewing, never hires/rejects automatically. Withdrawal cancels proposals and blocks further recruitment edits. Explicit outcomes cancel outstanding proposals, preserving their cancelled history. No RSVP or candidate confirmation is invented; no email/SMS/Telegram notification is automatically sent.

## Authorization matrix

| Operation | Guest/traveler | Employer | Admin |
|---|---|---|---|
| Public active jobs / reference status | Allowed | Allowed | Allowed |
| Employer dashboard, organization, notes, stats/history | Denied | Own resources only | All; owner filter includes disabled/historical owners |
| Create/edit/draft/submit | Denied | Own jobs; cannot self-approve | All jobs |
| Approve/reject | Denied | Denied | Allowed with validation |
| Close/renew | Denied | Own; renewal pending | All; explicit publication allowed |
| Applicant status/notes/interviews | Denied | Own job's applications only; state/version rules | All, same state/version rules |
| Authorized application CV | Denied through employer route | Own job + unrevoked consent | Consented applications across jobs |
| Applicant own CV / withdraw/revoke | Own account through Task06 only | Own identity through Task06 | Own identity through Task06 |

Live role/activation and resource checks occur server-side on every new API/action/download. Organization changes do not grant provider rights. Administrator edits of the existing provider organization alias synchronize an existing business profile when a nonempty organization name is supplied; an empty optional alias does not erase a valid business name. All actual role/credential changes continue through Task05, with existing session revocation/audits.

Sensitive publication/status/note/interview/org changes and authorized employer CV downloads are audited. The CV event means access was authorized, not proof the recipient completed downloading. Historical events start after installation; no old hiring history is invented.

## UI, fixtures and practical limits

Existing header/login, admin Jobs section, cards, controls, themes and four locales are reused. Public Jobs remains a catalog; employer/admin modes lazy-load the recruitment workspace. Job cards preview at most five applications and link to the paginated candidate view. Job/applicant pages have ten items; history pages twenty. Filtering occurs server-side on authorized data with Unicode-aware JS matching, then pagination; large-scale SQL search/indexing is a future optimization, not a claimed benchmark. Private notes use optimistic versions and keep unsaved text until explicitly refreshed; proposals use expected IDs. All times are canonical UTC in the API; input/display identifies the device timezone, and seeker interview display explicitly identifies Yerevan's zone.

Demo recipe v3 adds organization profiles, private notes, shortlist stages, publication variants and fictional proposed interviews. Recipes v1/v2 remain byte-identical and existing imported batches are not silently enriched. Historical base dates do not force illegal past interview proposals: only future proposals passing the normal service rules are generated. All fixtures remain staging/testing-only, offline, reserved-domain and persist through the existing provenance/backup system. No fictional production records.

Known limits: CV remains Task06 simple PDF-only (2 MiB, three/account), no antivirus certification, no candidate RSVP/automated notification, no realtime push and no real-device/screen-reader certification. Backup JSON size cap must be monitored as resumes/events grow. Rollback to old code against an in-use new database is unsafe because old code ignores stages/expiration and cannot audit correctly; follow separate-target recovery and reconciliation instructions. No production deployment or data change was performed.
