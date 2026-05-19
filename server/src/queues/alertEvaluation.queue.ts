import { Queue } from "bullmq";
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

export async function enqueueAlertEvaluation(data: AlertEvaluationJobData = {}): Promise<void> {
  await alertEvaluationQueue.add("evaluate-alerts", data);
}

export async function ensureAlertEvaluationSchedule(): Promise<void> {
  await alertEvaluationQueue.add(
    "evaluate-alerts",
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      jobId: "repeat-alert-evaluation"
    }
  );
}
