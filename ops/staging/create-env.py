#!/usr/bin/env python3
"""Create a NEW staging environment only; never overwrite a credential file."""
import os, pathlib, secrets, base64, grp
if os.geteuid() != 0:
    raise SystemExit('Run with sudo python3. No configuration was written.')
source = pathlib.Path(__file__).with_name('staging.env.example')
target = pathlib.Path('/etc/hostel2-staging/staging.env')
if target.parent.resolve() != target.parent:
    raise SystemExit('Staging configuration directory must not be a symlink.')
target.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
gid = grp.getgrnam('hostel2-staging').gr_gid
os.chown(target.parent, 0, gid)
os.chmod(target.parent, 0o750)
text = source.read_text().replace('ADMIN_PASSWORD=\n', 'ADMIN_PASSWORD=' + secrets.token_urlsafe(36) + '\n').replace('BACKUP_ENCRYPTION_KEY=\n', 'BACKUP_ENCRYPTION_KEY=' + base64.b64encode(secrets.token_bytes(32)).decode() + '\n')
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o640)
with os.fdopen(fd, 'w') as output:
    output.write(text)
os.chown(target, 0, gid)
print('Created a separate staging configuration. Password/key were not printed. Use sudoedit to review; keep the backup key separately.')
