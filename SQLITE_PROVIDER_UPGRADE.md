# Upgrade the live SQLite installation

This branch is based on the deployed ef39eb4 revision. It retains the relational SQLite database and existing server APIs, hospitality flows, sessions, scrypt passwords, jobs, applications, tours and bookings.

## Data changes

The provider upgrade adds provider_accounts, an approved flag to each listing table and a tour capacity column. Existing listings default to approved, and existing tours retain a high capacity limit until their organizer sets one. Every original column value and row is retained.

Provider profiles reference existing users. Their specialized role is resolved by the server during authentication without rebuilding the users table or changing its existing role constraint. Administrators create provider accounts, reset their passwords and disable them. Historical listing owners retain access to their listings. New visitor accounts cannot create listings. New provider listings and their edits require administrator approval.

Jobs and tours with submitted requests can be closed. Deletion is available for empty listings. Requests and their tracking codes remain in their existing tables. Tour providers can view and update their own bookings. Capacity is enforced per requested date for pending and confirmed bookings.

## Verification

npm run lint
npm test
npm run build

The migration test compares all pre-existing table rows before and after upgrading a legacy schema, repeats the upgrade, and verifies the old administrator's scrypt password. API tests cover specialized roles, cross-role rejection, moderation, public applications/bookings, capacity, provider disablement and password reset.

## Existing VPS

The deployment script is specifically configured for the verified installation:
- /opt/hostel2/app
- /opt/hostel2/node/bin
- file:/var/lib/hostel2/hostel.db
- hostel2.service running as hostel2

Run HOSTEL2_HEALTH_PORT=3001 bash ops/deploy-provider-sqlite.sh as root after fetching this branch for this VPS, whose service listens on port 3001. The explicit health-check port takes precedence over .env, since systemd may supply a different PORT. The script takes the site offline, creates a consistent SQLite backup and an application archive, preserves local code edits in git stash, installs and tests the new code, and upgrades the same database. No admin password reset or fresh database is needed.

scripts/provider-upgrade.ts requires --offline. It holds a write transaction while recording hashes of all existing rows, applying the additive schema changes, comparing original rows and checking SQLite integrity and foreign keys. It commits only after verification. Existing scheduled writers wait on SQLite's transaction lock.

On failure, the deployment script attempts to restore the previous source and application files and restart the service. The standalone SQLite backup is retained. Do not restore a backup over an active database. New schema additions are backward compatible with the previous application, so automatic application rollback leaves the database in place.

The JSON codex/provider-panels release is superseded for this SQLite VPS. The live database has not been accessed or modified from the development environment.
