import { logger } from "./config/logger.js";
import { startServer } from "./server.js";
import { startWorkers } from "./workers/index.js";

async function main(): Promise<void> {
  await startServer();
  await startWorkers();
  logger.info({ component: "runtime" }, "RiskLens API and workers started in single-service mode");
}

main().catch((error) => {
  logger.error({ error }, "Single-service runtime failed");
  process.exit(1);
});
