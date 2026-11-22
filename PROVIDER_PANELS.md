# Providers on main

Base commit 2d177ab24772636d638d05781090c23f7f0de6ae.

## Audit

Main uses React 19, Vite, Tailwind, TypeScript and npm. It has four UI languages with Persian RTL. Navigation is component state plus tracking hashes. Existing admin/hostel manager/traveler screens use a browser-local store. Browser login ignores passwords. server/db.ts contains a JSON database with PBKDF2 password hashes and session records, but main has no runnable backend connecting it to the UI. Jobs and tours are absent.

## Implementation

The new Express entry point connects authentication and provider workflows to the existing server database. Session cookies are HttpOnly and SameSite=Lax. Provider accounts are created and edited by administrators, including password resets and disablement that revoke existing sessions. Job and tour ownership and roles are checked on the server. Every provider edit requires publication approval by an administrator. Public requests need no account. Active tour requests reserve capacity per requested date.

Additive initialization creates listings and requests collections when missing. Existing JSON records are preserved. Existing browser-only hospitality records remain in the browser store and are not automatically imported into the server database.

Data lives in data/yerevanhub.json. This backend runs as one Node process. Run one application instance against a data directory. Back up the data directory before upgrades. Existing malformed database files cause startup/request failure instead of replacement with seed data.

## Run and verify

Use Node 24, npm ci, npm run lint, npm test, npm run build.
Run npm run dev for development. Run npm start for the built production app.
First production initialization requires ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).
Set COOKIE_SECURE=true behind HTTPS. Preserve the data directory across deployments.

Admin opens Providers, creates a job_provider or tour_provider with name, email, password and optional phone/organization. Edit the account to disable or reset its password.
Provider logs in through the shared login and is redirected to its panel. Create a listing. Admin approves it from Jobs or Tours.
Visitor opens Jobs or Tours, submits name/contact and an optional note. Tours also require date and people.
Provider opens Requests beneath the listing and updates status. Admin can view and update all requests.
Listings with requests can be closed and remain available for reviewing history. Empty listings can be deleted.

Tests cover both provider types, unauthorized cross-owner updates, admin moderation, public requests, retries, status updates, capacity and disabled sessions.
