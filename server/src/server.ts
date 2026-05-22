import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeRedis, getRedis } from "./config/redis.js";
import { initSocketServer } from "./sockets/socketServer.js";
import { isMainModule } from "./utils/runtime.js";

export async function startServer(): Promise<void> {
  await connectDb();
  await getRedis().ping();

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
