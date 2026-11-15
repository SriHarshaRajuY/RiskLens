import { Queue } from "bullmq";
import { logger } from "../config/logger.js";
import { defaultJobOptions, queueConnection } from "./queueOptions.js";

export type CsvProcessingJobData = {
  uploadJobId: string;
  userId: string;
  portfolioId: string;
  originalFileName: string;
  fileSize: number;
  checksum: string;
  requestId: string;
};

export const csvProcessingQueue = new Queue<CsvProcessingJobData>("csv-processing", {
  connection: queueConnection,
  defaultJobOptions
});

csvProcessingQueue.on("error", (error) => {
  logger.warn({ queue: "csv-processing", error: error.message }, "CSV processing queue connection error");
});

export async function enqueueCsvProcessing(data: CsvProcessingJobData): Promise<string> {
  const job = await csvProcessingQueue.add("process-csv-upload", data, {
    jobId: data.uploadJobId
  });
  return job.id ?? data.uploadJobId;
}
