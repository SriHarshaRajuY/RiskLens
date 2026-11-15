import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeRedis, getRedis } from "./config/redis.js";
import { initSocketServer } from "./sockets/socketServer.js";
import { isMainModule } from "./utils/runtime.js";

process.on("uncaughtException", (error) => {
  logger.warn({ error: error.message }, "Server process caught uncaughtException (preventing crash)");
});

process.on("unhandledRejection", (reason) => {
  logger.warn({ reason: reason instanceof Error ? reason.message : String(reason) }, "Server process caught unhandledRejection (preventing crash)");
});

export async function startServer(): Promise<void> {
  await connectDb();

  try {
    const redis = getRedis();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timed out")), 3000))
    ]);
    logger.info({ component: "redis" }, "Redis ping succeeded");
  } catch (error) {
    logger.warn(
      { component: "redis", error: error instanceof Error ? error.message : String(error) },
      "Redis is unavailable on startup. RiskLens API will continue in degraded mode (direct DB queries, queue jobs paused)."
    );
  }

  const httpServer = createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, url: env.SERVER_URL }, "RiskLens API listening");
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, "Shutting down RiskLens API");
    httpServer.close(async () => {
      await Promise.allSettled([disconnectDb(), closeRedis()]);
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (isMainModule(import.meta.url)) {
  startServer().catch((error) => {
    logger.error({ error }, "API bootstrap failed");
    process.exit(1);
  });
}
