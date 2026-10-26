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
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
try {
  await rollbackOperationsMigration(client);
  console.log(
    "Operations migration rolled back using current records. Run the previous application version.",
  );
} finally {
  client.close();
}
