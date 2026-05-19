import { Queue } from "bullmq";
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

export async function enqueueAnalyticsWarmup(data: AnalyticsWarmupJobData): Promise<void> {
  await analyticsWarmupQueue.add("warm-analytics-cache", data, {
    jobId: `warm:${data.portfolioId}:${Date.now()}`
  });
}
