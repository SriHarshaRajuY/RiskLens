import { Types } from "mongoose";
import { emitToUser } from "../../sockets/socketServer.js";
import { activityService } from "../activity/activity.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { enqueueCsvProcessing } from "../../queues/csvProcessing.queue.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { UploadJob } from "./uploadJob.model.js";

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

    if (!input.file.originalname.toLowerCase().endsWith(".csv")) {
      throw badRequest("INVALID_UPLOAD_TYPE", "Only CSV files are supported");
    }

    const csvContent = input.file.buffer.toString("utf8");
    if (csvContent.trim().length === 0) {
      throw badRequest("EMPTY_CSV_UPLOAD", "CSV file is empty");
    }

    const uploadJob = await UploadJob.create({
      userId: new Types.ObjectId(input.userId),
      portfolioId: new Types.ObjectId(input.portfolioId),
      originalFileName: input.file.originalname,
      status: "QUEUED",
      requestId: input.requestId
    });

    const queueJobId = await enqueueCsvProcessing({
      uploadJobId: uploadJob._id.toString(),
      userId: input.userId,
      portfolioId: input.portfolioId,
      originalFileName: input.file.originalname,
      csvContent,
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
