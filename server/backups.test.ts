import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';import {createClient} from '@libsql/client';import {Database} from './database.js';import {exportSnapshot,encryptSnapshot,decryptSnapshot,restoreSnapshot} from './backups.js';
test('encrypted full backup restores database records and image bytes into a separate target, rejects corruption and never overwrites data',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'yh-backup-'));t.after(()=>rm(directory,{recursive:true,force:true}));const database=new Database({url:`file:${directory}/source.db`,demo:true});await database.transaction(async state=>{state.hostels[0].phone='PERSISTED-PHONE';});
 const id=crypto.randomUUID(),image=Buffer.from('validated-image-bytes');await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,`https://example.public.blob.vercel-storage.com/${id}.webp`,`${id}.webp`,'blob',image.length,'admin',new Date().toISOString()]});
 const snapshot=await exportSnapshot(database.client,async()=>image);const key=randomBytes(32).toString('base64'),encrypted=encryptSnapshot(snapshot,key);assert.ok(!encrypted.includes(Buffer.from('PERSISTED-PHONE')));const altered=Buffer.from(encrypted);altered[altered.length-1]^=1;assert.throws(()=>decryptSnapshot(altered,key));
 const target=createClient({url:`file:${directory}/restored.db`});const media=path.join(directory,'restored-media');await restoreSnapshot(target,decryptSnapshot(encrypted,key),media);assert.equal((await readFile(path.join(media,id+'.webp'))).toString(),image.toString());
 const asset=(await target.execute('SELECT * FROM media_assets')).rows[0];assert.equal(asset.backend,'local');assert.equal(asset.url,`/api/app?media=${id}`);assert.deepEqual((await target.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name")).rows.map(row=>row.name),(snapshot.indexes??[]).map(index=>index.name).sort());assert.equal((await target.execute('PRAGMA foreign_key_check')).rows.length,0);await assert.rejects(()=>restoreSnapshot(target,snapshot,path.join(directory,'other')));target.close();
 const restored=new Database({url:`file:${directory}/restored.db`,demo:true});await restored.transaction(async state=>{assert.equal(state.hostels[0].phone,'PERSISTED-PHONE');assert.equal(state.users.length,6);});await restored.close();await database.close();
});

test('cloud restore writes new object keys and rewrites references with a mock storage provider',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'yh-cloud-restore-'));t.after(()=>rm(directory,{recursive:true,force:true}));const database=new Database({url:`file:${directory}/source.db`,demo:true});const id=crypto.randomUUID(),oldUrl=`https://source.public.blob.vercel-storage.com/${id}.webp`,bytes=Buffer.from('mock-image-content');
 await database.transaction(async state=>{state.hostels[0].photos=[oldUrl];});await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,oldUrl,oldUrl,'blob',bytes.length,'admin',new Date().toISOString()]});const snapshot=await exportSnapshot(database.client,async()=>bytes);const target=createClient({url:`file:${directory}/target.db`}),uploads:string[]=[];await restoreSnapshot(target,snapshot,'',{upload:async(key,value)=>{assert.equal(value.toString(),bytes.toString());uploads.push(key);return 'https://target.public.blob.vercel-storage.com/'+key;},remove:async()=>{}});
 assert.equal(uploads.length,1);assert.match(uploads[0],/^restores\//);const asset=(await target.execute('SELECT * FROM media_assets')).rows[0];assert.equal(asset.backend,'blob');assert.ok(String(asset.url).includes(uploads[0]));const property=(await target.execute("SELECT url FROM property_photos WHERE kind='hostel' ORDER BY sort_order LIMIT 1")).rows[0];assert.equal(property.url,asset.url);target.close();await database.close();
});

test('failed restore removes newly written local images and can retry on the same empty target', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'yh-failed-restore-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const database=new Database({url:`file:${directory}/source.db`,demo:true});
  t.after(()=>database.close());
  await database.waitUntilReady();
  const id=crypto.randomUUID(),bytes=Buffer.from('restore-test-image');
  await database.client.execute({sql:'INSERT INTO media_assets VALUES(?,?,?,?,?,?,?)',args:[id,`/api/app?media=${id}`,id+'.webp','local',bytes.length,'admin',new Date().toISOString()]});
  const snapshot=await exportSnapshot(database.client,async()=>bytes);
  const target=createClient({url:`file:${directory}/target.db`});t.after(()=>target.close());
  const original=target.transaction.bind(target);
  const fail=t.mock.method(target,'transaction',async(...args:Parameters<typeof target.transaction>)=>{
    const tx=await original(...args);
    t.mock.method(tx,'commit',async()=>{throw new Error('Simulated commit failure');});
    return tx;
  });
  const media=path.join(directory,'media');
  await assert.rejects(()=>restoreSnapshot(target,snapshot,media),/Simulated commit failure/);
  const {readdir}=await import('node:fs/promises');
  assert.deepEqual(await readdir(media),[],'Rollback must not strand files that make the next restore fail');
  assert.equal((await target.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.length,0);
  fail.mock.restore();
  await restoreSnapshot(target,snapshot,media);
  assert.equal((await readFile(path.join(media,id+'.webp'))).toString(),bytes.toString());
});
