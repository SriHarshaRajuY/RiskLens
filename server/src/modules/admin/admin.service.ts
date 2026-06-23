import type { Job } from "bullmq";
import { alertEvaluationQueue } from "../../queues/alertEvaluation.queue.js";
import { analyticsWarmupQueue } from "../../queues/analyticsWarmup.queue.js";
import { csvProcessingQueue } from "../../queues/csvProcessing.queue.js";
import { snapshotQueue } from "../../queues/snapshot.queue.js";
import { Alert } from "../alerts/alert.model.js";
import { metricsService } from "../metrics/metrics.service.js";
import { Notification } from "../notifications/notification.model.js";
import { UploadJob } from "../uploads/uploadJob.model.js";

type QueueStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

type ObservableQueue = {
  getJobCounts: (...statuses: QueueStatus[]) => Promise<Record<string, number>>;
  getJobs: (types: QueueStatus[], start?: number, end?: number, asc?: boolean) => Promise<Job[]>;
};

type QueueDescriptor = {
  name: string;
  purpose: string;
  queue: ObservableQueue;
};

const queueDescriptors: QueueDescriptor[] = [
  {
    name: "csv-processing",
    purpose: "Validates uploaded trade CSV files and imports valid rows in batches.",
    queue: csvProcessingQueue as unknown as ObservableQueue
  },
  {
    name: "alert-evaluation",
    purpose: "Evaluates active portfolio risk alerts and creates notifications.",
    queue: alertEvaluationQueue as unknown as ObservableQueue
  },
  {
    name: "portfolio-snapshots",
    purpose: "Creates portfolio value snapshots used by return and chart calculations.",
    queue: snapshotQueue as unknown as ObservableQueue
  },
  {
    name: "analytics-warmup",
    purpose: "Precomputes and warms frequently read portfolio analytics cache entries.",
    queue: analyticsWarmupQueue as unknown as ObservableQueue
  }
];

async function queueStats() {
  const entries = await Promise.all(
    queueDescriptors.map(async ({ name, queue }) => [
      name,
      await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused")
    ])
  );

  return Object.fromEntries(entries);
}

async function queueDetails() {
  return Promise.all(
    queueDescriptors.map(async ({ name, purpose, queue }) => {
      const [counts, failedJobs, activeJobs] = await Promise.all([
        queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
        queue.getJobs(["failed"], 0, 4, false),
        queue.getJobs(["active"], 0, 4, false)
      ]);

      return {
        name,
        purpose,
        counts,
        activeJobs: activeJobs.map((job) => ({
          id: job.id,
          name: job.name,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp
        })),
        recentFailures: failedJobs.map((job) => ({
          id: job.id,
          name: job.name,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          finishedOn: job.finishedOn
        }))
      };
    })
  );
}

export const adminService = {
  async metrics() {
    const [queues, activeAlerts, unreadNotifications, failedUploads] = await Promise.all([
      queueStats(),
      Alert.countDocuments({ isActive: true }),
      Notification.countDocuments({ isRead: false }),
      UploadJob.countDocuments({ status: "FAILED" })
    ]);

    return {
      ...metricsService.snapshot(),
      queues,
      domain: {
        activeAlerts,
        unreadNotifications,
        failedUploads
      }
    };
  },

  async queues() {
    const generatedAt = new Date().toISOString();
    const queues = await queueDetails();
    return {
      generatedAt,
      queues
    };
  }
};


