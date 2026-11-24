#!/usr/bin/env python3
"""Offline relocation rehearsal/copy ONLY. Never changes the source or live configuration."""
import argparse, hashlib, json, os, pathlib, shutil, sqlite3, urllib.parse, contextlib
p=argparse.ArgumentParser()
p.add_argument('--source-db',required=True);p.add_argument('--source-media',required=True)
p.add_argument('--application-dir',required=True);p.add_argument('--destination',required=True)
p.add_argument('--offline',action='store_true');a=p.parse_args()
if not a.offline: raise SystemExit('Stop the web service AND every writer, take a verified encrypted backup, then pass --offline.')
source=pathlib.Path(a.source_db).resolve(strict=True);media=pathlib.Path(a.source_media).resolve(strict=True);app=pathlib.Path(a.application_dir).resolve(strict=True);dest=pathlib.Path(a.destination).resolve()
def inside(child,parent): return child==parent or parent in child.parents
if not source.is_file() or not media.is_dir(): raise SystemExit('Source database/media must exist.')
if inside(source,media) or inside(app,media): raise SystemExit('Media source must not contain the database or application directory.')
if source.stat().st_nlink != 1: raise SystemExit('Database hard links require manual investigation.')
if any(inside(x,pathlib.Path('/opt/hostel2-staging')) for x in (source,media,dest)): raise SystemExit('Production relocation must never use staging resources.')
if inside(dest,app) or inside(dest,media) or inside(media,dest) or inside(source,dest): raise SystemExit('Destination must be outside application/live resources and must be new.')
os.umask(0o077)
dest.mkdir(mode=0o700,parents=False,exist_ok=False)
(dest/'INCOMPLETE').write_text('Do not promote this candidate until VERIFIED.json exists.\n')
(dest/'data').mkdir(mode=0o700)
def quoted(name): return '"'+name.replace('"','""')+'"'
def records(conn):
    result={}
    for (name,sql) in conn.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        rows=conn.execute('SELECT * FROM '+quoted(name)).fetchall()
        encoded=sorted(json.dumps(r,ensure_ascii=False,default=lambda v:{'blob':bytes(v).hex()}) for r in rows)
        result[name]={'rows':len(rows),'sha256':hashlib.sha256(json.dumps(encoded).encode()).hexdigest(),'sql':sql}
    return result
def schema(conn): return conn.execute("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name").fetchall()
def files(root):
    result={}
    for base,dirs,names in os.walk(root,followlinks=False):
        for name in dirs+names:
            file=pathlib.Path(base)/name
            if file.is_symlink(): raise RuntimeError('Media symlinks require manual review: '+str(file.relative_to(root)))
        for name in names:
            file=pathlib.Path(base)/name
            if not file.is_file(): raise RuntimeError('Non-regular media entry')
            result[str(file.relative_to(root))]=hashlib.sha256(file.read_bytes()).hexdigest()
    return result
uri='file:'+urllib.parse.quote(str(source),safe='/')+'?mode=ro'
with contextlib.closing(sqlite3.connect(uri,uri=True)) as src:
    if src.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or src.execute('PRAGMA foreign_key_check').fetchall(): raise RuntimeError('Source integrity failed; nothing promoted.')
    before=records(src);before_schema=schema(src);before_files=files(media)
    with contextlib.closing(sqlite3.connect(dest/'data'/'hostel.db')) as target:
        # SQLite backup API includes committed WAL data. No ordinary .db copy.
        src.backup(target)
        if target.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or target.execute('PRAGMA foreign_key_check').fetchall(): raise RuntimeError('Candidate integrity failed')
        if records(target)!=before or schema(target)!=before_schema: raise RuntimeError('Database changed or clone differs; candidate is not promoted.')
        if 'media_assets' in before:
            for backend,key,size in target.execute('SELECT backend,storage_key,bytes FROM media_assets'):
                if backend!='local': raise RuntimeError('Remote media needs verified export/restore; do not silently omit it.')
                file=media/pathlib.Path(key).name
                if not file.is_file() or file.stat().st_size!=size: raise RuntimeError('A registered media file is missing/truncated.')
    shutil.copytree(media,dest/'media',symlinks=False)
    if files(dest/'media')!=before_files or files(media)!=before_files or records(src)!=before or schema(src)!=before_schema: raise RuntimeError('Source changed while copying. Keep writers stopped; discard no source files.')
for base,dirs,names in os.walk(dest):
    os.chmod(base,0o700)
    for name in names:
        file=pathlib.Path(base)/name;os.chmod(file,0o600)
        with open(file,'rb') as handle: os.fsync(handle.fileno())
report={'verified':True,'source':str(source),'mediaSource':str(media),'tables':before,'mediaFiles':len(before_files),'mediaManifest':before_files,'database':str(dest/'data'/'hostel.db'),'media':str(dest/'media')}
with open(dest/'VERIFIED.json','x') as output:
    json.dump(report,output,ensure_ascii=False,indent=2);output.flush();os.fsync(output.fileno())
(dest/'INCOMPLETE').unlink()
for base,dirs,names in os.walk(dest,topdown=False):
    fd=os.open(base,os.O_RDONLY|os.O_DIRECTORY)
    try: os.fsync(fd)
    finally: os.close(fd)
print(json.dumps({'verified':True,'candidate':str(dest),'tables':len(before),'mediaFiles':len(before_files),'sourceUnchanged':True}))
