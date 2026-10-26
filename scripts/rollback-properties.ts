import 'dotenv/config';
import { createClient } from '@libsql/client';
import { rollbackPropertyMigration } from '../server/migrations.js';
if (process.env.CONFIRM_PROPERTY_ROLLBACK!=='1' || !process.env.DATABASE_URL) throw new Error('Stop the application, take a full backup, then set CONFIRM_PROPERTY_ROLLBACK=1 and DATABASE_URL.');
const client=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN});
try {await rollbackPropertyMigration(client);console.log('Property migration rolled back using current data. Run the previous application version.');}finally{client.close();}
