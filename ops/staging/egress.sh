#!/bin/bash
# Per-UID filter: block NEW outbound connections, allow replies to Nginx.
# No flushing of system chains and no matching of production's UID.
set -euo pipefail
uid=$(id -u hostel2-staging)
production_uid=$(id -u hostel2 2>/dev/null || echo -1)
if [ "$uid" = 0 ] || [ "$uid" = "$production_uid" ]; then
 echo 'Staging must have a distinct, unprivileged UID.' >&2; exit 1
fi
chain=YH_STAGING_EGRESS
case "${1:-}" in
 start)
  for command in iptables ip6tables; do
   "$command" -w -N "$chain" 2>/dev/null || "$command" -w -L "$chain" >/dev/null
   "$command" -w -C "$chain" -m conntrack --ctstate NEW -j REJECT 2>/dev/null || "$command" -w -A "$chain" -m conntrack --ctstate NEW -j REJECT
   "$command" -w -C OUTPUT -m owner --uid-owner "$uid" -j "$chain" 2>/dev/null || "$command" -w -I OUTPUT 1 -m owner --uid-owner "$uid" -j "$chain"
  done
  ;;
 stop)
  for command in iptables ip6tables; do
   if "$command" -w -C OUTPUT -m owner --uid-owner "$uid" -j "$chain" 2>/dev/null; then "$command" -w -D OUTPUT -m owner --uid-owner "$uid" -j "$chain"; fi
   # Keep the named chain; remove no unrelated rules.
  done
  ;;
 *) echo 'Use start or stop' >&2; exit 2;;
esac
