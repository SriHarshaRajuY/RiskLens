import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import type { AlertEvaluationJobData } from "../queues/alertEvaluation.queue.js";
import { alertService } from "../modules/alerts/alert.service.js";

export const alertsWorker = new Worker<AlertEvaluationJobData>(
  "alert-evaluation",
  async (job) => {
    const startedAt = performance.now();
    const result = await alertService.evaluate(job.data);
    logger.info(
      {
        requestId: job.data.requestId,
        queueJobId: job.id,
        latencyMs: Number((performance.now() - startedAt).toFixed(2)),
        ...result
      },
      "Alert evaluation worker completed"
    );
    return result;
  },
  {
    connection: createRedisConnection("risklens-alert-worker"),
    concurrency: 5
  }
);

alertsWorker.on("failed", (job, error) => {
  logger.error({ queueJobId: job?.id, requestId: job?.data.requestId, error }, "Alert worker job failed");
});
