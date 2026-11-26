# Job seeker API

Uses existing session cookie, `X-Requested-With: YerevanHub`, same-origin checks and `X-App-Language: fa|en|ru|hy`. Never send a user ID as authorization. JSON writes use existing `POST /api/app` envelope `{action,args}` and return `{success,state,...}`; inspect success and HTTP status. HTTP 400 validation/stale/conflict, 403 unauthorized, 413 oversized file, 429 limit, 500 sanitized unexpected failure. Cookies/credentials are never returned as profile data.

| Endpoint | Contract | Authorization |
|---|---|---|
| GET `/api/job-seeker` | `{profile,documents,savedJobs,applications}` | Own active account |
| POST `/api/job-seeker/documents` | Raw `application/pdf`, `X-File-Name: encodeURIComponent(filename)`; returns metadata `{id,name,bytes,createdAt}` with 201 | Own account; five attempts/minute/user |
| GET `/api/job-seeker/documents/:id` | Private PDF attachment | Own document only |
| GET `/api/job-applications/:reference/resume` | Private PDF attachment; 404 absent/revoked/not-owned | Live job manager; own job or admin; consented link |

Document list never contains bytes/hash/storage paths. No profile-by-user route and no guest/reference-based resume route.

| Action | Args |
|---|---|
| `saveSeekerProfile` | `[profile]`, strict object described below |
| `saveSeekerJob` | `[jobUUID,boolean]`; save requires active approved/open job; unsave also works after closure |
| `withdrawJobApplication` | `[referenceUUID]`; own received/reviewing; retry is idempotent |
| `revokeApplicationSharing` | `[referenceUUID]`; own; clears submitted profile/document access |
| `deleteSeekerDocument` | `[documentUUID]`; own; clears associated document sharing first |
| `deleteSeekerProfile` | `[true]`; explicit confirmation; removes employment data, keeps identity/basic applications |
| `applyForJob` | Existing `[input]`, extended below |
| `trackApplication` | Existing `[referenceUUID]`; status only, now also `withdrawn` |
| `reviewApplication` | Existing `[reference,previous,next]`; four employer statuses; withdrawn applications reject updates |

Profile: `version` (0 first save; read current version for updates), `fullName` (required ≤120), `headline` ≤160, `city` ≤120, `contact` (email/phone/empty ≤250), `about` ≤3000, `desiredRole`/`preferredLocation` ≤160, `minimumSalary` (null or integer 0..1e9 AMD), `employmentTypes` subset full_time/part_time/contract/internship, `remote` boolean, `skills` (≤30, nonempty ≤80; case-normalized dedup), `languages` (≤12 unique `{code:lowercase 2–3 letters,proficiency:basic|conversational|fluent|native}`), `experience` (≤15 `{id:UUID,title,organization,startDate,endDate,description}`), `education` (≤15 `{id:UUID,institution,qualification,startDate,endDate,description}`). Career text fields ≤160 except description ≤2000; dates empty or YYYY-MM, end cannot precede start. All listed fields required. No role/user-ID/public flag accepted. See `src/types/jobSeeker.ts` and Zod schema for exact types.

Application extension: existing `requestId,jobId,version,name,contact,message` remain. Authenticated requests **require** `consent:true`; optional `shareProfile:true` requires saved profile, optional `documentId` must belong to session user. Set `accountRequired:true` from logged-in forms so expired sessions reject. Guests cannot share profiles/documents. Optional fields have no defaults, preserving old guest request fingerprints. Same ID+body+identity retries return original reference. Changed body/identity or a second active account application is rejected. Job status/version/moderation/owner activation checks still apply.

Provider application read models add optional `sharedProfile` frozen snapshot and `resume` metadata only where consented; the full private profile/document collection is never included in public state. Withdrawing immediately removes snapshot/document from provider reads and downloads; deleting profile data does not erase previously submitted contact/name/message. Saved/history retain minimal public job title/company for closed listings.

Protected docs are limited to three simple PDFs of 2 MiB each. SHA dedup is per owner. No URL-based upload or public filesystem path. Existing action rate limits apply: applications five/minute/IP, other actions sixty/minute/IP. Private state is fetched separately and not persisted in browser localStorage.

Job read models also expose optional `acceptingApplications`, derived from the existing server conditions: open, approved and active owner. Management clients still receive manageable unavailable jobs. Public catalog, homepage and job seeker search filter out a false value, including when the current identity is an administrator. This is a response-model extension, not a database column or client-grantable permission; application submission still enforces the conditions transactionally on the server.
