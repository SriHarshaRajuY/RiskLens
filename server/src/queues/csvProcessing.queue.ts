import { Queue } from "bullmq";
import { defaultJobOptions, queueConnection } from "./queueOptions.js";

export type CsvProcessingJobData = {
  uploadJobId: string;
  userId: string;
  portfolioId: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  requestId: string;
};

export const csvProcessingQueue = new Queue<CsvProcessingJobData>("csv-processing", {
  connection: queueConnection,
  defaultJobOptions
});

export async function enqueueCsvProcessing(data: CsvProcessingJobData): Promise<string> {
  const job = await csvProcessingQueue.add("process-csv-upload", data, {
    jobId: data.uploadJobId
  });
  return job.id ?? data.uploadJobId;
}
