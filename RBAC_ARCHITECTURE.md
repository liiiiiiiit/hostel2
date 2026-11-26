# Task 05 — authorization architecture and permission matrix

## Verified source and prerequisites

Inspected actual GitHub default branch `codex/03-demo-data-manager` at `1fe522f87c9079ac4742c7245fb4420d7e853bbb` on 2026-11-26. Task 04 PR #15 remains open/unmerged. The owner-selected, previously tested/deployed Task 04 commit `e4a19631db3814b4eea29ac35dda4124c08d84df` is this feature's base, not an assumption that it was merged. Tasks 01–04 implementations and tests exist on this base. Branch: `codex/05-rbac-authorization`. Review/merge prerequisites in order; no automatic merge/deployment. No live VPS access or database changes occurred.

## Before and after

Existing SQL has `users` with base roles admin/hostel_manager/traveler, scrypt `user_credentials`, hashed `sessions`, `manager_properties`, and one `provider_accounts` profile per provider identity. Provider profiles overlay the base traveler role with job_provider/tour_provider. Historical non-provider owners could regain provider privileges merely by owning a listing; direct role checks were distributed across APIs, native services and React.

This model remains compatible. No generic editable permission catalogue, unused future role, duplicate identity or new multi-role account system is introduced. Current dedicated panels use one effective role. Historical accounts may already own both kinds of listings or combine management with provider access; those existing capabilities are frozen into explicit migration grants. New provider identities use the existing profiles. Supporting additional primary roles later requires schema, policy, ownership, UI and tests together; unknown roles/actions fail closed now. Future rental owner, service provider and moderator roles are not assignable and do not gain partial/untested privileges.

`src/utils/authorization.ts` defines reusable active-account permissions, hostel assignment and ownership predicates. `server/action-authorization.ts` exhaustively maps every exposed action to a policy; API startup refuses unmapped actions. Existing resource/token validation remains authoritative inside domain/native services. SQL provider mutation services hydrate the live principal before using ownership/admin predicates. Session reads hydrate current roles/grants rather than trusting browser state. Private provider DTOs and manager SQL scopes also require current capabilities; dormant assignments cannot leak data after role removal.

## Role-permission matrix

| Capability | Anonymous | Traveler | Hostel manager | Employer | Tour provider | Administrator |
| --- | --- | --- | --- | --- | --- | --- |
| Browse published records / essential guest forms | Yes | Yes | Yes | Yes | Yes | Yes |
| Private token tracking / supported guest changes | Exact token | Exact token or own supported booking | Token or assigned scope | Exact token / own supported booking | Exact token / own supported booking | All supported management |
| Profile, password, saved places | No | Own | Own | Own | Own | Own |
| Hostel inventory, reception, booking management | No | No | Assigned hostels | No | No | All |
| Jobs/applications | Public only | Public only | Public only | Own listings/applications | Public only | All |
| Tours/bookings | Public only | Public only | Public only | Public only | Own tours/bookings | All |
| Rentals/services/articles/review moderation/coupons/settings | No | No | No | No | No | Existing admin operations |
| Upload/remove media | No | No | No | No | No | Validated/ref-protected |
| Assign roles, activation and hostel membership | No | No | No | No | No | Validated/versioned; last active admin protected |

Historical explicit grants add jobs.manage/tours.manage only for the respective owned resources; they never confer admin/media/services access. Listing publication verification and account activation remain separate. Role changes do not certify a property or automatically change business ownership.

## Additive migration and mapping

- `legacy_provider_access(user_id,provider_role)`: composite primary key; users FK with ON DELETE CASCADE; only job_provider/tour_provider allowed. Migration snapshots historical listing owners who do not already have provider profiles, excluding administrators. Inactive identities retain their historical associations but cannot use any permission while inactive. The module marker prevents privileges from being inferred again after revocation.
- `authorization_events`: persistent security audit with actor/target IDs, before/after access JSON, reason and timestamp. Target/time index. IDs deliberately have no user FK so evidence can outlive account deletion. No password/hash/session token is recorded. Provider organization is preserved in before-state audit when its profile is explicitly revoked.
- `module_migrations`: `authorization-v1` marker. Existing user IDs, hashes, salts, session schema, listing owners, provider profiles, manager assignments and business records are untouched by migration.
- Old admin/manager/traveler mappings remain unchanged. Existing profile roles remain unchanged. Historical owner inference becomes explicit legacy grants once. Session format stays unchanged; unchanged principals retain sessions through migration.
- Readiness includes new columns, marker and audit index. Pending authorization migration participates in the existing verified pre-migration backup guard. Managed upgrades cannot start without a matching current recovery point. Migration DDL/backfill/marker commit atomically; failure rolls back.

## Secure assignment workflow

Admin → Roles & access reads `/api/admin/account-access` (admin-only) and submits `setAccountAccess` through the existing action API, CSRF/origin validation, rate limiting, schema validation and write transactions. Fields: existing account ID, optimistic version hash, supported effective role, account-enabled flag, hostel IDs, optional revoke-historical-access switch and mandatory reason. Profiles/password creation continues through the existing manager/provider workflows; this does not reset credentials.

Only a live administrator can assign access. A stale version, unknown role, invalid hostel, empty manager assignment, forged origin or nonadmin caller is rejected. The last active effective administrator cannot be demoted/disabled, including concurrent attempts. Successful real access changes revoke ALL target sessions and consume outstanding recovery/verification tokens in the same transaction as the access mutation and security event. No-op access saves do not revoke sessions. A self-demoted administrator's response is anonymous and redacted immediately.

Explicit role changes update the existing role/profile model. Removing a provider role removes its current profile assignment; before-state audit retains its organization. Listing owner IDs and historical requests remain unchanged. Manager memberships are replaced only when an administrator explicitly saves a manager's selected hostels; other roles retain dormant memberships for history, without granting access. Changing effective role or choosing revoke-historical-access clears legacy grants. Activation does not imply business verification.

## Synthetic fixtures and rollback limits

The generator already provisions providers through native saveProvider and managers through supported services; no new synthetic roles are needed. Their creation now produces tracked security audit rows. The old API legacy-listing fixture now explicitly models pre-upgrade migration, rather than expecting new ownership to create privileges after migration. Existing provenance validation, idempotent import and conservative cleanup remain tested. Explicit account/role edits make an imported batch changed; do not force-clean it.

Do not drop the new tables/marker or roll back to code that re-infers privileges from ownership: revoked historical provider access could reappear. A safe rollback must retain this security behavior (forward patch), or remain offline until compatible code is prepared. Restoring an old database over current records is not a code rollback. Keep verified backups and restore only to separate targets for investigation.

No new environment variables or npm commands. New API action/GET route and administrator UI only. Existing `db:migrate`, `db:check`, backup/restore and demo tools handle the additive module.
