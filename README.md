# YEREVANHUB

Hostel booking and rental discovery with a React/Vite client and a same-origin Express API. Reservations and accounts now live on the server, not in localStorage.

## Development

Validated with Node 24 and npm 11:

```sh
npm ci
npm run dev
```

The combined frontend/API server uses port 3000 (`PORT` overrides it). Local development creates `data/hostel.db` with libSQL/SQLite. These files are ignored by Git and must be backed up independently. Development-only demo accounts are shown in the sign-in dialog. Set `DEMO_MODE=false` before creating a fresh database to omit them. Never reuse a development database as a production database.

```sh
npm run lint
npm test
npm run build
npm run test:browser
```

Browser tests start an isolated server/database and use system Chromium (`BROWSER_PATH` overrides `/usr/bin/chromium`). They require no external email, Telegram, database, or AI account. To run the built client with its API on a persistent host, provide a database and bootstrap administrator, then run `npm start`. `npm run preview` previews only static frontend assets; it does not start the API.

## Features

- Server-side accounts with salted scrypt password verifiers, HttpOnly SameSite session cookies, session revocation, role/assigned-hostel authorization, input validation, origin checks and rate limits.
- Shared reservations, rental inquiries, reviews, coupons and audit records in a persistent SQL database. Each state mutation runs in a write transaction, including confirmation/capacity and coupon accounting.
- Manager daily capacity calendar, closure to new bookings with capacity zero, and rejection of capacity reductions below confirmed reservations.
- Ninety-day availability search, date/quantity selection, base stay totals, female/private-room filters, late arrival, kitchen, metro and monthly-stay filters. Metro/monthly flags require actual admin entry; they are not inferred from marketing descriptions.
- Saved stays and comparison of up to three hostels/rentals. Guest favourites persist in that browser; authenticated favourites synchronize across devices and merge guest selections at login.
- Explicit admin property verification with notes and timestamps. Sample properties start unverified; editing a property does not certify it.
- Private arrival guide and door code for the matching confirmed reservation, with Armenian taxi address, entrance photo, directions and reception contact. Public responses omit door codes, exact internal rental addresses, internal notes, guest records and credentials.
- Category reviews (cleanliness, safety, staff and location) only for completed past stays, one review per booking, with moderation before publication.
- Persistent email/Telegram notification outbox, provider adapters, retry lease/backoff and admin queue visibility. Missing providers leave messages queued; they do not falsely mark them sent.

## Deployment

See [DEPLOYMENT_FA.md](DEPLOYMENT_FA.md) for Persian Vercel/Turso setup steps.

Vercel deploys `api/app.ts` alongside `dist`. With no `DATABASE_URL`, it intentionally serves a **read-only preview**: browse, filter, save and compare, with an explicit banner. Account access and reservations remain disabled. Once a hosted libSQL database is configured, records are shared across devices. A configured database failure returns an error; it never silently switches to a fake writable store.

Required production settings: `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (for authenticated hosted databases), and `ADMIN_EMAIL`/`ADMIN_PASSWORD` for initial administration. The bootstrap password must have at least 12 characters; bootstrap never resets an existing active administrator. Add the settings securely, never to source or chat. The public `APP_URL` must be the project's HTTPS address to include tracking links in emails.

Production never enables the development quick-login accounts. Production uses Secure cookies. Do not connect the local development database to a public deployment.

## Notifications

Optional email: `RESEND_API_KEY` and `NOTIFICATION_FROM` from a verified sender domain. Optional manager Telegram alerts: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Telegram alerts omit guest contact details and private tracking links. All configured recipients must be real/authorized; hostel email is used only after its listing is marked verified.

After a production booking/status change, up to two eligible queued notifications are delivered outside the transaction, in parallel with a 15-second timeout. An outage cannot undo the booking. Run a scheduler against `GET /api/app?worker=notifications` with `Authorization: Bearer <CRON_SECRET>` for backlogs/retries, or use the admin queue button. Schedule frequency must respect your hosting plan. Configure production `APP_URL` for email tracking links. Do not log provider responses or credentials. Email uses provider idempotency keys; Telegram delivery can be duplicated if a worker dies after sending but before recording success.

## Data and limits

The existing browser-local demo data is not imported automatically: it was user-editable and is not trusted production data. The legacy `server/db.ts` implementation is unused; the active persistence layer is `server/database.ts`.

This is a small-site foundation using SQL property and operational-record tables alongside a transactional JSON state row and session/outbox/rate-limit/token tables. Versioned migrations preserve existing data; rollback instructions are in the Persian guides. It serializes writes; use normalized tables/pagination and retention policies before large-scale use. Pending requests do not guarantee a bed; only confirmation reserves inventory. Availability refreshes every 15 seconds and confirmation rechecks it transactionally. No online payment has been introduced.

Single-use password recovery, email ownership verification, encrypted full backups and separate-target restoration are implemented. Configure the email provider and install the worker/backup schedule before relying on them operationally. Multi-factor authentication is not implemented. Live hosted-database/provider delivery requires your own configuration and has not been validated using real credentials. The phrasebook works offline; live Gemini remains optional and untested. Never embed production API secrets in `VITE_` variables.

Property management, media storage and migration/rollback guide (Persian): [PROPERTY_MANAGEMENT_FA.md](PROPERTY_MANAGEMENT_FA.md). Implementation status: [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md).

Reception, secure accounts, financial records, public SEO routes, workers and encrypted backup/restore (Persian): [OPERATIONS_GUIDE_FA.md](OPERATIONS_GUIDE_FA.md).
