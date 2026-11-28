# Task 10 API and architecture

Approved base: `a2062b8a9f323beeb2c636617bdda70a562f12a4` on `codex/09-rental-owner-dashboard`, explicitly accepted by the repository owner in this task. Feature: `codex/10-service-provider-dashboard`; PR #21 targets that base branch. Upstream PRs remain separate review/merge decisions. No production database or service is changed.

## Before and after

Before: administrators own the Services workflow through existing `service_categories`, `service_listings`, `service_requests`, `ServicesAdmin`, validation, public search, media and central moderation. Customer requests are admin-only; verified is an admin-editable flag.

After: the same tables, public APIs, multilingual editor and request workflow remain authoritative. An additional `services.provide` capability on an existing account enables a private business dashboard. Existing user roles, credentials, unrelated capabilities and administrator access are preserved. Administrators create accounts or explicitly authorize existing identities; ordinary registration never grants business privileges.

Migration `service-provider-v1` adds six tables and five indexes transactionally and idempotently:

| Table | Purpose |
|---|---|
| service_provider_accounts | One optional business capability/profile per user, active/suspended, optimistic version |
| service_provider_listings | One nullable current owner per existing service, assignment version |
| service_provider_request_access | Explicit customer consent captured for the recipient at request creation |
| service_provider_media | Asset creator, business and service scope |
| service_verification_reviews | Private evidence, authorized reviewer, decision and timestamp |
| service_provider_events | Contact-free activity history |

Existing listings, verification flags, customer requests and accounts are not rewritten or assigned automatically. Historical verification flags are retained without inventing evidence. New positive verification decisions require supporting evidence or an internal evidence reference. Assignment withdraws publication and verification, revokes affected sessions and requires fresh moderation. Suspension hides the provider's services and prevents new requests while preserving all data.

## Read endpoints

All private responses use no-store. All protected reads hydrate live permissions from the database.

| Endpoint | Authorization / result |
|---|---|
| GET /api/service-provider?search=&serviceId=&page=1 | Active authorized provider: own business, listings, consented requests, statistics, latest 100 activity events; ten requests/page |
| GET /api/admin/service-providers | accounts.assign: all providers, eligible existing accounts and listing ownership/version |
| GET /api/service-requests/:reference | Private high-entropy receipt bearer: title, operational status, creation time only; never name/contact/note |
| GET /api/services and /api/services/:slug | Existing public directory, additionally hides suspended/inactive owners |

The provider request identifier is a separate SHA-256 identifier; the customer receipt is never returned to providers. Possessing a customer receipt does not permit changing a request. Customers must keep receipts private.

## Mutations

Use existing POST `/api/app`, body `{"action":"...","args":[...]}`, session cookie, `Content-Type: application/json`, `X-Requested-With: YerevanHub`, `X-App-Language: fa|en|ru|hy`. Existing CSRF, validation, rate limits, transactions and conflict/error handling apply.

| Action | Argument | Policy |
|---|---|---|
| saveServiceProviderAccount | {userId?: existing user ID,version,name,email,phone,password,status,businessName,bio,city} | accounts.assign; new accounts version=0 and password 12–128; existing password empty preserves credentials |
| grantServiceProvider | {userId,businessName,reason} | accounts.assign; explicit existing active user |
| assignServiceProvider | {serviceId,ownerId: existing user ID or null,version,reason} | accounts.assign; null returns administrator management |
| saveServiceBusiness | {version,businessName,bio,city} | services.provide + live active business |
| saveProviderService | {service: existing serviceInput,submit:boolean} | Own listing or new version=0; featured/verification cannot be changed; images must be retained existing assets or own scoped uploads |
| updateProviderServiceRequest | [providerRequestId,previous,next] as the action's three args | Consent recipient must still own listing; new → contacted/closed, contacted → closed; terminal reopening rejected |
| reviewServiceVerification | {serviceId,version,verified,evidence} | platform.admin; evidence 1–4000, optimistic listing version, audit and update atomic |

The existing saveService action also requires `verificationEvidence` for a new positive verification flag and records an explicit review. This optional input is never part of public listing output. Existing legacy verified records can be edited without creating fictional evidence. Negative decisions record an explicit revocation. The original administrator category/listing/request APIs remain administrator-only.

Public listings expose providerRequestsEnabled only when an owner is assigned; the consent checkbox is shown for these listings. Existing requestService accepts optional `shareWithProvider:boolean` (default false). Without consent, the request remains administrator-only. Assignment never transfers old request contacts to a new owner. Existing requests are never retroactively shared. Idempotent retries retain their original consent and recipient.

POST `/api/service-provider/media?serviceId=UUID`: raw JPEG/PNG/WebP, session and CSRF header. Save draft first. Shared Sharp validation/re-encoding strips metadata; limit 4 MiB/input, 30 calls/provider/minute, 60 assets/service. Returns existing {success,image:{id,url}} pattern.
POST same endpoint with `&deleteMedia=UUID`: caller must own both service and asset; detach and save first; referenced assets cannot be deleted. Existing deletion queue handles storage cleanup. Media is public business imagery; never upload customer identity documents or verification evidence.

## UI, source and operations

Main account menu → business dashboard. Administrator workspace → service providers, existing services editor and moderation center.
Shared `ServicesAdmin` uses provider mode; categories, featured and verification controls remain administrator-only. Descriptions, hours, prices, contact and map fields are public business information. Business account email/phone/profile and customer notes stay in private endpoints. Activity events contain no request contents, credentials or evidence.

Modified areas: services/action/API/authorization/repository; migration/startup/readiness/environment guard and database CLI; existing service editor/detail page, admin workspace, navigation, header and login routing; new business types, four-language labels, server storage/actions/media routes/dashboard/admin component; demo recipe, regression tests and disposable staging browser fixture. See PR Files changed for the exact inventory.

No new dependencies, environment variables or npm commands. Use existing db:migrate/db:check, demo:* and test commands. Recipe v6 authorizes five existing synthetic travelers as service businesses, associates forty default service listings and shares fifteen consented requests. Counts adapt to custom configuration. Recipes 1–5 stay reproducible and existing batches are not silently upgraded. Random credentials stay only in protected manifests outside Git.

## Boundaries

Availability is the existing inquiry toggle and working hours; there is no paid checkout, inventory slot locking, guaranteed appointment or automatic notification delivery. Business authorization, listing approval/publication and business verification are separate. Customer refusal of provider sharing retains the administrator-mediated workflow. Profile history is capped at 100 displayed events; full history persists. Request filtering currently loads authorized requests before pagination; no large-scale load benchmark is claimed.

See SERVICE_PROVIDER_GUIDE_FA.md, SERVICE_PROVIDER_STAGING_FA.md and SERVICE_PROVIDER_TEST_RESULTS.md. Do not deploy while a critical dependency, migration or security failure remains unresolved. Old code does not enforce provider ownership/suspension and consent boundaries; a code-only downgrade after use is unsafe.

Listings linked to provider ownership, uploaded assets or verification evidence are retained for accountability; administrator deletion returns referenced/409. Use existing moderation archive or deactivate instead. Unlinked administrator listings keep their existing delete behavior.

## Changed-file inventory

| Area | Files |
|---|---|
| Business persistence and policy | server/service-provider-storage.ts, server/service-providers.ts, server/service-provider-routes.ts |
| Existing Services integration | server/services.ts, src/components/ServicesAdmin.tsx, src/views/ServiceDetailView.tsx |
| Authorization and API | server/authorization.ts, server/action-authorization.ts, server/api.ts, server/repository.ts, src/utils/authorization.ts, src/types/index.ts |
| Startup and operations | server/database.ts, server/persistence.ts, server/environment.ts, scripts/database.ts, vercel.json |
| Business and tracking UI | src/views/ServiceProviderView.tsx, src/components/ServiceProvidersAdmin.tsx, src/views/ServiceTrackingView.tsx |
| Routing and language | src/App.tsx, src/components/Header.tsx, src/views/AdminPanelView.tsx, src/utils/navigation.ts, src/types/serviceProvider.ts, src/types/services.ts, src/i18n/serviceProvider.ts |
| Synthetic ecosystem | server/demo/fixtures.ts, server/demo/materialize.ts, server/demo/manager.ts, server/demo.test.ts |
| Regression coverage | server/service-providers.test.ts, server/services.test.ts, scripts/service-provider-browser-smoke.mjs, scripts/services-browser-smoke.mjs, scripts/staging-smoke.mjs |
| Documentation | SERVICE_PROVIDER_API.md, SERVICE_PROVIDER_GUIDE_FA.md, SERVICE_PROVIDER_STAGING_FA.md, SERVICE_PROVIDER_TEST_RESULTS.md |
