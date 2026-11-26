import {can} from '../src/utils/authorization.js';
import {authorizationUser,requireLivePermission,revokeAuthorizationSessions,auditAuthorization} from './authorization.js';
import type { Client, Transaction } from '@libsql/client';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createPasswordCredential } from './passwords.js';
import type { User } from '../src/types/index.js';

export const providerInput = z.object({
  id:z.string().min(1).max(500).optional(),name:z.string().trim().min(1).max(120),email:z.email().transform(v=>v.toLowerCase()),
  phone:z.string().trim().max(50),organization:z.string().trim().max(160),
  role:z.enum(['job_provider','tour_provider']),isActive:z.boolean(),password:z.string().max(128),
});
/** Additive migration. Existing users and listing rows retain their IDs and credentials. */
export async function migrateProviders(client:Client) {
  const tx=await client.transaction('write');
  try {
    await migrateProviderTables(tx);
    await tx.commit();
  } catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function migrateProviderTables(tx:Transaction) {
    await tx.execute(`CREATE TABLE IF NOT EXISTS provider_accounts (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider_role TEXT NOT NULL CHECK(provider_role IN ('job_provider','tour_provider')),
      organization TEXT NOT NULL DEFAULT ''
    )`);
    for(const table of ['job_postings','tour_listings']){
      const columns=(await tx.execute('PRAGMA table_info('+table+')')).rows;
      if(!columns.some(c=>c.name==='approved'))await tx.execute('ALTER TABLE '+table+' ADD COLUMN approved INTEGER NOT NULL DEFAULT 1 CHECK(approved IN (0,1))');
    }
    const tourColumns=(await tx.execute('PRAGMA table_info(tour_listings)')).rows;
    if(!tourColumns.some(c=>c.name==='capacity'))await tx.execute('ALTER TABLE tour_listings ADD COLUMN capacity INTEGER NOT NULL DEFAULT 100000 CHECK(capacity>0)');
    await tx.execute("CREATE INDEX IF NOT EXISTS tour_bookings_capacity ON tour_bookings(tour_id,travel_date,status)");
}
export async function providerUser(tx:Transaction,user:User|null):Promise<User|null>{
  return authorizationUser(tx,user);
}
export async function providerAccounts(tx:Transaction,actor:User|null){
  if(!can(actor,'accounts.assign'))return [];
  await requireLivePermission(tx,actor,'accounts.assign');
  const rows=(await tx.execute('SELECT u.id,u.name,u.email,u.phone,u.is_active,p.provider_role,p.organization FROM users u JOIN provider_accounts p ON p.user_id=u.id ORDER BY u.name,u.id')).rows;
  return rows.map(r=>({id:String(r.id),name:String(r.name),email:String(r.email),phone:String(r.phone??''),isActive:!!r.is_active,role:r.provider_role as 'job_provider'|'tour_provider',organization:String(r.organization)}));
}
export async function saveProvider(tx:Transaction,actor:User|null,input:z.infer<typeof providerInput>,createId:()=>string=randomUUID){
  await requireLivePermission(tx,actor,'accounts.assign');
  const id=input.id??createId();
  const before=input.id?(await tx.execute({sql:'SELECT u.role,u.is_active,p.provider_role,p.organization FROM users u JOIN provider_accounts p ON p.user_id=u.id WHERE u.id=?',args:[id]})).rows[0]:null;
  if(input.id&&!(await tx.execute({sql:'SELECT user_id FROM provider_accounts WHERE user_id=?',args:[id]})).rows.length)throw new Error('دسترسی مجاز نیست.');
  if((!input.id||input.password)&&input.password.length<12)throw new Error('رمز عبور باید حداقل ۱۲ نویسه باشد.');
  if((await tx.execute({sql:'SELECT id FROM users WHERE email=? COLLATE NOCASE AND id<>?',args:[input.email,id]})).rows.length)throw new Error('این ایمیل قبلاً ثبت‌نام شده است.');
  let invalidateTokens = Boolean(input.password) || !input.isActive;
  if(input.id){
    const old=(await tx.execute({sql:'SELECT p.provider_role,u.email FROM provider_accounts p JOIN users u ON u.id=p.user_id WHERE p.user_id=?',args:[id]})).rows[0];
    if(old.provider_role!==input.role)throw new Error('اطلاعات واردشده معتبر نیست.');
    const emailChanged = String(old.email).toLowerCase() !== input.email;
    invalidateTokens ||= emailChanged;
    await tx.execute({sql:'UPDATE users SET name=?,email=?,phone=?,is_active=?,email_verified_at=CASE WHEN ?=1 THEN NULL ELSE email_verified_at END WHERE id=?',args:[input.name,input.email,input.phone,Number(input.isActive),Number(emailChanged),id]});
  } else await tx.execute({sql:"INSERT INTO users(id,name,email,phone,role,is_active,created_at) VALUES(?,?,?,?,'traveler',?,?)",args:[id,input.name,input.email,input.phone,Number(input.isActive),new Date().toISOString()]});
  await tx.execute({sql:'INSERT INTO provider_accounts(user_id,provider_role,organization) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET organization=excluded.organization',args:[id,input.role,input.organization]});
  if(input.password){const credential=await createPasswordCredential(input.password);await tx.execute({sql:'INSERT INTO user_credentials(user_id,hash,salt) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET hash=excluded.hash,salt=excluded.salt',args:[id,credential.hash,credential.salt]});}
  // A superseded recovery/verification link must never undo an administrative reset.
  if(invalidateTokens)await tx.execute({sql:'UPDATE auth_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL',args:[Date.now(),id]});
  await tx.execute({sql:'DELETE FROM sessions WHERE user_id=?',args:[id]});
  await auditAuthorization(tx,actor!.id,id,before??null,{role:input.role,isActive:input.isActive,organization:input.organization,passwordReset:!!input.password},'provider_account_saved');
}
/** Preserve historical owners' access while new provider accounts are strictly role scoped. */
export async function requireProvider(tx:Transaction,actor:User|null,role:'job_provider'|'tour_provider'){
  return requireLivePermission(tx,actor,role==='job_provider'?'jobs.manage':'tours.manage');
}
