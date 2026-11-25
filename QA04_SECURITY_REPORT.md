# Task 04 — security findings and boundaries

Authorized targets: disposable test SQLite databases and marked CI staging only. Real notifications and external providers disabled. Production domain, database, uploads, credentials and live VPS were not penetration-tested or modified.

## Role matrix exercised

| Actor | Permitted ownership scope | Denied scope |
| --- | --- | --- |
| Anonymous | Published public DTOs; essential guest requests and private-token tracking | Admin actions, private account records, unrelated guest submissions, media upload |
| Traveler | Own profile/password/session and supported traveler workflows | Role assignment, other travelers' bookings, manager/provider/admin mutations |
| Hostel manager | Assigned property, inventory and reservations | Unassigned property, other modules' management, administrator actions |
| Job provider | Own job listings/applications through provider profile | Tour panel actions and unrelated applications; admin service requests |
| Tour provider | Own tours/bookings through provider profile | Job applications and unrelated tours; administrator actions |
| Admin | Supported cross-module management | Still subject to validation, CSRF, business rules and migration isolation |

Confirmed P1 recovery-token revocation gap is fixed: disabling hostel managers now consumes outstanding reset and verification tokens transactionally, in addition to sessions. Existing provider account policy was inspected for consistency.

The actual automated suite exercises disabled/expired sessions, password hashing, scoped relational state, role/ownership enforcement, provider moderation, public/private DTO separation, guest tracking, safe upload decoding and traversal rejection, CSRF/origin constraints, unsafe URL and XSS defenses, and notification isolation. New staging API checks add literal SQL-injection search, forged-origin rejection, profile role-injection rejection, password/session revocation, private-data canaries and upload authorization. New browser checks include an inert article HTML/script canary. See execution results; do not treat merely defined checks as executed.

## Residual limitations

No exhaustive OWASP certification, third-party penetration test, real-device test, production configuration inspection or external email/Telegram/SMS/payment delivery was performed. Remote provider availability and private production secrets are outside scope. Browser route interception intentionally prevents external image/map/provider traffic. Existing rate limits restrict these bounded fixtures; no uncontrolled load was generated. No unsupported registered job-seeker dashboard is claimed. Dependency advisories are not equivalent to a demonstrated exploit; package versions were preserved rather than upgraded speculatively.

Media intent scopes protect restored copies from deleting original objects. Changing storage paths or tokens deliberately leaves old intents pending; manual review is required, not automatic scope rebinding.
