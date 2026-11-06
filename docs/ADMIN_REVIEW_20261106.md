# Admin workspace review — 6 November 2026

## Source and scope

Based on `codex/hostel-ux-redesign-20261105` at `c9ec7a4`, which includes the recent discovery, header, preloader, carousel, responsive and booking-security changes. The repository default branch was behind this branch. This change targets the existing React/Vite, Express and relational SQLite application; it does not replace its stack or database.

## Changes

- Responsive sidebar, mobile section picker, active section badges, keyboard focus management, readable status badges and a shared dark/light workspace palette. Persian RTL and English/Russian/Armenian copy remain supported.
- Overview puts operational sections first. Attention, arrival, review and property cards open their corresponding work. Arrival issues reset unrelated filters and show only confirmed affected bookings.
- Booking search includes dates, status and arrival-date filtering, newest-first results, a count and pages of ten. Reports include all matching results rather than only the visible page.
- Booking cards distinguish guest count from room/bed quantity. Confirmed stays expose the existing booking-scoped reception workflow instead of a “complete” button that sent staff to an unrelated reception selection. Server-side assignment and stay-event rules remain authoritative.
- Guide editing is isolated in `AdminArticles`. Creating a guide from the overview starts with a fresh form, repeated titles receive distinct slugs, existing slugs and authors survive edits, translation inputs use their language's direction, and edit buttons say “Edit”.
- JSON output is a booking report with an explicit allowlist. It omits bearer tracking tokens, nested arrival/access instructions and other application state. It still contains guest contact details. Full encrypted database backup remains the separate `npm run backup` operation.
- Synchronous action locks prevent rapid duplicate mutations in the admin and guide forms; manager/coupon/guide form fields are disabled during submission. Review rejection saves the entered reply too. Password and coupon input limits match the API.
- Extracted reusable fields, booking cards, pagination, guide editor and pure booking/report/slug helpers. Expanded previously compressed admin source for maintainability.
- Scoped dependency override upgrades `@vercel/oidc`'s pinned `@vercel/cli-config` to 0.3.7, removing the outdated nested Zod dependency without upgrading the OIDC major version. The pre-change dependency audit reported four high findings along this dependency chain.

## Verification

- Baseline: 125 tests, both TypeScript projects and production build passed.
- Added four regression tests for combined filters, immutable sorting, arrival-vs-departure filtering, JSON secret exclusion and unique multilingual guide slugs.
- Final verification commands: `npm run lint`, `npm test`, `npm run build`, `npm audit`, and syntax checks for the two browser audit scripts.
- Browser scripts now open the mobile section picker before selecting a section. Responsive coverage includes additional administrative sections.
- Local visual/browser verification is blocked: the managed preview exits before app startup with `listen EPERM` on the tsx IPC socket. No screenshots or browser pass are claimed. The repository's browser/responsive GitHub Actions remain the acceptance checks for actual layout and interactions.

## Deployment

No schema migration or new environment variable is introduced. Review and merge into the latest redesign branch, then deploy that branch using the existing VPS process (`npm ci`, checks/build, and restart `hostel2.service`). The dependency override is recorded in both package files and is applied by `npm ci`.

This review fixes the issues listed above; it does not establish that every possible defect or production configuration issue has been eliminated. Live provider credentials, VPS configuration and real-device visual acceptance were not available in this workspace.
