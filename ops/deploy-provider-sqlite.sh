#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "${APP_ENV:-}" == staging ]] || [[ "$PWD" == /opt/hostel2-staging/* ]]; then
  echo "This helper targets production. Use STAGING_SETUP_FA.md for staging."
  exit 1
fi

if [ "$(id -u)" != 0 ]; then
  echo "Run this script with sudo bash."
  exit 1
fi
app_dir=/opt/hostel2/app
database_file=/var/lib/hostel2/hostel.db
node_path=/opt/hostel2/node/bin
backup_dir="/opt/hostel2/deploy-backups/provider-sqlite-$(date +%Y%m%d-%H%M%S)"
run_app() {
  sudo -u hostel2 -H env PATH="$node_path:/usr/local/bin:/usr/bin:/bin" bash -c 'cd /opt/hostel2/app && exec "$@"' bash "$@"
}
test -f "$database_file"
test -f "$app_dir/.env"
command -v python3 >/dev/null
command -v curl >/dev/null
run_app node -e 'require("dotenv").config({quiet:true});if(process.env.DATABASE_URL!=="file:/var/lib/hostel2/hostel.db")throw Error("DATABASE_URL differs from the verified VPS path");'
port="${HOSTEL2_HEALTH_PORT:-}"
if [ -z "$port" ]; then
  port=$(run_app node -e 'require("dotenv").config({quiet:true});const p=Number(process.env.PORT||3000);if(!Number.isInteger(p)||p<1||p>65535)throw Error("Invalid PORT");console.log(p)')
fi
if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
  echo "Invalid health-check port."
  false
fi
deploy_ref="${HOSTEL2_DEPLOY_REF:-refs/heads/codex/provider-panels-sqlite}"
if [[ "$deploy_ref" == refs/heads/* ]]; then
  run_app git check-ref-format "$deploy_ref"
elif ! [[ "$deploy_ref" =~ ^[a-f0-9]{40}$ ]]; then
  echo "HOSTEL2_DEPLOY_REF must be a full branch ref or a reviewed commit SHA."
  exit 1
fi
old_commit=$(run_app git rev-parse HEAD)
install -d -m 700 "$backup_dir"
printf '%s\n' "$old_commit" > "$backup_dir/previous-commit"
stopped=false
restore_on_error() {
  trap - ERR
  echo "Upgrade failed. Restoring the previous application."
  if [ -f "$backup_dir/application.tar.gz" ]; then
    run_app git switch --detach "$old_commit" || true
    tar -xzf "$backup_dir/application.tar.gz" -C "$app_dir" || true
  fi
  if [ "$stopped" = true ]; then systemctl start hostel2 || true; fi
  echo "Backup retained at $backup_dir"
  exit 1
}
trap restore_on_error ERR
systemctl stop hostel2
stopped=true
python3 - "$database_file" "$backup_dir/hostel.db" <<'PY'
import sqlite3, sys
with sqlite3.connect("file:" + sys.argv[1] + "?mode=ro", uri=True) as source:
    with sqlite3.connect(sys.argv[2]) as destination:
        source.backup(destination)
        result = destination.execute("PRAGMA integrity_check").fetchone()[0]
        if result != "ok":
            raise RuntimeError("Backup integrity check failed")
PY
chmod 600 "$backup_dir/hostel.db"
tar --exclude='./node_modules' --exclude='./.git'   -czf "$backup_dir/application.tar.gz" -C "$app_dir" .
run_app git stash push -u -m "Before provider SQLite upgrade"
run_app git fetch origin "$deploy_ref"
run_app git switch --detach FETCH_HEAD
run_app npm ci --include=dev
run_app npm run lint
run_app npm test
run_app npm run build
run_app node --import tsx scripts/provider-upgrade.ts --offline
run_app npm run db:check

systemctl start hostel2
healthy=false
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 2 "http://127.0.0.1:$port/api/app" -o /dev/null; then
    healthy=true
    break
  fi
  sleep 1
done
if [ "$healthy" != true ]; then
  systemctl stop hostel2
  false
fi
trap - ERR
echo "DEPLOYMENT COMPLETE"
echo "Backup: $backup_dir"
run_app git log -1 --oneline
systemctl status hostel2 --no-pager -l
