# TASK 11 — Central administration architecture and API

## Base and scope

The owner selected `codex/10-service-provider-dashboard` as the repository default before this task. Base: `e172386ad60a0fcae1b9d4313bfd894ef3312544`. PR #21 remains unmerged; no independent GitHub review is implied. This feature is isolated on `codex/11-central-admin-dashboard` (PR #22). No production deployment or database was touched.

The inspected base already implements RBAC, versioned moderation, rental owners, service providers, recruitment, job seekers, tours, scoped SQLite/libSQL storage, local/blob media, encrypted backups, staging isolation and Demo Data Manager. These are reused. No parallel domain tables or provider module were created.

## Before and after

Before, `AdminPanelView` composed domain-specific editors backed by the existing application-state API. Its overview calculated statistics from client arrays. Individual components had independent navigation and filtering. The established moderation service already enforced revisions and publication transitions.

After, a searchable grouped navigation preserves those editors and adds a small administration shell, SQL overview, bounded cross-module registry, private casework, operational monitoring and controlled exports/imports. `X-Admin-Workspace: shell` requests only the current administrator, own saved places and settings through the existing safe serializer. Legacy editors hydrate their existing authorized state explicitly when opened; requests without this header retain the original API contract. The header never grants permissions. The central lists paginate in SQL; old editors retain their original loading behavior on demand.

## Existing workflow inventory and routing

| Area | Preserved component / workflow | New central entry |
| --- | --- | --- |
| Accounts and role assignment | AccountAccessManager; server `accounts.assign` policies | Users, seekers, access |
| Hostel managers | Manager create/activation and property assignment | Managers |
| Properties and rooms | PropertyManagementPanel / PropertyOperationsPanel; shared properties, translations and inventory | Hostels, rentals, rooms |
| Reservations, arrival and cash | AdminBookingCard, ReceptionPanel, FinancePanel; booking/status/capacity/finance domain actions | Reservations and existing operations |
| Rental accounts/inquiries | RentalOwnersAdmin; rental owner activation/assignment and inquiry status handlers | Owners, inquiries |
| Employers/recruitment | ProviderAccounts, JobsView; employer organizations, job applications, notes/interviews | Employers, jobs, applications |
| Job seekers | AccountAccessManager and existing seeker profiles/consent APIs | Seekers registry and account access |
| Tour providers/bookings | ProviderAccounts, ToursView; existing ownership/bookings | Providers, tours, bookings |
| Services/categories/requests | ServiceProvidersAdmin, ServicesAdmin; verification evidence and scoped request handling | Providers, services, categories, requests |
| Articles/translations | AdminArticles and existing translation fields | Articles and translations registry |
| Reviews and coupons | Existing approval/reply and coupon handlers | Reviews and coupons |
| Moderation | ModerationCenter; versioned `moderateContent` | Existing review decisions plus safe bulk archive/restore |
| History | Existing audit tab | Safe combined activity projection, private casework |
| Profile/settings | AccountSettings / PlatformSettings | Separate settings entry; labels improved |
| Demo data | Existing DemoDataManager | Staging only and only when its existing server flag permits |
| Media and monitoring | Existing upload/deletion worker, backup receipts | Media registry and actual health endpoint |

Every existing API action retains its explicit policy in `server/action-authorization.ts` and its domain ownership/consent checks. New central mutations require live `platform.admin` authorization on the server. Administrator account deactivation takes effect even for an existing session. UI navigation is not an authorization boundary.

## Read endpoints

All require an authenticated live administrator, return `Cache-Control: no-store`, and use a read transaction:

- `GET /api/admin/central/records`: `module`, `search` (max 120), `status`, `page` (1-based), `pageSize` (1–50), `sort` (`title`, `status`, `updatedAt`, `id`), `direction` (`asc`, `desc`), `language` (`fa`, `en`, `ru`, `hy`). Defaults/validation: `adminQuery` in central-admin-registry.ts. Response: `{items,total,page,pageSize,statuses,module}`. Stable ID tie-break; static SQL identifiers; bound values; Unicode-aware case-insensitive search with escaped GLOB metacharacters.
- `GET /api/admin/central/summary`: actual counts of all 25 registry modules, pending reservations/moderation, open support/reports, unread activity and actual queue counts. Confirmed/completed AMD totals are agreed reservation values, **not collected revenue**. Future-dated historical events are excluded from unread counts until their observation time.
- `GET /api/admin/central/cases`: optional module/targetId/status/kind, page; 20 rows per page. Private note/report bodies exist only here for administrators, never public/client domain exports.
- `GET /api/admin/central/health`: current connectivity, foreign-key enforcement, logical DB bytes, process uptime/environment, tracked media bytes/count, local filesystem free bytes if available, backup receipt metadata and notification queue counts. No secrets, paths, recipient addresses, raw logs or SQL console.

Registry modules: users, managers, hostels, rooms, bookings, rentalOwners, rentals, rentalInquiries, employers, seekers, jobs, applications, tourProviders, tours, tourBookings, serviceProviders, services, serviceRequests, categories, articles, translations, reviews, coupons, media, activity. Registry fields are explicit minimal projections; private descriptions, contacts, CVs, tokens, credential hashes and internal event payloads are not projected. Safe activity combines established audit/authorization/moderation/owner/provider/recruitment events with new central actions; it does not fabricate historical events.

## Mutations

Use existing `POST /api/app` JSON `{action,args:[payload]}` and existing session/CSRF defenses. Input schemas are in `centralAdminSchemas`; normal error envelope is unchanged.

| Action | Contract and limit |
| --- | --- |
| adminExport | query + format csv/json + reason; filtered maximum 1,000 rows; spreadsheet formula escaping; bearer identifiers hashed for application/tour/service requests |
| adminPreviewImport | format csv/json + content, max 250,000 characters; categories only, max 100; no writes |
| adminCommitImport | same original preview source + confirmed:true + reason; strict shared category schema, optimistic versions, slug uniqueness, atomic commit |
| adminPrepareBulk | module, unique ids max 30, status archived/pending_review; returns exact versioned snapshot for review |
| adminApplyBulk | existing moderationInput, confirmed:true; shared moderation transition checks and atomic transaction |
| adminCreateCase | existing module/targetId, kind note/report, body 1–4,000; escaped React rendering |
| adminResolveCase | id, current version, open/resolved, reason; rejects stale edits |
| adminReadActivity | ISO timestamp string as first argument; own monotonic read cursor; cannot acknowledge future time |
| adminDeleteMedia | id + confirmed:true + reason; rejects referenced media and queues existing storage cleanup |
| adminRecordPrivateReport | format csv/json + confirmed:true + reason; audit gate before original private reservation report |

Reasons are trimmed and bounded by the input schema. The UI asks explicit review confirmation for imports, exports, bulk changes, private reservation reports and media removal. Bulk archive supports existing moderated properties, rentals, jobs, tours, services, articles and reviews; restoration is **to pending_review**, requiring a new authorized publication decision. No bulk user deletion, blanket publish or raw SQL import exists.

Canonical category import/export fields: `id,version,slug,icon,order,isActive,fa,en,ru,hy`. JSON accepts a rows array or `{module:"categories",rows:[...]}`. CSV requires these ten unique headers, quoted RFC4180 fields, optionally BOM. New rows use generated UUID and version 0; updates use current version. Import is deliberately scoped to the shared category model; arbitrary user/booking/database import would bypass domain invariants and is unsupported.

The original booking report remains available, contains authorized private operational details and has a separate privacy confirmation/reason/audit step. Prefer the minimal registry export for routine sharing. No report is a backup.

Example for a new category (generate a new UUID for each row; updates must retain their current version):

```json
{"module":"categories","rows":[{"id":"66666666-6666-4666-8666-666666666666","version":0,"slug":"synthetic-review-category","icon":"other","order":99,"isActive":true,"fa":"دستهٔ ساختگی","en":"Synthetic category","ru":"Тестовая категория","hy":"Փորձնական կատեգորիա"}]}
```

## Database and deployment

Additive, idempotent transactional migration `central-admin-v1` adds:

- `admin_cases`: scoped private notes/reports, optimistic version, creator FK SET NULL.
- `admin_activity`: action metadata/reason, actor FK SET NULL.
- `admin_activity_reads`: per-user acknowledgement, user FK CASCADE.
- Indexes `admin_cases_target`, `admin_cases_status`, `admin_activity_time`.

No old records are reassigned, rewritten or deleted by the migration. Existing migration backup fingerprint guard applies. Schema readiness includes all new tables/indexes and migration marker. No new environment variables, dependencies or npm commands. Existing commands `db:migrate`, `db:check`, `backup`, `worker:once` and demo tooling are reused. The notification/media worker must remain configured for queued work; the dashboard does not send messages itself.

A backup receipt is historical proof that a specific archive was verified when recorded, not a fresh integrity check, successful schedule assertion or restore guarantee. The screen says unavailable/none when appropriate. Use the CLI verify and separate-target restore for deployment acceptance.

## Modified files

New: server/central-admin{,-storage,-registry,-health,-routes}.ts, server/central-admin.test.ts; src/types/centralAdmin.ts; src/i18n/centralAdmin.ts; src/components/admin/CentralAdmin{Shared,Overview,Records,Cases,Health}.tsx; scripts/central-admin-browser-smoke.mjs; CENTRAL_ADMIN_*.md and actual screenshots under docs/admin/screenshots.

Integration: server/{database,persistence,repository,api,action-authorization,moderation,environment}.ts; scripts/{database.ts,staging-smoke.mjs,responsive-smoke.mjs}; src/{views/AdminPanelView.tsx,components/DashboardLayout.tsx,components/PlatformSettings.tsx,services/store.ts,services/store.test.ts}; src/index.css; src/types/index.ts; .github/workflows/staging-isolation.yml; vercel.json. Use the PR Files changed tab for authoritative paths/diff.

## Practical limits

Central SQL pages are bounded; established legacy editor panels still load their existing authorized state when opened. No production-scale load benchmark or physical iPad/Android accessibility audit was performed. Automated Chromium and existing WebKit tests complement, but do not replace, manual real-device review. The build currently warns about a main chunk slightly above 500 kB; no new dependency was added. Browser evidence covers executed workflows, not an assertion that every possible existing input combination was exercised.
