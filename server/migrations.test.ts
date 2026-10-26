import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { Store } from './domain.js';
import { Database } from './database.js';
import { rollbackPropertyMigration } from './migrations.js';

test('version 1 preserves old properties and private records; rollback retains latest edits and can migrate again',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'yh-migration-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const url=`file:${directory}/legacy.db`;const raw=createClient({url});
  await raw.execute('CREATE TABLE app_state (id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
  const original=new Store(undefined,true).getState();original.hostels[0].phone='PRESERVE-PHONE';original.rentals[0].landlordInternalNotes='PRESERVE-PRIVATE';
  await raw.execute({sql:'INSERT INTO app_state VALUES(1,?)',args:[JSON.stringify(original)]});raw.close();
  let database=new Database({url,demo:false});
  await database.transaction(async(state,tx)=>{
    assert.deepEqual(state.hostels,original.hostels);assert.deepEqual(state.rentals,original.rentals);assert.deepEqual(state.bookings,original.bookings);assert.deepEqual(state.credentials,original.credentials);
    assert.equal((await tx.execute('SELECT COUNT(*) AS count FROM schema_migrations')).rows[0].count,1);
    const persisted=JSON.parse(String((await tx.execute('SELECT data FROM app_state')).rows[0].data));assert.equal(persisted.hostels,undefined);
    state.hostels[0].phone='LATEST-EDIT';
  });await database.close();
  const client=createClient({url});await rollbackPropertyMigration(client);
  const rolledBack=JSON.parse(String((await client.execute('SELECT data FROM app_state')).rows[0].data));assert.equal(rolledBack.hostels[0].phone,'LATEST-EDIT');assert.equal(rolledBack.rentals[0].landlordInternalNotes,'PRESERVE-PRIVATE');client.close();
  database=new Database({url,demo:false});await database.transaction(async(state)=>{assert.equal(state.hostels[0].phone,'LATEST-EDIT');assert.deepEqual(state.bookings,original.bookings);});await database.close();
});
