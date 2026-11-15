import { Queue } from "bullmq";
import { logger } from "../config/logger.js";
import { defaultJobOptions, queueConnection } from "./queueOptions.js";

export type AnalyticsWarmupJobData = {
  portfolioId: string;
  userId: string;
  requestId?: string;
};

export const analyticsWarmupQueue = new Queue<AnalyticsWarmupJobData>("analytics-warmup", {
  connection: queueConnection,
  defaultJobOptions
});

analyticsWarmupQueue.on("error", (error) => {
  logger.warn({ queue: "analytics-warmup", error: error.message }, "Analytics warmup queue connection error");
});

export async function enqueueAnalyticsWarmup(data: AnalyticsWarmupJobData): Promise<void> {
  try {
    await analyticsWarmupQueue.add("warm-analytics-cache", data, {
      jobId: `warm:${data.portfolioId}:${Date.now()}`
    });
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Could not enqueue analytics warmup (Redis unavailable)");
  }
}
