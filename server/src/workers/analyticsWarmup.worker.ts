import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import type { AnalyticsWarmupJobData } from "../queues/analyticsWarmup.queue.js";
import { analyticsService } from "../modules/analytics/analytics.service.js";

export const analyticsWarmupWorker = new Worker<AnalyticsWarmupJobData>(
  "analytics-warmup",
  async (job) => {
    const startedAt = performance.now();
    await Promise.all([
      analyticsService.holdings(job.data.userId, job.data.portfolioId, job.data.requestId),
      analyticsService.summary(job.data.userId, job.data.portfolioId, job.data.requestId),
      analyticsService.risk(job.data.userId, job.data.portfolioId, job.data.requestId),
      analyticsService.returns(job.data.userId, job.data.portfolioId, job.data.requestId)
    ]);

    logger.info(
      {
        requestId: job.data.requestId,
        queueJobId: job.id,
        portfolioId: job.data.portfolioId,
        latencyMs: Number((performance.now() - startedAt).toFixed(2))
      },
      "Analytics warmup worker completed"
    );

    return { warmed: true };
  },
  {
    connection: createRedisConnection("risklens-analytics-warmup-worker"),
    concurrency: 5
  }
);

analyticsWarmupWorker.on("failed", (job, error) => {
  logger.error({ queueJobId: job?.id, requestId: job?.data.requestId, error }, "Analytics warmup job failed");
});
