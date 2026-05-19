import { connectDb } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ensureAlertEvaluationSchedule } from "../queues/alertEvaluation.queue.js";
import { ensureSnapshotSchedule } from "../queues/snapshot.queue.js";
import "./csv.worker.js";
import "./alerts.worker.js";
import "./snapshot.worker.js";
import "./analyticsWarmup.worker.js";

async function main(): Promise<void> {
  await connectDb();
  await Promise.all([ensureAlertEvaluationSchedule(), ensureSnapshotSchedule()]);
  logger.info({ component: "workers" }, "RiskLens workers started");
}

main().catch((error) => {
  logger.error({ error }, "Worker bootstrap failed");
  process.exit(1);
});
