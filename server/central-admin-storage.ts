import type {Client,Transaction} from '@libsql/client';
import {randomUUID} from 'node:crypto';
export const centralAdminSQL=[
 `CREATE TABLE IF NOT EXISTS admin_cases(id TEXT PRIMARY KEY,module TEXT NOT NULL,target_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('note','report')),body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),status TEXT NOT NULL CHECK(status IN ('open','resolved')),version INTEGER NOT NULL CHECK(version>0),created_by TEXT REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS admin_activity(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,kind TEXT NOT NULL,module TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL CHECK(length(reason)<=2000),created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS admin_activity_reads(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,through_at TEXT NOT NULL)`,
 'CREATE INDEX IF NOT EXISTS admin_cases_target ON admin_cases(module,target_id,updated_at,id)',
 'CREATE INDEX IF NOT EXISTS admin_cases_status ON admin_cases(status,kind,updated_at,id)',
 'CREATE INDEX IF NOT EXISTS admin_activity_time ON admin_activity(created_at,id)'
];
export async function centralAdminReady(db:Client|Transaction){
 const names=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>String(r.name)));
 if(!names.has('module_migrations'))return false;
 for(const [table,required] of Object.entries({admin_cases:'id module target_id kind body status version created_by created_at updated_at',admin_activity:'id actor_id kind module target_id reason created_at',admin_activity_reads:'user_id through_at'})){
  if(!names.has(table))return false;const cols=new Set((await db.execute('PRAGMA table_info('+table+')')).rows.map(r=>String(r.name)));if(required.split(' ').some(c=>!cols.has(c)))return false;
 }
 const indexes=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='index'")).rows.map(r=>String(r.name)));
 return ['admin_cases_target','admin_cases_status','admin_activity_time'].every(n=>indexes.has(n))&&!!(await db.execute("SELECT name FROM module_migrations WHERE name='central-admin-v1'")).rows.length;
}
export async function migrateCentralAdmin(db:Client){const tx=await db.transaction('write');try{for(const sql of centralAdminSQL)await tx.execute(sql);await tx.execute("INSERT OR IGNORE INTO module_migrations VALUES('central-admin-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))");if(!await centralAdminReady(tx))throw Error('Incomplete central administration schema');await tx.commit();}catch(e){await tx.rollback();throw e;}finally{tx.close();}}
export async function adminEvent(tx:Transaction,actorId:string,kind:string,module:string,targetId:string,reason=''){await tx.execute({sql:'INSERT INTO admin_activity VALUES(?,?,?,?,?,?,?)',args:[randomUUID(),actorId,kind,module,targetId,reason,new Date().toISOString()]});}
