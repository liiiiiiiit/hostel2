# Services directory — implementation and verification

## Baseline and architecture

Inspected the actual default branch `codex/provider-panels-sqlite` at `cc9cfa6fdc7f49c3dcb99c7736d5e8fa06f5c8f8` before implementation (24 November 2026). It contains Jobs and Tours, but no Services directory, taxonomy, inquiries or administration.

The feature branch `codex/services-directory-20261124` retains the subsequent tested audit release `6b0458f15d55e545961fc23031e280b6aa59d8e9` from `codex/full-stack-audit-20261122` (PR #8). This prevents the feature release from undoing the audit fixes. Review/merge the audit PR first, then retarget/merge the Services PR into the default branch. Neither branch is merged automatically.

The existing stack remains React 19, TypeScript, Vite 8, Tailwind 4, Express, Node 24 and SQLite/libSQL (`@libsql/client`, no ORM). Implementation follows Jobs/Tours: module SQL tables, Zod action schemas, shared transactional API dispatcher, actor-scoped bootstrap state, lazy React pages, and an Admin workspace tab. It reuses the scrypt/session authentication, durable request rate limits, CSRF/origin checks, upload pipeline, card/carousel surfaces, map component, four-language dictionaries and localized public routing/SEO. No dependencies were added.

## Database changes and safety

The additive, transactional `services-v1` module migration creates:

- `service_categories`: localized names, slug uniqueness, icon, display order, active flag and optimistic version.
- `service_listings`: category FK (`RESTRICT`), localized content, public contacts, media, coordinates, languages, highlights, flags, timestamps and optimistic version.
- `service_requests`: listing FK (`RESTRICT`), private applicant details, original title snapshot, status, unique request ID and fingerprint for idempotency.
- `module_migrations`: records one-time taxonomy initialization. Four supporting indexes are included.

Six initial categories are inserted exactly once: medical/dental, restaurants/cafés, translation/legal/residency, beauty/wellness, exchange/financial and other. No businesses or inquiries are seeded. Deleting an unused initial category does not cause it to reappear at restart.

Existing schema versions, IDs, accounts, password hashes, provider records, jobs/tours, bookings and other rows are not rewritten by this migration. `db:check` now includes the module tables, columns, indexes and migration marker. Listing/category edits use version checks to reject stale concurrent updates. Category deletion is refused while listings reference it; listing deletion is refused while inquiries reference it. Unpublishing preserves history. Disabling a category hides its listings and blocks new inquiries without deleting anything.

Inquiries are private to administrators; public and provider state never includes applicant details. Retries with the same request ID and input return the same reference; changed input with the same ID is rejected. The existing request limiter caps inquiry attempts at five per minute per network bucket. An inquiry is a contact request, not a confirmed appointment or reserved time slot. No automatic message is sent to the business.

Saved cover/gallery URLs are included in the existing media-reference checks so cleanup/deletion does not remove attached images. Existing full snapshot backup/restore automatically includes all module tables and indexes.

## Admin workflow

1. Sign in through the existing menu login as an administrator and open **Services**.
2. **Service categories**: edit the seeded names, order, icon and visibility, or add a category with names in all four languages.
3. **Service listings → Add service**: select a category and enter a unique slug. Drafts may be incomplete. Publishing requires title, short/full description, address and hours in Persian, English, Russian and Armenian, plus a city.
4. Add public phone/social/website links, spoken languages, optional prices, localized highlights and optional paired coordinates. External contact/map links must use HTTPS. Upload PNG/JPEG/WebP through the existing image pipeline (4 MB per image; up to 20 gallery entries), or enter accepted image URLs. Choose a cover.
5. Enable publication, optional featured/verified badges and the inquiry form, then Save. The business verification badge is an admin assertion; it does not independently verify a map pin.
6. **Incoming requests** shows all inquiries with contact details, reference, preferred date and note. Filter by service/status and change status between New, Contacted and Closed.

Only administrators manage this module. Existing employer, tour-provider and hostel-manager permissions are unchanged. Businesses do not receive separate accounts or dashboards as part of this module.

## Public pages and integration

`/{fa|en|ru|hy}/services` provides debounced search, category/city/spoken-language filters, verification/featured filters, pagination, loading/empty/error states and retry. `/{lang}/services/{slug}` includes gallery, localized description/highlights/hours/prices/address, public contact links, Google/Yandex directions and optional registration-free inquiry. `/services` and `/services/{slug}` redirect to Persian on the Express/Vercel hosts.

Services appears in desktop/mobile navigation, footer, the homepage quick-action grid and a featured-first/latest six-card homepage preview. The existing six-slide hero is retained. Deep-link HTML metadata and sitemap include active services outside that six-card preview. Unpublished services/categories are excluded from public lookup. Persian is RTL; the other languages are LTR. New labels and messages live in `src/i18n/services.ts` with matching keys across all four languages.

## API contract

Public REST reads require no account:

| Method and path | Result |
| --- | --- |
| `GET /api/service-categories` | Active `categories` and available `cities` |
| `GET /api/services` | `items`, `total`, `page`, `pageSize` |
| `GET /api/services/:slugOrId` | Published `service` |
| `POST /api/services/:id/request` | Action result and `serviceReference` |

List filters: `category` (slug/ID), `city`, `language_spoken` (`fa/en/ru/hy`), `search`, `featured`, `verified`, `page` (default 1), `pageSize` (default 12, maximum 48). Boolean filters accept `true/false/1/0`.

Admin reads: `GET /api/admin/services`, `/api/admin/service-categories`, `/api/admin/service-requests`. Each returns admin-scoped Services state and requires a valid active admin session. Mutations: POST collection, PUT `/:id`, DELETE `/:id` for listings/categories; PATCH `/api/admin/service-requests/:reference` with `{previous,status}`.

REST mutations reuse `POST /api/app` actions `saveService`, `deleteService`, `saveServiceCategory`, `deleteServiceCategory`, `requestService`, `updateServiceRequest`. They require existing same-origin/session rules and `X-Requested-With: YerevanHub`; optional `X-App-Language` selects errors. PUT bodies carry the current `version`; DELETE supplies `version` in JSON or query. New listing/category IDs are UUIDs with `version:0`; successful inserts start at version 1. Full listing types are in `src/types/services.ts`.

Inquiry body: `{requestId: UUID, version: listingVersion, name, contact, preferredDate?: 'YYYY-MM-DD'|'', note?: string}`. Contact must be a valid phone/email; dates cannot precede today in Yerevan. Success exposes only a reference and public state. Backend rejects unpublished, inactive-category, disabled-inquiry or stale-version requests. No caller-supplied flags bypass server checks.

## Setup and release

There is no separate seed command. Normal server startup and `npm run db:migrate` both apply the additive migration once. Preserve the current production `.env`, `DATABASE_URL`, database file, media directory and session configuration. Never run demo fixtures against production.

After reviewing the stacked PRs, follow `SAFE_DEPLOYMENT_PLAN.md`: stop web service and every worker, take and verify a complete database/media backup, record the old commit, fetch/check out the approved feature commit, install/build, migrate, check, then restart. Run commands as the existing service user with its Node path and existing `.env`:

```bash
export PATH="/opt/hostel2/node/bin:$PATH"
cd /opt/hostel2/app
npm ci --include=dev
npm run lint
npm run build
npm run db:migrate
npm run db:check
```

These commands assume the backup/checkout steps have already succeeded; this is not a standalone deployment script. Check the actual configured service port (previous logs showed 3001), not an assumed 3000. Confirm the homepage, all four Services URLs, admin creation, image delivery and an intentional inquiry after release. No production deployment or production database access was performed for this task. To roll back code, stop services and return to the recorded compatible commit; retain the additive Services tables. Do not drop them or restore an older database over new inquiries without a separate reconciliation plan.

## Verification

Final execution results (24 November 2026): Tests use disposable local databases and a disposable local HTTP server. Fixture businesses, accounts and images never enter production.

- `npm ci`: completed.
- `npm run lint`: passed both TypeScript frontend and serverless API checks.
- `npm test`: 178 tests passed, zero failed/skipped (including nine new backend Services tests and one routing regression).
- `npm run build`: production Vite build passed.
- `npm run db:migrate`, `npm run db:check`: passed on an explicit isolated database; `schemaReady: true`, Services ready, zero foreign-key violations, `integrity_check: ok`.
- `BROWSER_PATH=<Chromium executable> npm run test:services`: passed built-client admin/public/inquiry/restart and failure/retry/unpublication workflows. 176 public layouts passed (directory/detail × four languages × two themes × eleven widths: 320, 360, 390, 430, 640, 768, 820, 1024, 1366, 1440, 1600), plus admin editor checks at 320/390/820/1366; no page runtime errors. CI runs this after building.

Browser automation aborts external requests intentionally, so real map tiles, external social/contact services and external image hosts are not availability-tested. Local uploaded images are exercised. The layout matrix uses headless Chromium at representative viewport sizes; it is not a physical Android/iPad or Safari certification. This module does not add automated business verification, appointment scheduling, payment or provider notifications.

## Changed files

New module files: `server/services.ts`, `server/service-routes.ts`, `server/service-pages.ts`, `server/services.test.ts`, `src/types/services.ts`, `src/i18n/services.ts`, `src/services/services-directory.ts`, `src/components/ServiceCard.tsx`, `src/components/ServicesAdmin.tsx`, `src/views/ServicesView.tsx`, `src/views/ServiceDetailView.tsx`, `scripts/services-browser-smoke.mjs`, `SERVICES_MODULE.md`.

Integration files: `server/database.ts`, `server/repository.ts`, `server/api.ts`, `server/dev.ts`, `scripts/database.ts`, `api/app.ts`, `vercel.json`, `src/types/index.ts`, `src/App.tsx`, `src/views/AdminPanelView.tsx`, `src/views/HomeView.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/utils/navigation.ts`, `src/utils/navigation.test.ts`, `src/utils/public-routes.ts`, `src/utils/public-seo.ts`, `src/utils/tour-contact.ts`, `package.json`, `.github/workflows/browser-audit.yml`. `src/components/HostelLocationMap.tsx` adds an optional context-specific map note while preserving existing property defaults.
