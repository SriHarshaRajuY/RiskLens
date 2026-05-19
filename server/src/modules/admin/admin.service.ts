import { alertEvaluationQueue } from "../../queues/alertEvaluation.queue.js";
import { analyticsWarmupQueue } from "../../queues/analyticsWarmup.queue.js";
import { csvProcessingQueue } from "../../queues/csvProcessing.queue.js";
import { snapshotQueue } from "../../queues/snapshot.queue.js";
import { Alert } from "../alerts/alert.model.js";
import { metricsService } from "../metrics/metrics.service.js";
import { Notification } from "../notifications/notification.model.js";
import { UploadJob } from "../uploads/uploadJob.model.js";

async function queueStats() {
  const queues = [
    ["csvProcessing", csvProcessingQueue],
    ["alertEvaluation", alertEvaluationQueue],
    ["portfolioSnapshots", snapshotQueue],
    ["analyticsWarmup", analyticsWarmupQueue]
  ] as const;

  const entries = await Promise.all(
    queues.map(async ([name, queue]) => [
      name,
      await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed")
    ])
  );

  return Object.fromEntries(entries);
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
  }
};
