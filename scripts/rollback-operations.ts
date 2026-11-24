import {requireCurrentRecovery} from '../server/persistence.js';
import {assertRuntimeEnvironment,assertDatabaseTarget,assertDatabaseIdentity} from '../server/environment.js';
import "dotenv/config";
import { createClient } from "@libsql/client";
import { rollbackOperationsMigration } from "../server/migrations.js";
if (
  process.env.CONFIRM_OPERATIONS_ROLLBACK !== "1" ||
  !process.env.DATABASE_URL
)
  throw new Error(
    "Stop application and worker, take a full backup, then set CONFIRM_OPERATIONS_ROLLBACK=1 and DATABASE_URL.",
  );
assertRuntimeEnvironment();
if(process.env.DATABASE_URL)assertDatabaseTarget(process.env.DATABASE_URL);
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
await assertDatabaseIdentity(client);
if(process.env.REQUIRE_MIGRATION_BACKUP==='true'){if(!process.argv.includes('--offline'))throw Error('Stop all writers and pass --offline --backup VERIFIED_FILE.');const i=process.argv.indexOf('--backup');await requireCurrentRecovery(client,i>=0?process.argv[i+1]:undefined);}
try {
  await rollbackOperationsMigration(client);
  console.log(
    "Operations migration rolled back using current records. Run the previous application version.",
  );
} finally {
  client.close();
}
