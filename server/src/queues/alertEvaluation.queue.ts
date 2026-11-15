import { Queue } from "bullmq";
import { logger } from "../config/logger.js";
import { defaultJobOptions, queueConnection } from "./queueOptions.js";

export type AlertEvaluationJobData = {
  portfolioId?: string;
  userId?: string;
  requestId?: string;
};

export const alertEvaluationQueue = new Queue<AlertEvaluationJobData>("alert-evaluation", {
  connection: queueConnection,
  defaultJobOptions
});

alertEvaluationQueue.on("error", (error) => {
  logger.warn({ queue: "alert-evaluation", error: error.message }, "Alert evaluation queue connection error");
});

export async function enqueueAlertEvaluation(data: AlertEvaluationJobData = {}): Promise<void> {
  try {
    await alertEvaluationQueue.add("evaluate-alerts", data);
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Could not enqueue alert evaluation (Redis unavailable)");
  }
}

export async function ensureAlertEvaluationSchedule(): Promise<void> {
  try {
    await alertEvaluationQueue.add(
      "evaluate-alerts",
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: "repeat-alert-evaluation"
      }
    );
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Could not ensure alert evaluation schedule (Redis unavailable)");
  }
}
