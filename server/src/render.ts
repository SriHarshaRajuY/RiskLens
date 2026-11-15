import { logger } from "./config/logger.js";
import { startServer } from "./server.js";
import { bootstrapWorkers } from "./workers/index.js";

async function main(): Promise<void> {
  await startServer();
  bootstrapWorkers().catch((error) => {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Worker background loop error");
  });
  logger.info({ component: "runtime" }, "RiskLens API and worker supervisor started in single-service mode");
}

main().catch((error) => {
  logger.error({ error }, "Single-service runtime failed");
  process.exit(1);
});
