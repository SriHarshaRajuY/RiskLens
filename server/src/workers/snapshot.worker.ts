import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import type { SnapshotJobData } from "../queues/snapshot.queue.js";
import { snapshotService } from "../modules/snapshots/snapshot.service.js";

export const snapshotWorker = new Worker<SnapshotJobData>(
  "portfolio-snapshots",
  async (job) => {
    const startedAt = performance.now();
    const result = await snapshotService.generate(job.data);
    logger.info(
      {
        requestId: job.data.requestId,
        queueJobId: job.id,
        latencyMs: Number((performance.now() - startedAt).toFixed(2)),
        ...result
      },
      "Snapshot worker completed"
    );
    return result;
  },
  {
    connection: createRedisConnection("risklens-snapshot-worker"),
    concurrency: 3
  }
);

snapshotWorker.on("failed", (job, error) => {
  logger.error({ queueJobId: job?.id, requestId: job?.data.requestId, error }, "Snapshot worker job failed");
});
