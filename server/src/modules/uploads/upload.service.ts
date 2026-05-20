import { Types } from "mongoose";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { emitToUser } from "../../sockets/socketServer.js";
import { activityService } from "../activity/activity.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { enqueueCsvProcessing } from "../../queues/csvProcessing.queue.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { UploadJob } from "./uploadJob.model.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "server", "uploads", "csv");
const ALLOWED_MIME_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "application/octet-stream"]);

export const uploadService = {
  async startCsvUpload(input: {
    userId: string;
    portfolioId: string;
    file?: Express.Multer.File;
    requestId: string;
  }) {
    await portfolioService.getOwned(input.userId, input.portfolioId);

    if (!input.file) {
      throw badRequest("CSV_FILE_REQUIRED", "A CSV file is required");
    }

    if (!input.file.originalname.toLowerCase().endsWith(".csv") || !ALLOWED_MIME_TYPES.has(input.file.mimetype)) {
      throw badRequest("INVALID_UPLOAD_TYPE", "Only CSV files are supported");
    }

    if (input.file.size === 0 || input.file.buffer.toString("utf8", 0, Math.min(input.file.buffer.length, 256)).trim().length === 0) {
      throw badRequest("EMPTY_CSV_UPLOAD", "CSV file is empty");
    }

    const checksum = createHash("sha256").update(input.file.buffer).digest("hex");
    const uploadJob = await UploadJob.create({
      userId: new Types.ObjectId(input.userId),
      portfolioId: new Types.ObjectId(input.portfolioId),
      originalFileName: input.file.originalname,
      fileSize: input.file.size,
      checksum,
      status: "QUEUED",
      requestId: input.requestId
    });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, `${uploadJob._id.toString()}.csv`);
    await writeFile(filePath, input.file.buffer);

    const queueJobId = await enqueueCsvProcessing({
      uploadJobId: uploadJob._id.toString(),
      userId: input.userId,
      portfolioId: input.portfolioId,
      originalFileName: input.file.originalname,
      filePath,
      fileSize: input.file.size,
      checksum,
      requestId: input.requestId
    });

    uploadJob.queueJobId = queueJobId;
    await uploadJob.save();

    await activityService.record({
      userId: input.userId,
      portfolioId: input.portfolioId,
      type: "CSV_UPLOAD_STARTED",
      message: `Queued CSV upload ${input.file.originalname}`,
      metadata: { uploadJobId: uploadJob._id.toString() }
    });

    emitToUser(input.userId, "upload.queued", uploadJob.toObject());
    return uploadJob;
  },

  async getUploadJob(userId: string, uploadJobId: string) {
    const uploadJob = await UploadJob.findOne({ _id: uploadJobId, userId }).lean();
    if (!uploadJob) throw notFound("Upload job");
    return uploadJob;
  }
};
