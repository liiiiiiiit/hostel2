#!/bin/sh
# Install as a root-owned Certbot deploy hook; affects only this certificate.
set -eu
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/test.yerevanhub.ir ]; then
  /usr/sbin/nginx -t
  /bin/systemctl reload nginx
fi
