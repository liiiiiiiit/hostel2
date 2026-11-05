# YEREVANHUB guest experience redesign

The guest journey now leads from a prominent stay search to clearer results, a photo-led property page, and a grouped booking form. Built on `codex/deep-bugfix-20261105` at `21e32d813611f3a73705a1fc03ccb207b0e49590` so the November 5 fixes remain included.

## Design and behavior

- Warm cream surfaces, forest green actions, terracotta headline accents, and a new Republic Square hero photograph.
- Featured hostels appear before secondary service shortcuts. Mobile cards use a visible vertical grid rather than a horizontal carousel.
- Quick filters for private rooms, women-only dorms and mixed dorms; selected filters remain visible and can be individually removed. Results announce count changes to assistive technology.
- Property photos are clickable from search results. Missing or failed images retain their layout with a neutral fallback.
- A responsive property photo mosaic opens the full gallery, including images beyond the first five. Arrow keys follow the language direction and Escape closes the dialog.
- Property section navigation moves keyboard focus to overview, rooms, amenities, location or reviews.
- Booking fields are grouped into stay details, guest details, and review/request. Native dates have full-width rows on phones at 420 px and below.
- Navigation highlights the parent section when a detail page is open. Save/compare controls have larger tap targets.
- Persian remains the default; all new copy supports Persian, English, Russian and Armenian. Dark mode, reduced motion and focus indicators remain supported.

The API contracts, price calculations, inventory validation, pay-on-arrival model, and confirmation rules are preserved. Existing information-only and sample-content disclosures remain visible. No database migration or dependency update is required.

## Compatibility repair found in browser QA

The pre-existing booking request-key initialization called `crypto.randomUUID()` during property rendering. Browsers do not expose that method on ordinary HTTP origins, causing the entire hostel detail screen to disappear. `createRequestId` prefers the native method and uses cryptographic `getRandomValues` to generate a UUID v4 when it is unavailable. Two regression tests cover the native and fallback paths. This does not change server authentication or token creation.

## Validation

- TypeScript checks: `npm run lint` passed.
- Production build: `npm run build` passed.
- Existing suite plus regression tests: `npm test`, 125 passed.
- Live browser: search-to-results, filter selection/removal, property rendering over HTTP, gallery next/Escape and focus restoration.
- Responsive browser preview: all four homepage languages at 320 px; Persian mobile search and dark-mode results; desktop property gallery; tablet homepage at 761 px.
- Validation used disposable demo data, not the production database. Real reservations and external notification delivery were not exercised.
- The embedded third-party map could not render WebGL in the test browser; address and external map links remain available.

## Photography

Hero: “Republic Square in Yerevan with Iconic Clock Tower,” Valeria Drozdova, Pexels.
Source: https://www.pexels.com/photo/republic-square-in-yerevan-with-iconic-clock-tower-35215765/
License: https://www.pexels.com/license/
Served from the source CDN with compression and display cropping. Property photographs remain those supplied by the existing listing data.

## Delivery

Branch: `codex/hostel-ux-redesign-20261105`.
The pull request targets the November 5 bug-fix branch. Review before merging or deploying to the existing VPS; no hosting configuration is changed by this redesign.
