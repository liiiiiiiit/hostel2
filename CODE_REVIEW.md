# Code review and repairs

Reviewed the client entry/routing, persisted store, account flows, hostel/rental forms, pricing and coupon rules, status transitions, exports, dependency setup, and build configuration. This review focuses on the application's executable client workflow; it is not a production security certification.

## Confirmed defects repaired

| Area | Original behavior | Repair |
| --- | --- | --- |
| TypeScript | Five errors: missing rental availability field and incomplete hostel objects | Use the rental's existing publication status and initialize required hostel fields |
| Private tracking | Invalid/missing tokens displayed the first booking or rental inquiry | Require an exact token and render an unavailable page on failure |
| Public content | Missing IDs silently selected another record; unpublished content could open | Reject missing or unpublished records |
| Navigation | Private tracking hash remained when navigating elsewhere; forms reused state between records | Clear tracking hashes, handle Back navigation, and key record-specific forms |
| Demo authentication | Every password was accepted; manager initial passwords were discarded | Validate demo passwords, hash new credentials, add password registration, and honor manager initial passwords |
| Permissions | Admin/manager pages and mutations lacked role/hostel checks; unassigned managers inherited the first hostel | Guard panel routes and mutations, limit managers to assigned hostels, and remove the fallback assignment |
| Dates | Invalid dates could produce NaN and pass validation; forms used fixed October 2026 defaults | Strict calendar parsing, Yerevan date defaults, and preserve dates/guest count from hostel search |
| Pricing | Invalid numeric inputs could become charges; early-arrival quotes differed from saved bookings | Reject invalid inputs and apply the same early/overnight fees when persisting |
| Capacity | Summed every overlapping booking, including stays occupying different nights | Compute peak simultaneous confirmed occupancy for request creation and confirmation |
| Coupons | Store used `minAmountAMD` while validator expected `minAmount`; preview ignored limits/expiry | Validate both representations and share the validator with the form; compare date instants |
| Lifecycle | Repeated cancellation decremented coupon usage repeatedly; cancelled bookings could be reconfirmed; pending requests never expired | Enforce legal/idempotent transitions, release coupon usage once, expire pending requests periodically, and display expiry status |
| Feedback | UI silently ignored unsuccessful booking status/review actions | Surface failed actions and only show success after a successful store result |
| Persistence | Seed arrays were mutated by reference and partial snapshots could crash the app | Clone seed data, validate essential snapshot structure, merge defaults, and discard inactive sessions |
| IDs | Tracking secrets used timestamps and Math.random | Use cryptographic UUIDs for booking/inquiry IDs and private tokens |
| Rental/review input | Hidden properties accepted inquiries; invalid resident counts and ratings were accepted | Validate publication, applicant details, resident limits, rating, and review text |
| CSV exports | Quoting was incomplete, hash characters could truncate data URIs, and text could become formulas | Escape all cells, neutralize formula prefixes, and download a UTF-8 Blob |
| Dependencies | Standard npm install failed on the esbuild/Vite peer conflict; no lockfile or test script | Align esbuild's range, commit package-lock.json, and add npm test |
| Build | Main JavaScript bundle was about 1.08 MB and eagerly loaded the Gemini SDK | Lazy-load views and the optional SDK; main entry is about 445 KB before gzip |
| Vite configuration | Used __dirname in an ES module and triggered the future native-loader warning | Use import.meta.dirname |

## Validation

- TypeScript: `npm run lint` passes.
- Regression suite: `npm test` passes 34 tests, including 18 new tests for store, authentication, pricing, dates, and CSV behavior.
- Production bundle: `npm run build` passes.
- Clean dependency installation: `npm ci --no-audit --no-fund` validated with the committed lockfile.
- `npm audit` reports zero known vulnerabilities for the resolved dependency tree at review time.
- Headless Chromium checks passed for invalid booking/inquiry links, UI booking creation, reload persistence, clearing tracking URLs, browser Back, wrong-password rejection, correct admin login, and the lazy translator route. No uncaught page errors occurred. External fonts/images were blocked during these checks to keep them independent of optional network resources.

## Remaining architectural limits

The client is backed entirely by localStorage and bundled mock records. Its role checks and password verifier improve demo behavior but cannot establish a trusted security boundary. Guest data, internal notes and door codes included in mock records remain inspectable by the browser. Capacity/coupon updates are local operations; simultaneous clients require server-side transactions. Booking tracking does not work across devices without shared persistence.

`server/db.ts` is not connected to an HTTP server or used by the client workflow. Turning it into a production backend, adding password reset/session lifecycle, migrating existing passwordless custom accounts, and moving privileged data/API credentials behind that backend remain separate architectural work. Live Gemini behavior was not validated.
