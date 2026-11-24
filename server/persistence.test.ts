import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile,readFile,readdir,utimes,symlink,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '@libsql/client';
import {Database} from './database.js';
import {createVerifiedBackup,verifyBackup,retainVerifiedBackups,snapshotFingerprint} from './backup-files.js';
import {exportSnapshot,restoreSnapshot} from './backups.js';
import {guardMigrations,pendingMigrations,assertPersistentConfiguration,assertRestoreSeparation} from './persistence.js';
async function fixture(t:TestContext){const dir=await mkdtemp(path.join(tmpdir(),'yh-persistence-'));await mkdir(dir+'/media',{mode:0o700});const old=process.env.MEDIA_DIRECTORY;process.env.MEDIA_DIRECTORY=dir+'/media';const database=new Database({url:`file:${dir}/source.db`,demo:true});await database.waitUntilReady();t.after(async()=>{await database.close();if(old===undefined)delete process.env.MEDIA_DIRECTORY;else process.env.MEDIA_DIRECTORY=old;await rm(dir,{recursive:true,force:true});});return{dir,database,key:randomBytes(32).toString('base64')};}
test('verified atomic archives contain registered and unregistered media and preserve every recovery value',async t=>{
 const {dir,database,key}=await fixture(t),id=crypto.randomUUID(),bytes=Buffer.from('registered-image');await writeFile(dir+'/media/'+id+'.webp',bytes);await mkdir(dir+'/media/historical');await writeFile(dir+'/media/historical/orphan.webp','unregistered-history');await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,'/api/app?media='+id,id+'.webp','local',bytes.length,'admin',new Date().toISOString()]});const result=await createVerifiedBackup(database.client,dir+'/backups',key);assert.equal(result.assets,1);assert.equal(result.extraFiles,1);assert.equal((await stat(result.file)).mode&0o777,0o600);assert(!String(await readFile(result.file)).includes('unregistered-history'));assert((await readdir(dir+'/backups')).every(f=>!f.includes('.partial')&&!f.startsWith('.verify-')));const verified=await verifyBackup(result.file,key);assert.equal(verified.fingerprint,result.fingerprint);
 const target=createClient({url:'file:'+dir+'/recovered.db'});t.after(()=>target.close());await restoreSnapshot(target,verified.snapshot,dir+'/recovered-media');assert.equal(await readFile(dir+'/recovered-media/historical/orphan.webp','utf8'),'unregistered-history');assert.deepEqual(await readFile(dir+'/recovered-media/'+id+'.webp'),bytes);
});
test('source media size mismatch, missing files and corruption never produce a verified success',async t=>{
 const {dir,database,key}=await fixture(t),id=crypto.randomUUID();await writeFile(dir+'/media/'+id+'.webp','broken');await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,'/api/app?media='+id,id+'.webp','local',100,'admin','2026']});await assert.rejects(createVerifiedBackup(database.client,dir+'/backups',key),/length disagrees/);assert.equal((await readdir(dir+'/backups')).length,0);await database.client.execute('DELETE FROM media_assets');const result=await createVerifiedBackup(database.client,dir+'/backups',key);const original=await readFile(result.file);await writeFile(result.file,original.subarray(0,20));await assert.rejects(verifyBackup(result.file,key),/Truncated/);await writeFile(result.file,original);await assert.rejects(verifyBackup(result.file,randomBytes(32).toString('base64')));const changed=Buffer.from(original);changed[changed.length-1]^=1;await writeFile(result.file,changed);await assert.rejects(verifyBackup(result.file,key));
});
test('media pins preserve snapshot bytes when another client deletes the live upload after DB capture',async t=>{
 const {dir,database}=await fixture(t),id=crypto.randomUUID(),bytes=Buffer.from('pinned-image');await writeFile(dir+'/media/'+id+'.webp',bytes);await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,'/api/app?media='+id,id+'.webp','local',bytes.length,'admin','2026']});const second=createClient({url:'file:'+dir+'/source.db'});t.after(()=>second.close());const snapshot=await exportSnapshot(database.client,undefined,{afterSnapshot:async()=>{const tx=await second.transaction('write');try{await rm(dir+'/media/'+id+'.webp');await tx.execute('DELETE FROM media_assets');await tx.commit();}finally{tx.close();}}});assert.deepEqual(Buffer.from(snapshot.assets[0].bytes,'base64'),bytes);assert.equal((await database.client.execute('SELECT * FROM media_assets')).rows.length,0);
});
test('retention removes only verified old archives, preserves a minimum count and retains corrupt/partial evidence',async t=>{
 const {dir,database,key}=await fixture(t);const backups=[];for(let i=0;i<4;i++)backups.push(await createVerifiedBackup(database.client,dir+'/backups',key));for(const b of backups)await utimes(b.file,new Date(0),new Date(0));await writeFile(dir+'/backups/yerevanhub-broken.yhbak','corrupt');await writeFile(dir+'/backups/yerevanhub-interrupted.yhbak.partial','partial');const result=await retainVerifiedBackups(dir+'/backups',key,{days:30,minimum:2});assert.equal(result.removed.length,2);assert.equal(result.retained,2);assert.deepEqual(result.skipped,['yerevanhub-broken.yhbak']);assert.equal(await readFile(dir+'/backups/yerevanhub-interrupted.yhbak.partial','utf8'),'partial');await assert.rejects(retainVerifiedBackups(dir+'/backups',key,{days:30,minimum:0}));
});
test('binary values, large integers and autoincrement high-water marks survive verified recovery',async t=>{
 const {dir,database,key}=await fixture(t);await database.client.execute('CREATE TABLE opaque(id INTEGER PRIMARY KEY AUTOINCREMENT,bytes BLOB,value INTEGER)');await database.client.execute({sql:'INSERT INTO opaque(bytes,value) VALUES(?,?)',args:[Buffer.from([0,255,19]),9223372036854775807n]});await database.client.execute('UPDATE sqlite_sequence SET seq=100 WHERE name=\'opaque\'');const source=createClient({url:'file:'+dir+'/source.db',intMode:'bigint'});t.after(()=>source.close());const backup=await createVerifiedBackup(source,dir+'/backups',key);const checked=await verifyBackup(backup.file,key);assert(checked.rows>0);
});
test('migration guard refuses missing/stale backups and a failed migration leaves the verified recovery point intact',async t=>{
 const {dir,database,key}=await fixture(t);await database.client.execute('DROP INDEX service_listings_city');assert(await pendingMigrations(database.client));const env={REQUIRE_MIGRATION_BACKUP:'true',BACKUP_ENCRYPTION_KEY:key};await assert.rejects(guardMigrations(database.client,undefined,env),/blocked/);const backup=await createVerifiedBackup(database.client,dir+'/backups',key);await guardMigrations(database.client,backup.file,env);const original=snapshotFingerprint(await exportSnapshot(database.client));const tx=await database.client.transaction('write');try{await tx.execute('CREATE TABLE interrupted(id TEXT)');throw Error('injected migration failure');}catch{await tx.rollback();}finally{tx.close();}assert.equal(snapshotFingerprint(await exportSnapshot(database.client)),original);assert.equal((await verifyBackup(backup.file,key)).fingerprint,original);await database.client.execute("UPDATE users SET name='changed' WHERE role='admin'");await assert.rejects(guardMigrations(database.client,backup.file,env),/stale/);
});
test('recovery paths cannot alias source data/media and production managed paths cannot fall back into a release',async t=>{
 const {dir}=await fixture(t);await symlink(dir+'/source.db',dir+'/alias.db');assert.throws(()=>assertRestoreSeparation('file:'+dir+'/source.db','file:'+dir+'/alias.db',dir+'/media',dir+'/recovered'),/aliases/);assert.throws(()=>assertRestoreSeparation('file:'+dir+'/source.db','file:'+dir+'/new.db',dir+'/media',dir+'/media/recovered'),/separate/);assert.throws(()=>assertPersistentConfiguration({PERSISTENT_STORAGE_MODE:'managed',APP_ENV:'staging'}));assert.throws(()=>assertPersistentConfiguration({PERSISTENT_STORAGE_MODE:'managed',APP_ENV:'production',DATABASE_URL:'file:/opt/hostel2/app/data/hostel.db',MEDIA_STORAGE:'local'}));
});
test('offline SQLite relocation uses committed WAL content, preserves all images/rows and never changes or overwrites the source',async t=>{
 const {dir,database}=await fixture(t);await writeFile(dir+'/media/unregistered.webp','historical-photo');await database.client.execute('CREATE TABLE wal_fixture(id INTEGER PRIMARY KEY,value TEXT UNIQUE)');await database.client.execute("INSERT INTO wal_fixture VALUES(1,'committed-in-wal')");const before=snapshotFingerprint(await exportSnapshot(database.client));const args=['ops/persistence/copy-storage.py','--source-db',dir+'/source.db','--source-media',dir+'/media','--application-dir',process.cwd(),'--destination',dir+'/candidate','--offline'];const run=spawnSync('python3',args,{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(snapshotFingerprint(await exportSnapshot(database.client)),before);assert.equal(await readFile(dir+'/candidate/media/unregistered.webp','utf8'),'historical-photo');const clone=createClient({url:'file:'+dir+'/candidate/data/hostel.db'});t.after(()=>clone.close());assert.equal((await clone.execute('SELECT value FROM wal_fixture')).rows[0].value,'committed-in-wal');assert.equal(spawnSync('python3',args).status,1);assert.equal((await clone.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');
});

test('backup refuses absent source, unsafe media links, size-budget overflow and unsupported schema without publishing',async t=>{
  const {assertExistingBackupSource}=await import('./storage-paths.js');
  const {dir,database,key}=await fixture(t);
  assert.throws(()=>assertExistingBackupSource('file:'+dir+'/absent.db'),/already exist/);
  await assert.rejects(stat(dir+'/absent.db'));
  await symlink(dir+'/source.db',dir+'/media/unsafe.webp');
  await assert.rejects(createVerifiedBackup(database.client,dir+'/backups',key),/symlinks/);
  await rm(dir+'/media/unsafe.webp');
  const old=process.env.BACKUP_MAX_BYTES;process.env.BACKUP_MAX_BYTES='1048576';
  try{
    await writeFile(dir+'/media/too-big.webp',Buffer.alloc(1048576));
    await assert.rejects(createVerifiedBackup(database.client,dir+'/backups',key),/BACKUP_MAX_BYTES/);
  }finally{if(old===undefined)delete process.env.BACKUP_MAX_BYTES;else process.env.BACKUP_MAX_BYTES=old;}
  await rm(dir+'/media/too-big.webp');
  await database.client.execute('CREATE VIEW custom_history AS SELECT id FROM users');
  await assert.rejects(createVerifiedBackup(database.client,dir+'/backups',key),/views\/triggers/);
  assert.equal((await readdir(dir+'/backups')).length,0);
});

test('failed recovery cleans nested extra media and rolls back every table before a retry',async t=>{
  const {dir,database}=await fixture(t);await mkdir(dir+'/media/nested');await writeFile(dir+'/media/nested/extra.webp','extra');
  const snapshot=await exportSnapshot(database.client),target=createClient({url:'file:'+dir+'/retry.db'});
  t.after(()=>target.close());const original=target.transaction.bind(target);
  target.transaction=async(mode?)=>{const tx=await original(mode);tx.commit=async()=>{throw Error('injected interrupted commit');};return tx;};
  await assert.rejects(restoreSnapshot(target,snapshot,dir+'/retry-media'),/interrupted commit/);
  assert.equal((await readdir(dir+'/retry-media')).length,0);
  assert.equal((await target.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.length,0);
  target.transaction=original;await restoreSnapshot(target,snapshot,dir+'/retry-media');
  assert.equal(await readFile(dir+'/retry-media/nested/extra.webp','utf8'),'extra');
});

test('verified legacy migration preserves original accounts, hashes, bookings, listings and archived recovery state',async t=>{
  const {dir,key}=await fixture(t);const {Store}=await import('./domain.js');
  const url='file:'+dir+'/legacy.db',client=createClient({url});
  const legacy=new Store(undefined,true).getState();
  await client.execute('CREATE TABLE app_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
  await client.execute({sql:'INSERT INTO app_state VALUES(1,?)',args:[JSON.stringify(legacy)]});
  const backup=await createVerifiedBackup(client,dir+'/legacy-backups',key);client.close();
  const oldRequired=process.env.REQUIRE_MIGRATION_BACKUP,oldKey=process.env.BACKUP_ENCRYPTION_KEY;
  process.env.REQUIRE_MIGRATION_BACKUP='true';process.env.BACKUP_ENCRYPTION_KEY=key;
  try{
    const blocked=new Database({url});await assert.rejects(blocked.waitUntilReady(),/blocked/);await assert.rejects(blocked.close(),/blocked/);
    const upgraded=new Database({url,migrationBackup:backup.file});
    try{
      await upgraded.transaction(async state=>{
        for(const name of ['users','credentials','hostels','rentals','bookings'] as const)assert.deepEqual(state[name],legacy[name],name);
      });
      assert.equal((await upgraded.client.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');
      assert.equal((await upgraded.client.execute('PRAGMA foreign_key_check')).rows.length,0);
      assert.equal((await verifyBackup(backup.file,key)).fingerprint,backup.fingerprint);
    }finally{await upgraded.close();}
  }finally{
    if(oldRequired===undefined)delete process.env.REQUIRE_MIGRATION_BACKUP;else process.env.REQUIRE_MIGRATION_BACKUP=oldRequired;
    if(oldKey===undefined)delete process.env.BACKUP_ENCRYPTION_KEY;else process.env.BACKUP_ENCRYPTION_KEY=oldKey;
  }
});
