import { Queue } from "bullmq";
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

export async function enqueueSnapshot(data: SnapshotJobData = {}): Promise<void> {
  await snapshotQueue.add("generate-snapshot", data);
}

export async function ensureSnapshotSchedule(): Promise<void> {
  await snapshotQueue.add(
    "generate-snapshot",
    {},
    {
      repeat: { every: 60 * 60 * 1000 },
      jobId: "repeat-portfolio-snapshots"
    }
  );
}
