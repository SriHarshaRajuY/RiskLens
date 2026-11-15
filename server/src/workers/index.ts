import { connectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { isRedisReady } from "../config/redis.js";
import { ensureAlertEvaluationSchedule } from "../queues/alertEvaluation.queue.js";
import { ensureSnapshotSchedule } from "../queues/snapshot.queue.js";
import { isMainModule } from "../utils/runtime.js";

process.on("uncaughtException", (error) => {
  logger.warn({ error: error.message }, "Worker process caught uncaughtException (preventing crash)");
});

process.on("unhandledRejection", (reason) => {
  logger.warn({ reason: reason instanceof Error ? reason.message : String(reason) }, "Worker process caught unhandledRejection (preventing crash)");
});

let workersInitialized = false;

export async function startWorkers(): Promise<void> {
  if (workersInitialized) return;
  await connectDb();
  await Promise.all([import("./csv.worker.js"), import("./alerts.worker.js"), import("./snapshot.worker.js"), import("./analyticsWarmup.worker.js")]);

  if (isRedisReady()) {
    try {
      await Promise.all([ensureAlertEvaluationSchedule(), ensureSnapshotSchedule()]);
      workersInitialized = true;
      logger.info({ component: "workers" }, "RiskLens workers started and schedules registered");
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Worker schedules deferred (will retry)");
    }
  } else {
    logger.warn({ component: "workers" }, "Redis not ready; worker schedules deferred until connection is established");
  }
}

export async function bootstrapWorkers(): Promise<void> {
  let attempt = 0;
  while (!workersInitialized) {
    attempt++;
    try {
      await startWorkers();
      if (workersInitialized) {
        logger.info({ component: "workers", attempt }, "Workers successfully initialized");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        { component: "workers", attempt, error: message },
        "Worker startup attempt error. Will retry in 15 seconds without exiting..."
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}

if (isMainModule(import.meta.url)) {
  bootstrapWorkers().catch((error) => {
    logger.error({ error }, "Unexpected worker bootstrap error");
  });
}
