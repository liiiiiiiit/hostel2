#!/bin/bash
set -euo pipefail
# Only a manual, explicitly acknowledged production maintenance operation.
if [ "${1:-}" != --offline ] || [ "${2:-}" != --backup ] || [ -z "${3:-}" ] || [ "$#" != 3 ]; then
 echo 'Stop web and every worker first. Usage: migrate-offline.sh --offline --backup VERIFIED_ARCHIVE' >&2; exit 2
fi
cd /opt/hostel2/app
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/opt/hostel2/config/production.env
exec /usr/bin/flock --exclusive --nonblock /opt/hostel2/config/writers.lock \
 /opt/hostel2/node/bin/node --import tsx scripts/database.ts migrate --offline --backup "$3"
