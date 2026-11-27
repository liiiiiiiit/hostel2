# Task 08 — unified moderation and publication

## Verified baseline

GitHub's actual default branch was inspected before edits: `codex/07-employer-recruitment-dashboard`, SHA `3e2139917ff6191465537ca8bea0fcf82f4b1c4f`. This differs from the default recorded during Task07. PR18 is still open/unmerged, but its head is now the default branch itself; no merge was assumed. Task08 starts from that exact commit on `codex/08-content-moderation`. Baseline lint and 241 tests passed.

React/TypeScript/Vite/Tailwind, Express/Node24, SQLite/libSQL, scrypt credentials, durable sessions, live RBAC and scoped relational persistence are unchanged. No dependency, role, permission, environment variable or npm command is added. No production/staging VPS service, database, media or Nginx configuration was changed by this work.

## Before and after / policy matrix

| Module | Existing representation / authors | Unified policy / publication prerequisite |
|---|---|---|
| Hostels | `is_published`, `listing_status`; administrator edits/publishes; assigned manager can edit location | All eight conceptual states. Existing complete-property validation applies. A manager's material location edit requests fresh review; admin location verification does not itself publish. Existing booking access/operations remain available. |
| Rentals | `listing_status`; admin only; no rental-owner role | Eight states; complete property validation, no automatic verified badge. Operational rental inquiries remain independent. |
| Jobs | `approved`, open/closed plus Task07 draft/pending/approved/rejected and expiry; employer/admin | Eight states; provider creates/edits into pending/draft and cannot approve. Published moderation still requires open, nonexpired job and active owner to accept applications. Renewal keeps its existing Task07 approval rule. |
| Tours | published/hidden/approved, capacity; organizer/admin | Eight states; organizer edits require approval; explicit publication clears the visibility-only hidden flag, but does not alter capacity, existing bookings or confirm passengers. Active owner and existing booking guards still apply. |
| Services | active listing/category, separate verified flag; admin only | Eight states; complete four-language content and active category required for approval/publication. Verification remains independent. |
| Articles | draft/published; admin only | Eight states layered over existing fields; existing article schema/unique slug validation retained. No new author role or editorial permissions invented. |
| Reviews | pending/approved/rejected; eligible visitor submits, admin moderates | Eight states; existing stay eligibility is retained on submission, including explicitly preserved historical reviews. Publication maps to native approved; no review or rating is fabricated. |

Before this change, each module's flags controlled visibility independently; jobs alone had a richer moderation lifecycle. There was no unified correction/suspension/archival queue, content-version check or decision history. Some tests directly set approval with SQL; the tour regression now exercises actual authenticated admin approval instead.

After: a shared decision policy and admin workspace retain each module's native fields. `approved` explicitly means **unpublished**. `published` permits discovery only when the module's additional conditions hold. Publishing never grants business or map verification. Existing admin editors remain trusted author/publisher workflows: explicitly saving a published listing is an authorized admin publication decision and is audited. Providers receive no self-approval exemption. Restoring a suspended/archived record requires the moderation center; legacy editor save cannot bypass the sanction, even for admin.

## Lifecycle

The exact transition graph is shared in `src/types/moderation.ts` and enforced by the native server action:

| From | Allowed next states |
|---|---|
| draft | pending review, approved, published, archived |
| pending review | draft, changes requested, approved, published, rejected, archived |
| changes requested | draft, pending review, approved, published, rejected, archived |
| approved | draft, pending review, published, changes requested, rejected, archived |
| published | draft, pending review, rejected, suspended, archived, changes requested |
| rejected | draft, pending review, approved, published, archived |
| suspended | pending review, approved, published, archived |
| archived | draft, pending review |

An administrator may approve-and-publish in one explicit decision, preserving existing workflows. Same-state decisions are rejected, not fabricated as new history. Rejection, correction requests, suspension and archival require a nonempty reason. Suspended publication can only be restored explicitly after review. Archival requires a return to draft/review before publication.

Provider job/tour material edits clear prior publication approval through existing native rules; metadata records the new pending state. A manager's location edit withdraws the hostel from public discovery until reviewed. Admin edits with explicit published intent are trusted reviewed edits. Verification, internal operational fields and capacity-only changes do not become moderation approval; fields excluded from the store comparison are listed in `moderationComparable`. Central decision conflicts use a SHA256 content snapshot in addition to the moderation version, including native version/timestamp and nested property content. Business data and metadata are written in the same transaction.

## Additive migration and audit

Marker `content-moderation-v1` creates:

- `content_moderation`: composite module/content ID PK, constrained state, positive version and update time.
- `moderation_events`: UUID, target, before/after state, validated reason, nullable user FK and timestamp; index by module/content/time/ID.
- Queue index on state/module/update time.

The migration is transactional and idempotent. It performs **no backfill and no historical row rewrite**. Missing metadata derives current legacy state; it does not fabricate old approval dates or events. New edits/decisions create metadata. Polymorphic target IDs intentionally have no cross-table FK: audit and sanction tombstones survive hard deletion and prevent a legacy editor from silently reusing a sanctioned ID. The queue only includes existing content. Actor IDs use a real user FK; user deletion nulls the actor without deleting history. Media, password hashes, sessions, reservations and provider relationships are not migrated or replaced.

`moderationReady`, startup, migration backup guard and `db:check` verify the new marker/tables/columns/indexes. A verified current encrypted backup is required by managed migration. Tests inject a migration failure, prove rollback, compare hashed contents of all old tables and restore a pre-module encrypted snapshot into a separate target.

## Authorization and visibility

| Operation | Anonymous/traveler | Manager/employer/tour provider | Administrator |
|---|---|---|---|
| Read published content | Existing public rules | Existing public rules | Public browsing; management access separately |
| Queue, previews, history | Denied | Denied | Live `platform.admin` required |
| Single/bulk moderation | Denied | Denied | Allowed with transition, content/version and confirmation checks |
| Submit/correct owned content | Existing review/request flows | Existing module-specific ownership rules | Existing admin editors |
| Read moderation reason for job/tour | Denied | Own listing only | All managed listings |
| Private recruitment notes/CVs | Existing consent/ownership policy | Own authorized application only | Existing consent policy; not copied into moderation |

Shared SQL moderation predicates cover job discovery/application/save eligibility, tours/booking, service search/cities/details/inquiries, hostel/rental/article/review public reads. These feed homepage, search, direct routes and sitemap. Public hostel/rental mutations additionally check moderation; a retry for an existing hostel idempotency key retains existing behavior. Private access to a guest's existing reservation does not publish the property or enable new bookings. Internal reception/booking management is independent of public publication.

Every decision batch (maximum30 unique targets) is explicitly confirmed. All targets are checked before writes; an invalid target, stale content, stale decision or audit failure rolls the entire batch back. Notes are plain text; previews never use HTML injection. Only controlled public content summaries enter previews; credentials, private booking details, door codes, applicant profiles and CV bytes are not included. Decision reasons are feedback, not private employer notes. Job/tour feedback is returned only to the owner/admin.

## UI and fixtures

Admin navigation adds one moderation workspace, using existing components/styles. Four-language labels, RTL/LTR, light/dark, debounced search, module/status filters, pagination20, explicit bulk confirmation and loading/error states are provided. History initially loads50 events and has cursor-based older-event loading, avoiding shifting offset pages during concurrent writes. No false success on failed backend mutations.

Demo recipe4 uses existing native generation/import/provenance services, then validated moderation actions to create all eight states across all seven modules (when counts permit at least8/module). Recipes1/2/3 remain byte-identical; old imported batches are not silently enriched. New isolated full ecosystem contains185 content metadata rows and325 events, with3880 provenance-tracked records. Contacts remain synthetic and credentials stay in protected manifests outside Git. No new fictional records were published to production.

## Practical limits

Catalog filtering uses Unicode-aware JS matching over lightweight authorized catalog rows; full content/history is loaded only for the current20-item page. It is suitable for tested fixture sizes; very large catalogs need measured SQL/full-text indexing work. Public predicates/indexes and bounded page payloads remain in use. There is no push notification or provider correction email delivery, no scheduled publishing and no automated business verification. Real-device/screen-reader/independent penetration-test certification is not claimed.

Running pre-Task08 code against an upgraded active database is unsafe: it ignores the moderation overlay. A rollback is separate-target encrypted recovery plus reconciliation of post-backup changes, not dropping the new tables or resetting the live database. Prefer a forward fix.

## Changed files

- `CONTENT_MODERATION_API.md`
- `CONTENT_MODERATION_ARCHITECTURE.md`
- `CONTENT_MODERATION_GUIDE_FA.md`
- `CONTENT_MODERATION_STAGING_FA.md`
- `CONTENT_MODERATION_TEST_RESULTS.md`
- `scripts/database.ts`
- `scripts/moderation-browser-smoke.mjs`
- `scripts/staging-smoke.mjs`
- `server/action-authorization.ts`
- `server/api.test.ts`
- `server/api.ts`
- `server/database.ts`
- `server/demo.test.ts`
- `server/demo/fixtures.ts`
- `server/demo/manager.ts`
- `server/demo/materialize.ts`
- `server/environment.ts`
- `server/job-postings.ts`
- `server/moderation-storage.ts`
- `server/moderation.test.ts`
- `server/moderation.ts`
- `server/persistence.ts`
- `server/recruitment-storage.ts`
- `server/recruitment.ts`
- `server/relational-store.ts`
- `server/relational.test.ts`
- `server/repository.ts`
- `server/services.ts`
- `server/tour-bookings.ts`
- `server/tours.ts`
- `src/components/ModerationCenter.tsx`
- `src/i18n/moderation.ts`
- `src/types/index.ts`
- `src/types/moderation.ts`
- `src/views/AdminPanelView.tsx`
- `src/views/RecruitmentView.tsx`
- `src/views/ToursView.tsx`
- `vercel.json`
