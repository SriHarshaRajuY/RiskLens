import { connectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ensureAlertEvaluationSchedule } from "../queues/alertEvaluation.queue.js";
import { ensureSnapshotSchedule } from "../queues/snapshot.queue.js";
import { isMainModule } from "../utils/runtime.js";

export async function startWorkers(): Promise<void> {
  await connectDb();
  await Promise.all([import("./csv.worker.js"), import("./alerts.worker.js"), import("./snapshot.worker.js"), import("./analyticsWarmup.worker.js")]);
  await Promise.all([ensureAlertEvaluationSchedule(), ensureSnapshotSchedule()]);
  logger.info({ component: "workers" }, "RiskLens workers started");
}

if (isMainModule(import.meta.url)) {
  startWorkers().catch((error) => {
    logger.error({ error }, "Worker bootstrap failed");
    process.exit(1);
  });
}
