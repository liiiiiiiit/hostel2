# Safe production deployment plan — requires explicit approval

**This document prepares deployment. No live deployment was performed. Do not execute the deployment block until the repository changes have been reviewed and the operator has explicitly authorized deployment.**

Baseline: `cc9cfa6fdc7f49c3dcb99c7736d5e8fa06f5c8f8`. Proposed release branch: `codex/full-stack-audit-20261122`. Do not merge automatically.

## 1. Verify the actual VPS before changing it

The user's earlier logs showed these values, but SSH access was not available during this audit:

| Item | Previously reported value |
| --- | --- |
| Service | `hostel2.service`, user `hostel2` |
| App | `/opt/hostel2/app` |
| Node/npm | `/opt/hostel2/node/bin` (Node 24) |
| Database | `file:/var/lib/hostel2/hostel.db` |
| Listening port | 3001 |
| Public domain | `https://yerevanhub.ir` |

Read-only operator checks:

```bash
sudo systemctl show hostel2 --no-pager \
  -p User -p WorkingDirectory -p ExecStart -p ActiveState

sudo -u hostel2 -H bash <<'SH'
export PATH="/opt/hostel2/node/bin:$PATH"
cd /opt/hostel2/app || exit 1
git status --short --branch
git log -1 --oneline
node --version
node <<'JS'
require('dotenv').config({quiet:true});
console.log('Expected SQLite path:',process.env.DATABASE_URL==='file:/var/lib/hostel2/hostel.db');
console.log('Configured port:',process.env.PORT||'(not in .env; inspect systemd)');
console.log('Public HTTPS URL configured:',/^https:\/\//.test(process.env.APP_URL||''));
JS
SH

sudo ss -ltnp
sudo nginx -t
sudo systemctl list-timers --all --no-pager
```

Also inspect the actual worker service/cron definition, Nginx upstream and firewall rules locally. Do not paste passwords, environment files, private database contents or backup keys into tickets/logs. Stop if paths/port/database disagree with the preflight rather than guessing.

Confirm database/media directories belong to the intended service user, backups are protected, and the database is outside the release/build output. Keep the Node port restricted from public access when Nginx is the intended entry point.

## 2. Review and staging rehearsal

- Review the PR, especially account-token invalidation, versioned editor behavior, shared transaction scheduling and the provider downgrade refusal.
- Use Node 24 and `npm ci` from the committed lockfile.
- Run the lint/unit/build/browser/schema commands in `QA_TEST_RESULTS.md` on staging/temporary databases.
- If available, test an authorized protected **copy** of production with access controls. Never run destructive fixtures or migration rollback tests against the live file.
- No schema migration is added by this audit. Existing startup/additive migrations remain idempotent. Retain schema v3.
- If strengthened `db:check` detects historical orphans, stop deployment and investigate without deleting records or inventing owners.

## 3. Pause writers and take recoverable backups

Before the approved update:

1. Record the currently deployed commit and exact service/worker configuration.
2. Pause the identified worker service/timer or cron invocation and wait for an active worker/backup job to finish. The deployment helper stops the web service but **does not discover/stop every possible cron worker**. Do not stop unrelated system jobs.
3. Verify enough disk space for the application, complete SQLite backup and uploaded files.
4. Use the SQLite backup API, not a bare copy of a live WAL database.
5. Back up uploaded media outside the application directory and retain the protected environment/configuration separately. The application tar includes in-app files but cannot capture an arbitrary external media directory automatically.
6. Store backups under a root-only directory such as `/opt/hostel2/deploy-backups/`; copy them to separate protected storage. Keep encryption keys separate.

The existing deployment helper creates an integrity-checked SQLite backup and an application archive before installing the release. Its confirmed database path is intentionally strict. The standalone encrypted backup/restore utilities are also tested, but this audit has not created a real production recovery copy.

For a standalone SQLite backup, while the identified writers are paused:

```bash
sudo bash <<'SH'
set -euo pipefail
backup_dir="/opt/hostel2/deploy-backups/manual-$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "$backup_dir"
python3 - /var/lib/hostel2/hostel.db "$backup_dir/hostel.db" <<'PY'
import sqlite3, sys
with sqlite3.connect('file:'+sys.argv[1]+'?mode=ro', uri=True) as source:
    with sqlite3.connect(sys.argv[2]) as target:
        source.backup(target)
        assert target.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert not target.execute('PRAGMA foreign_key_check').fetchall()
PY
chmod 600 "$backup_dir/hostel.db"
printf 'Verified backup directory: %s\n' "$backup_dir"
SH
```

This creates a new backup; it never replaces the live database. Confirm its location and separately back up the verified media directory before continuing.

## 4. Approved deployment — pinned to the reviewed release

The helper now accepts `HOSTEL2_DEPLOY_REF` as a full branch ref or a reviewed 40-character commit SHA. Without an override it retains the existing default branch behavior. This avoids accidentally deploying a different branch from the one reviewed.

**Only after explicit deployment approval and completion of the backup/worker steps:**

```bash
sudo bash <<'SH'
set -euo pipefail
app_dir=/opt/hostel2/app
run_git() { sudo -u hostel2 -H git -C "$app_dir" "$@"; }

run_git fetch origin refs/heads/codex/full-stack-audit-20261122
release_sha=$(run_git rev-parse FETCH_HEAD)
printf 'Review this release before continuing: %s\n' "$release_sha"
# The operator must already have approved this exact commit from the PR.
run_git show "$release_sha:ops/deploy-provider-sqlite.sh" \
  > /root/hostel2-audit-deploy.sh

HOSTEL2_DEPLOY_REF="$release_sha" HOSTEL2_HEALTH_PORT=3001 \
  bash /root/hostel2-audit-deploy.sh
SH
```

If the approved commit is not the displayed SHA, stop and pin the actual approved SHA instead. The helper backs up data/code, preserves local edits via stash, fetches the release, installs dependencies as `hostel2`, runs lint/tests/build, performs the existing offline provider preservation verification, runs enhanced database checks, restarts the service and checks the configured local port.

Do not assume its automatic error handler is a fully rehearsed VPS disaster recovery system. Retain the recorded old commit, archive, lockfile and manual rollback steps below. A dependency install failure can require reinstalling the old lockfile; the archive excludes `node_modules`.

## 5. Verify service, proxy and user flows

```bash
sudo systemctl status hostel2 --no-pager -l
sudo journalctl -u hostel2 -n 60 --no-pager
sudo -u hostel2 -H git -C /opt/hostel2/app log -1 --oneline
curl -fsS --max-time 10 http://127.0.0.1:3001/api/app -o /dev/null
sudo nginx -t
curl -fsS --max-time 10 https://yerevanhub.ir/ -o /dev/null
```

- Compare the built `dist/index.html` asset path with the HTML served on localhost and the domain. Use a private browser tab; clear/invalidate a proxy/CDN HTML cache if the responses differ.
- Verify administrator login, existing provider login, existing content/requests, a property edit, guest/private tracking, translations and mobile menus. Avoid fake public production listings or reservations merely to test deployment.
- Verify a previously verified provider email is unchanged when its address was not edited; edited addresses must be verified again.
- Resume the identified worker schedule and check logs/outbox status without sending arbitrary test messages to real users.
- Real email sender, Telegram target and Gemini credentials must be configured separately. Tests do not prove those services are operational.
- Keep backups until the release has been accepted and a restoration rehearsal has succeeded on an isolated target.

For a 502: first check the service log and actual listening port, then Nginx's upstream. The earlier VPS used 3001; testing only port 3000 would incorrectly suggest the app was down. If the process fails after startup/migration, retain the exact error and backup before any recovery change.

## 6. Roll back code without discarding new data

This audit has no new database schema to undo. Prefer restoring compatible previous application code against the retained v3 database.

- Pause the web service and identified workers.
- Record a fresh protected snapshot of the current database before recovery, including requests created after deployment.
- Read the old commit from the chosen deployment backup's `previous-commit` file.
- Switch to that compatible reviewed commit and restore the application archive/environment/build as appropriate.
- Reinstall dependencies from the restored `package-lock.json` as `hostel2` with the correct Node PATH; the archive excludes dependencies. Rebuild if the restored artifact is absent.
- Restart, check the actual local port and domain, then resume workers.

**Do not run `db:rollback` to v2 when provider accounts exist. Do not restore an older database over newer live transactions as a normal application rollback.** The new guard refuses the unsafe provider downgrade. If a database recovery is truly necessary, restore the backup into a separate empty target, validate it, and reconcile post-backup records under an explicit recovery plan before changing production configuration.

## 7. Operational conditions still requiring the owner

Verify HTTPS before relying on secure cookies; remove temporary HTTP-test mode on HTTPS. Configure `APP_URL` to the correct public HTTPS origin. If Nginx is local, use the documented loopback proxy trust setting and correctly overwrite forwarded headers; do not trust arbitrary public forwarding headers. If Cloudflare is involved, verify its actual trusted-proxy configuration instead of assuming visitors' IP addresses are already restored.

Check systemd's restart/start-limit policy, Node PATH, working directory, persistent database/media ownership and backup/worker schedules. The current server does not implement an explicit long-request drain protocol on SIGTERM; SQLite transactions provide atomicity, but in-flight clients may need to retry idempotent operations during restarts. This remains an operational limitation, not a claim of zero-downtime deployment.
