import { connectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ensureAlertEvaluationSchedule } from "../queues/alertEvaluation.queue.js";
import { ensureSnapshotSchedule } from "../queues/snapshot.queue.js";
import { isMainModule } from "../utils/runtime.js";

let workersInitialized = false;

export async function startWorkers(): Promise<void> {
  if (workersInitialized) return;
  await connectDb();
  await Promise.all([import("./csv.worker.js"), import("./alerts.worker.js"), import("./snapshot.worker.js"), import("./analyticsWarmup.worker.js")]);
  await Promise.all([ensureAlertEvaluationSchedule(), ensureSnapshotSchedule()]);
  workersInitialized = true;
  logger.info({ component: "workers" }, "RiskLens workers started");
}

export async function bootstrapWorkers(): Promise<void> {
  let attempt = 0;
  while (!workersInitialized) {
    attempt++;
    try {
      await startWorkers();
      logger.info({ component: "workers", attempt }, "Workers successfully initialized");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        { component: "workers", attempt, error: message },
        "Worker connection to Redis failed. Will retry in 15 seconds without exiting..."
      );
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }
}

if (isMainModule(import.meta.url)) {
  bootstrapWorkers().catch((error) => {
    logger.error({ error }, "Unexpected worker bootstrap error");
  });
}
