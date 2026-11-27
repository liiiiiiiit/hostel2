# Task 09 — Rental owners

## Verified baseline and dependency

The actual default branch was `codex/07-employer-recruitment-dashboard` at `3e2139917ff6191465537ca8bea0fcf82f4b1c4f`. Task 08 is implemented in open PR #19, not assumed merged. This feature branch, `codex/09-rental-owner-dashboard`, starts at its inspected head `f8cd8c4a803bd5e38077adc2f7228591a93d89d2` and requires that moderation implementation. Review/merge that dependency first; this PR targets its branch. No production service, database or Nginx configuration was changed.

## Before / after

Before: administrator-managed rentals in `properties(kind='rental')`, translations/images in existing shared tables, private guest inquiry tracking, central RBAC and moderation. No rental-owner identity, association or dashboard existed.

After: the same property, inquiry, translation, image, publication validator and editor remain authoritative. A supplemental `rentals.manage` capability extends an existing identity. `users.role`, account IDs, credentials, manager assignments and job/tour provider profiles are preserved. A traveler, manager or provider can also manage rentals without a duplicate identity. Administrator-created owners start as ordinary travelers plus this capability. Public self-registration does not grant it. Existing registered users can be explicitly authorized by an administrator by user ID; email matching never assigns properties or inquiry access.

## Permission matrix

| Operation | Visitor / ordinary account | Authorized current owner | Different owner | Administrator |
|---|---|---|---|---|
| Browse eligible published rentals | Yes | Yes | Yes | Yes |
| Submit inquiry; private tracking | Yes | Yes | Yes | Yes |
| Create rental draft | No | Yes | Own new rental only | Existing admin editor |
| Edit descriptions, pricing, conditions, images, exact address | No | Own rentals | No | All rentals |
| Modify internal admin notes / commission / verification | No | No | No | Yes |
| Submit for moderation / archive | No | Own rentals | No | Yes |
| Approve or publish | No | No | No | Yes, existing moderation center |
| Read inquiry contacts / update status | Own tracking receipt only | Explicitly consented inquiries addressed to that owner, still current owner | No | All inquiries |
| Owner profile | No | Own profile | No | Manage all owner accounts |
| Assign / suspend / reset owner password | No | No | No | `accounts.assign` only |

Account activation, owner authorization, content moderation, inquiry availability and business verification are independent. Owner authorization never awards a business badge. Account edits, suspension and reassignment revoke affected sessions and recovery tokens. Authoritative database checks run on every protected request, including raw image operations; client flags are not trusted. Suspending owner access hides their listings and rejects new inquiries while preserving all rows. Their ordinary account and unrelated capabilities remain intact if globally active.

## Additive migration

`rental-owner-v1`: five tables, four indexes. Migration is transactional, idempotent, part of startup/readiness and the existing guarded migration CLI.

| Table | Purpose / constraints |
|---|---|
| `rental_owner_accounts` | One capability/profile per existing user; active/suspended; positive optimistic version; FK restrict |
| `rental_owner_properties` | Unique rental ID, composite FK to shared properties; nullable current owner; version; inquiry availability |
| `rental_owner_inquiry_access` | Inquiry-specific consent recipient; historical requests are never automatically shared |
| `rental_owner_media` | Uploaded asset creator and property scope; existing media backend and deletion queue |
| `rental_owner_events` | Sensitive action history; no passwords, tokens, tenant contacts or exact addresses in event details |

No existing rentals, accounts, password hashes or inquiries are rewritten by this migration, and no historical property is assigned automatically. Existing rentals remain admin-managed. `room` is an additive supported property type alongside apartment, studio, house and villa; the existing SQLite text column is retained.

## Publication, conflicts and privacy

Owners save drafts, complete the existing four-language/photo/publication requirements, then submit. Shared moderation intercepts publication intent and places it in pending review, not public view. Material edits withdraw publication through that same moderation layer. Owners cannot undo administrator suspension or archival. Reassignment withdraws publication, clears business verification, revokes both owners' sessions and leaves previous inquiry contacts inaccessible to the new owner. Returning to administrator management requires an explicit reassignment to null and review.

Property updates compare `expectedUpdatedAt`; account/profile and assignment/availability updates compare integer versions; inquiry updates compare previous status and timestamp. All related database writes and audit records are in a single write transaction. Database or audit failure rolls back the mutation. A stale write is a failure, not a successful notification. Concurrent-write regression tests use two independent SQLite connections.

Exact internal addresses are returned only in the current owner's private property editor and existing administrator flows. Internal administrator notes, private tracking tokens and unrelated inquiries are omitted. The public consent checkbox defaults off. A new inquiry without consent is administrator-only. With consent, the recipient owner ID is captured at submission and rechecked against current ownership on every read/update. Inquiry status is operational bookkeeping, not a contract, payment or tenant confirmation. The shared status transition map rejects terminal-state reopening.

Images use the current local/blob storage backend, Sharp content validation/re-encoding/metadata stripping, 4 MiB input limit, 30 owner image requests/minute and 60 stored images/property. Upload and deletion both recheck ownership. Owners cannot attach arbitrary external URLs, borrow other users' uploads, delete referenced assets or obtain global `media.manage`. Media URLs are public listing assets; do not upload identity documents or tenant data as photos.

## Source map and operations

- Server: `server/rental-owner-storage.ts`, `rental-owners.ts`, `rental-owner-routes.ts`; integration in authorization, API, domain, repository, database and migration readiness.
- Shared UI: existing `PropertyManagementPanel.tsx` gains an owner mode; `RentalOwnerView.tsx`, `RentalOwnersAdmin.tsx`; main menu/login navigation and public inquiry consent.
- Localization/types: `src/i18n/rentalOwner.ts`, `src/types/rentalOwner.ts`, `src/utils/rental-owner.ts`, private fetch helper.
- Demo recipe v5: ten existing synthetic traveler identities additionally authorized as owners; twenty rentals and fifteen consented inquiries with default counts. No extra unsupported role. Protected manifest marks capabilities; earlier recipe versions stay byte-identical. Existing imported batches are not silently upgraded.
- Tests: `server/rental-owners.test.ts`, expanded `server/demo.test.ts`, `scripts/rental-owner-browser-smoke.mjs` run by the existing disposable staging workflow.

No new environment variables, npm commands, dependencies, database engine or production deployment is introduced. Existing encrypted backup, media persistence, no-notification staging and pre-migration fingerprint guard are reused. See the API, Persian guide, staging procedure and actual test results in the adjacent `RENTAL_OWNER_*.md` documents.

## Limits

Owners are admin-created or explicitly authorized, not self-approved. Availability controls accepting rental inquiries, not a date-based lease inventory/calendar or signed tenancy agreement. Admin-mediated contact is preserved for visitors declining owner sharing. Owner history shows the latest 100 events; full audit data persists. Inquiry lists are paginated by ten; the existing lightweight property loading pattern is retained. No load benchmark or claim of complete security is made. A code-only downgrade after owners are used is unsafe because old code does not enforce this ownership/consent model; prefer a forward fix or a reviewed separate-target recovery.
