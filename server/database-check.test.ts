import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Database } from './database.js';

for (const defect of ['missing table', 'orphaned owner'] as const) test(`db:check rejects provider ${defect} without modifying historical records`, async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yh-db-check-'));
  t.after(() => rm(directory, {recursive:true,force:true}));
  const url = `file:${directory}/test.db`, db = new Database({url,demo:true});
  await db.waitUntilReady();
  if (defect === 'missing table') await db.client.execute('DROP TABLE job_applications');
  else await db.client.execute("INSERT INTO job_postings(id,owner_id,title,company,location,schedule,description,contact,salary,period,status,created_at) VALUES('orphan','missing-owner','Job','Team','Yerevan','Daily','Work','contact',1000,'day','open','2026-01-01')");
  const before = Number((await db.client.execute('SELECT COUNT(*) AS n FROM users')).rows[0].n);
  await db.close();
  const command = spawnSync(process.execPath, ['--import','tsx','scripts/database.ts','check'], {env:{...process.env,DATABASE_URL:url},encoding:'utf8'});
  assert.equal(command.status,1, command.stdout + command.stderr);
  const report = JSON.parse(command.stdout);
  assert.equal(report.schemaReady,false);
  assert.equal(report.counts.users,before);
  if(defect==='missing table')assert(report.providers.missingTables.includes('job_applications'));
  else assert.equal(report.providers.orphanedRows.jobsWithoutOwner,1);
});
