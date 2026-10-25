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
  constructor(options: DatabaseOptions = {}) {
    const url = options.url ?? process.env.DATABASE_URL;
    if (!url && (process.env.VERCEL || process.env.NODE_ENV === 'production')) throw new Error('DATABASE_URL is required in production. Use a persistent hosted libSQL database.');
    if (!url) mkdirSync('data', { recursive: true });
    if (process.env.VERCEL && url?.startsWith('file:')) throw new Error('Vercel requires a remote DATABASE_URL; local files are ephemeral.');
    this.demo = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && (options.demo ?? process.env.DEMO_MODE === 'true');
    this.client = createClient({ url: url ?? 'file:data/hostel.db', authToken: options.authToken ?? process.env.DATABASE_AUTH_TOKEN });
    this.ready = this.initialize(options);
  }
  private async initialize(options: DatabaseOptions) {
    await this.client.batch([
      'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
      `CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, channel TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_error TEXT)`,
    ], 'write');
    const existing = await this.client.execute('SELECT id FROM app_state WHERE id=1');
    if (existing.rows.length) { await this.bootstrapAdmin(options); return; }
    const state = new Store(undefined, true).getState();
    state.currentUser = null;
    // Sample content is retained; identities, private guest records and claims are not production seeds.
    state.credentials = {};
    state.users = this.demo ? state.users : [];
    state.bookings = []; state.rentalInquiries = []; state.reviews = []; state.auditLogs = [];
    for (const hostel of state.hostels) { hostel.verification = { status: 'unverified' }; delete hostel.floorAndDoorCode; }
    for (const rental of state.rentals) { rental.verifiedBadge = false; rental.verifiedExplanation = ''; rental.lastCheckedAt = ''; }
    if (this.demo) {
      for (const user of state.users) state.credentials[user.id] = await createPasswordCredential(user.role === 'admin' ? 'Admin@2026' : user.role === 'hostel_manager' ? 'Hostel@2026' : 'Traveler@2026');
    }
    await this.client.execute({ sql: 'INSERT OR IGNORE INTO app_state(id,data) VALUES(1,?)', args: [JSON.stringify(state)] });
    await this.bootstrapAdmin(options);
  }
  private async bootstrapAdmin(options: DatabaseOptions) {
    const email = options.adminEmail ?? process.env.ADMIN_EMAIL;
    const password = options.adminPassword ?? process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) throw new Error('Bootstrap admin requires a valid email and a password of at least 12 characters.');
    const tx = await this.client.transaction('write');
    try {
      const row = await tx.execute('SELECT data FROM app_state WHERE id=1');
      const state = JSON.parse(String(row.rows[0].data)) as AppStoreState;
      if (!state.users.some(user => user.role === 'admin' && user.isActive)) {
        if (state.users.some(user => user.email === email.trim().toLowerCase())) throw new Error('Bootstrap admin email is already registered. Use a distinct admin email.');
        const id = crypto.randomUUID();
        state.users.push({ id, email: email.trim().toLowerCase(), name: 'Administrator', role: 'admin', isActive: true, createdAt: new Date().toISOString() });
        state.credentials[id] = await createPasswordCredential(password);
        await tx.execute({ sql: 'UPDATE app_state SET data=? WHERE id=1', args: [JSON.stringify(state)] });
      }
      await tx.commit();
    } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
  }
  async transaction<T>(operation: (state: AppStoreState, tx: Transaction) => Promise<T>): Promise<T> {
    const run = async () => {
      await this.ready;
      const tx = await this.client.transaction('write');
      try {
        const result = await tx.execute('SELECT data FROM app_state WHERE id=1');
        const state = JSON.parse(String(result.rows[0].data)) as AppStoreState;
        const value = await operation(state, tx);
        state.currentUser = null;
        await tx.execute({ sql: 'UPDATE app_state SET data=? WHERE id=1', args: [JSON.stringify(state)] });
        await tx.commit();
        return value;
      } catch (error) { await tx.rollback(); throw error; }
      finally { tx.close(); }
    };
    const task = this.queue.then(run, run);
    this.queue = task.catch(() => {});
    return task;
  }
  async close() { await this.ready; await this.queue; this.client.close(); }
}
