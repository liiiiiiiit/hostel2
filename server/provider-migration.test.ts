import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createClient} from '@libsql/client';
import {Database} from './database.js';
import {verifyPassword} from './passwords.js';

test('additive provider migration preserves every existing table row and legacy scrypt credentials',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'provider-upgrade-')),url='file:'+directory+'/legacy.db';
  const seed=new Database({url,demo:true});
  await seed.waitUntilReady();
  await seed.sqlTransaction(async tx=>{
    await tx.execute("INSERT INTO job_postings VALUES('legacy-job','user-admin-1','Title','Company','Yerevan','Day','Description','contact',10000,'day','open',1,'2026-01-01',1)");
    await tx.execute("INSERT INTO tour_listings(id,owner_id,title,organizer,destination,departure,schedule,duration,description,contact,price,published,hidden,created_at) VALUES('legacy-tour','user-admin-1','Tour','Guide','Sevan','Yerevan','Weekly','Day','Description','contact',15000,1,0,'2026-01-01')");
    await tx.execute('DROP TABLE provider_accounts');
    await tx.execute('ALTER TABLE job_postings DROP COLUMN approved');
    await tx.execute('ALTER TABLE tour_listings DROP COLUMN approved');
    await tx.execute('ALTER TABLE tour_listings DROP COLUMN capacity');
    await tx.execute('DROP INDEX tour_bookings_capacity');
  });
  await seed.close();
  const client=createClient({url});
  const tables=(await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.map(row=>String(row.name));
  const snapshot=new Map<string,{columns:string[],rows:unknown[]}>();
  for(const name of tables){
    const r=await client.execute('SELECT * FROM "'+name+'" ORDER BY rowid');
    snapshot.set(name,{columns:r.columns,rows:r.rows.map(row=>r.columns.map(col=>row[col]))});
  }
  client.close();
  try {
    for(let attempt=0;attempt<2;attempt++){
      const migrated=new Database({url});
      await migrated.waitUntilReady();
      for(const [name,before] of snapshot){
        const sql='SELECT '+before.columns.map(col=>'"'+col+'"').join(',')+' FROM "'+name+'" ORDER BY rowid';
        const result=await migrated.client.execute(sql);
        assert.deepEqual(result.rows.map(row=>before.columns.map(col=>row[col])),before.rows,name);
      }
      const credential=(await migrated.client.execute("SELECT c.hash,c.salt FROM user_credentials c JOIN users u ON u.id=c.user_id WHERE u.email='admin@yerevanhub.com'")).rows[0];
      assert.equal(await verifyPassword('Admin@2026',{hash:String(credential.hash),salt:String(credential.salt)}),true);
      assert.equal((await migrated.publicState()).jobs[0].id,'legacy-job');
      assert.equal((await migrated.publicState()).tours[0].id,'legacy-tour');
      assert.equal((await migrated.client.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');
      await migrated.close();
    }
  } finally { await rm(directory,{recursive:true,force:true}); }
});
