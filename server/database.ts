import { migrateDatabase } from './migrations.js';
import { migrateRelational } from './relational-migration.js';
import { loadState, flushState, where, none, type LoadedState, type Scope } from './relational-store.js';
import { tables } from './relational-schema.js';
import { mutationScope, visibleState, type RequestScope } from './repository.js';
import type { User } from '../src/types/index.js';
import { createClient, type Client, type Transaction } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { Store, type AppStoreState } from './domain.js';
import { createPasswordCredential } from './passwords.js';

export interface DatabaseOptions { url?: string; authToken?: string; demo?: boolean; adminEmail?: string; adminPassword?: string }
export class Database {
  readonly client: Client;
  readonly demo: boolean;
  private ready: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();
  private contexts = new WeakMap<Transaction,LoadedState>();
  constructor(options: DatabaseOptions = {}) {
    const url = options.url ?? process.env.DATABASE_URL;
    if (!url && (process.env.VERCEL || process.env.NODE_ENV === 'production')) throw new Error('DATABASE_URL is required in production. Use a persistent hosted libSQL database.');
    if (!url) mkdirSync('data', { recursive: true });
    if (process.env.VERCEL && url?.startsWith('file:')) throw new Error('Vercel requires a remote DATABASE_URL; local files are ephemeral.');
    this.demo = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && (options.demo ?? process.env.DEMO_MODE === 'true');
    this.client = createClient({ url: url ?? 'file:data/hostel.db', authToken: options.authToken ?? process.env.DATABASE_AUTH_TOKEN });
    this.ready = this.initialize(options);
  }
  async waitUntilReady(): Promise<void> { await this.ready; }
  private async initialize(options: DatabaseOptions) {
    await this.client.execute('PRAGMA foreign_keys=ON');
    if(Number((await this.client.execute('PRAGMA foreign_keys')).rows[0]?.foreign_keys)!==1)throw new Error('Database must enforce foreign keys before migration or writes.');
    if((options.url??process.env.DATABASE_URL??'file:').startsWith('file:')) {await this.client.execute('PRAGMA journal_mode=WAL');await this.client.execute('PRAGMA busy_timeout=5000');}
    await this.client.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    if(Number((await this.client.execute('SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations')).rows[0].version)>3)throw new Error('This database requires a newer application version.');
    if ((await this.client.execute('SELECT version FROM schema_migrations WHERE version=3')).rows.length) { await this.bootstrapAdmin(options); return; }
    await this.client.batch([
      'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
      `CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, channel TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_error TEXT)`,
    ], 'write');
    const existing = await this.client.execute('SELECT id FROM app_state WHERE id=1');
    if (existing.rows.length) { await migrateDatabase(this.client); await migrateRelational(this.client); await this.bootstrapAdmin(options); return; }
    const state = new Store(undefined, true).getState();
    state.currentUser = null;
    // Sample content is retained; identities, private guest records and claims are not production seeds.
    state.credentials = {};
    state.users = this.demo ? state.users : [];
    state.bookings = []; state.rentalInquiries = []; state.reviews = []; state.auditLogs = [];
    for (const hostel of state.hostels) { hostel.sampleContent = true; hostel.factsConfirmed = false; if (!this.demo) { hostel.isPublished = false; hostel.listingStatus = 'draft'; } hostel.verification = { status: 'unverified' }; delete hostel.floorAndDoorCode; }
    for (const rental of state.rentals) { rental.sampleContent = true; rental.factsConfirmed = false; if (!this.demo) rental.status = 'draft'; rental.verifiedBadge = false; rental.verifiedExplanation = ''; rental.lastCheckedAt = ''; }
    if (this.demo) {
      for (const user of state.users) state.credentials[user.id] = await createPasswordCredential(user.role === 'admin' ? 'Admin@2026' : user.role === 'hostel_manager' ? 'Hostel@2026' : 'Traveler@2026');
    }
    await this.client.execute({ sql: 'INSERT OR IGNORE INTO app_state(id,data) VALUES(1,?)', args: [JSON.stringify(state)] });
    await migrateDatabase(this.client);
    await migrateRelational(this.client);
    await this.bootstrapAdmin(options);
  }
  private async bootstrapAdmin(options: DatabaseOptions) {
    const email = options.adminEmail ?? process.env.ADMIN_EMAIL;
    const password = options.adminPassword ?? process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) throw new Error('Bootstrap admin requires a valid email and a password of at least 12 characters.');
    const tx = await this.client.transaction('write');
    try {
      const loaded=await loadState(tx,{...Object.fromEntries(tables.map(table=>[table.table,none])),users:where("(role='admin' AND is_active=1) OR email=? COLLATE NOCASE",email.trim().toLowerCase())});
      const state=loaded.state;
      if (!state.users.some(user => user.role === 'admin' && user.isActive)) {
        if (state.users.some(user => user.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Bootstrap admin email is already registered. Use a distinct admin email.');
        const id = crypto.randomUUID();
        state.users.push({ id, email: email.trim().toLowerCase(), name: 'Administrator', role: 'admin', isActive: true, createdAt: new Date().toISOString() });
        state.credentials[id] = await createPasswordCredential(password);
        await flushState(tx,loaded);
      }
      await tx.commit();
    } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
  }
  async sqlTransaction<T>(operation: (tx: Transaction) => Promise<T>, mode: 'read'|'write' = 'write'): Promise<T> {
    const run=async () => {
      await this.ready;
      const tx=await this.client.transaction(mode);
      try { const result=await operation(tx); await tx.commit(); return result; }
      catch(error) { await tx.rollback(); throw error; }
      finally { tx.close(); }
    };
    if(mode==='read')return run();
    const task=this.queue.then(run,run);this.queue=task.catch(()=>{});return task;
  }
  /** Compatibility adapter for business operations; only changed selected rows persist. */
  async transaction<T>(operation:(state:AppStoreState,tx:Transaction)=>Promise<T>, request?:RequestScope|{scope:Scope}):Promise<T> {
    return this.sqlTransaction(async tx=>{
      const scope=request ? 'scope' in request ? request.scope : await mutationScope(tx,request) : undefined;
      const loaded=await loadState(tx,scope);this.contexts.set(tx,loaded);
      try { const result=await operation(loaded.state,tx);loaded.state.currentUser=null;await flushState(tx,loaded);return result; }
      finally { this.contexts.delete(tx); }
    });
  }
  async flush(state:AppStoreState,tx:Transaction) {
    const loaded=this.contexts.get(tx);if(!loaded||loaded.state!==state)throw new Error('State does not belong to this transaction');
    await flushState(tx,loaded);
  }
  async publicState(actor:User|null=null,bookingToken='',inquiryToken='') {
    return this.sqlTransaction(tx=>visibleState(tx,actor,this.demo,bookingToken,inquiryToken),'read');
  }
  async close() { try { await this.ready; await this.queue; } finally { this.client.close(); } }
}
