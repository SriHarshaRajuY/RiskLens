import { Queue } from "bullmq";
import { logger } from "../config/logger.js";
import { defaultJobOptions, queueConnection } from "./queueOptions.js";

export type SnapshotJobData = {
  portfolioId?: string;
  userId?: string;
  requestId?: string;
};

export const snapshotQueue = new Queue<SnapshotJobData>("portfolio-snapshots", {
  connection: queueConnection,
  defaultJobOptions
});

snapshotQueue.on("error", (error) => {
  logger.warn({ queue: "portfolio-snapshots", error: error.message }, "Snapshot queue connection error");
});

export async function enqueueSnapshot(data: SnapshotJobData = {}): Promise<void> {
  try {
    await snapshotQueue.add("generate-snapshot", data);
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Could not enqueue snapshot (Redis unavailable)");
  }
}

export async function ensureSnapshotSchedule(): Promise<void> {
  try {
    await snapshotQueue.add(
      "generate-snapshot",
      {},
      {
        repeat: { every: 60 * 60 * 1000 },
        jobId: "repeat-portfolio-snapshots"
      }
    );
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Could not ensure snapshot schedule (Redis unavailable)");
  }
}
