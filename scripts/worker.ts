import "dotenv/config";
import { Database } from "../server/database.js";
import { scheduledWork } from "../server/jobs.js";
const database = new Database();
try { await database.waitUntilReady(); }
catch (error) { await database.close().catch(() => {}); throw error; }
const run = async () => {
  try {
    console.log(JSON.stringify(await scheduledWork(database)));
  } catch {
    console.error(
      "Worker failed; inspect configuration. No delivery is assumed.",
    );
    process.exitCode = 1;
  }
};
if (process.argv.includes("--once")) {
  await run();
  await database.close();
} else {
  await run();
  const timer = setInterval(() => {
    void run();
  }, 60000);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      clearInterval(timer);
      void database.close().then(() => process.exit());
    });
}
