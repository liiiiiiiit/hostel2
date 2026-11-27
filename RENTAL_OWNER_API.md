# Rental owner API

Existing cookie session, CSRF header `X-Requested-With: YerevanHub`, same-origin requests and `X-App-Language: fa|en|ru|hy` are reused. Send JSON mutations to `POST /api/app` as `{ "action": "…", "args": […] }`. Never treat HTTP 200 alone as success: inspect `success` and `error`. Failed optimistic revisions do not mutate data. IDs, schemas and full payload types are in `server/rental-owners.ts`, `server/property-schemas.ts` and `src/types/rentalOwner.ts`.

| Endpoint | Access | Response |
|---|---|---|
| `GET /api/rental-owner?search=&propertyId=&page=1` | Active owner capability | Own profile/properties, consented inquiries (10/page), counts and recent event metadata |
| `GET /api/admin/rental-owners` | `accounts.assign` | Owner profiles, eligible user selectors and rental assignment versions |
| `POST /api/rental-owner/media?propertyId=ID` | Current owner | Raw JPEG/PNG/WebP; 201 `{success,image:{id,url,alt}}` |
| `POST /api/rental-owner/media?propertyId=ID&deleteMedia=UUID` | Current owner and original uploader | Detached, owned asset only; existing durable cleanup queue |

## Actions

| Action | Arguments | Authorization / concurrency |
|---|---|---|
| `saveRentalOwnerAccount` | `[{id?,version,name,email,phone,password,status,organization,bio,city}]` | Admin; new version 0; edit exact current version. New/reset password 12–128 characters; empty edit password retains credential. Revokes affected sessions. |
| `grantRentalOwner` | `[{userId,status,reason}]` | Admin; explicitly selected existing user, not an email. Existing capability cannot be silently overwritten. |
| `assignRentalOwner` | `[{propertyId,ownerId,version,reason}]` | Admin; owner ID or null for admin management; version 0 for no assignment. Existing version required thereafter. Publication withdrawn. |
| `saveOwnerProfile` | `[{version,organization,bio,city}]` | Current active owner, matching profile version |
| `saveOwnerRental` | `[{property,expectedUpdatedAt,mode}]` | Complete existing rental schema; expectedUpdatedAt null for new UUID, exact stored timestamp for edit. mode draft / pending_review / archived. Returns private sanitized `rental`. |
| `setOwnerRentalAvailability` | `[propertyId,ownerVersion,true_or_false]` | Current owner, matching assignment version |
| `updateOwnerInquiry` | `[inquiryId,updatedAt,previousStatus,nextStatus]` | Current owner + explicit original consent recipient, matching status/timestamp |

`property` uses the existing fields for title/description (fa/en/ru/hy), type, lease period, prices, utilities, deposits, amenities, public approximate location, internal exact address and validated images. Use the editor, not a guessed abbreviated property payload. Internal admin notes, verification and commission modifications are forbidden. Owner actions never return the administrator's global state.

Public `createRentalInquiry` adds optional `shareWithOwner:boolean`, default false. It is honored only for a newly created eligible inquiry with an active current owner; no endpoint claims/relinks old inquiries. The existing private receipt and tracking flow are preserved. Public rental objects expose only `ownerRequestsEnabled` and `acceptingInquiries`, never owner identity/contact or exact internal address.

## Inquiry transition graph

| Current | Allowed next |
|---|---|
| pending_review | coordinating, rejected, cancelled |
| coordinating | proposed_terms, rejected, cancelled |
| proposed_terms | coordinating, agreed, rejected, cancelled |
| agreed | completed, cancelled |
| rejected / cancelled / completed | None |

Historical statuses are not migrated or fabricated. Ownership, status and administrator internal notes are preserved by targeted status SQL updates. Shared permission and moderation controls remain mandatory regardless of UI visibility.
