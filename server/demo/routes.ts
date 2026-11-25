import type express from "express";
import type { Transaction } from "@libsql/client";
import type { Database } from "../database.js";
import type { User } from "../../src/types/index.js";
import { z } from "zod";
import { DemoManager } from "./manager.js";
import { demoEnabled, demoPaths } from "./safety.js";
import { configSchema } from "./fixtures.js";
const input = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("generate"), config: configSchema }).strict(),
  z
    .object({
      operation: z.literal("inspect"),
      batchId: z.uuid(),
      page: z.number().int().min(1).max(1000).default(1),
    })
    .strict(),
  z
    .object({ operation: z.enum(["validate", "import"]), batchId: z.uuid() })
    .strict(),
  z
    .object({
      operation: z.literal("cleanup"),
      batchIds: z.array(z.uuid()).min(1).max(20),
      confirmation: z.literal("DELETE SYNTHETIC BATCHES"),
    })
    .strict(),
]);
export function mountDemoRoutes(
  app: express.Express,
  database: Database,
  session: (req: express.Request, tx: Transaction) => Promise<User | null>,
) {
  if (!demoEnabled()) return;
  const manager = new DemoManager(database);
  app.all("/api/demo", async (req, res) => {
    try {
      demoPaths();
      const actor = await database.sqlTransaction(
        (tx) => session(req, tx),
        "read",
      );
      if (!actor || actor.role !== "admin" || !actor.isActive) {
        res
          .status(actor ? 403 : 401)
          .json({ success: false, error: "Administrator required." });
        return;
      }
      if (req.method === "GET") {
        res.json({ success: true, batches: await manager.status(actor) });
        return;
      }
      if (req.method !== "POST") {
        res.sendStatus(405);
        return;
      }
      if (
        req.headers["x-requested-with"] !== "YerevanHub" ||
        (req.headers.origin &&
          new URL(req.headers.origin).host !== req.headers.host)
      ) {
        res.sendStatus(403);
        return;
      }
      const body = input.parse(req.body);
      const expensive = ["generate", "import", "cleanup"].includes(
        body.operation,
      );
      const limited = await database.sqlTransaction(async (tx) => {
        const key =
          "demo:" +
          actor.id +
          ":" +
          (expensive ? "write:" : "read:") +
          Math.floor(Date.now() / 60000);
        await tx.execute({
          sql: "INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
          args: [key, Date.now() + 60000],
        });
        return (
          Number(
            (
              await tx.execute({
                sql: "SELECT count FROM rate_limits WHERE key=?",
                args: [key],
              })
            ).rows[0].count,
          ) > (expensive ? 10 : 60)
        );
      });
      if (limited) {
        res
          .set("Retry-After", "60")
          .status(429)
          .json({
            success: false,
            error: "Please wait before generating another batch.",
          });
        return;
      }
      const result =
        body.operation === "generate"
          ? await manager.generate(actor, body.config)
          : body.operation === "inspect"
            ? await manager.inspect(actor, body.batchId, body.page)
            : body.operation === "validate"
              ? await manager.validate(actor, body.batchId)
              : body.operation === "import"
                ? await manager.seed(actor, body.batchId)
                : await manager.cleanup(
                    actor,
                    "batchIds" in body ? body.batchIds : [],
                  );
      res.json({ success: true, result });
    } catch (e) {
      res
        .status(e instanceof z.ZodError ? 400 : 409)
        .json({
          success: false,
          error:
            e instanceof z.ZodError
              ? "Invalid demo request."
              : e instanceof Error
                ? e.message
                : "Demo operation failed.",
        });
    }
  });
}
