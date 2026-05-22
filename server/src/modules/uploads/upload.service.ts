import { Types } from "mongoose";
import { createHash } from "node:crypto";
import { emitToUser } from "../../sockets/socketServer.js";
import { activityService } from "../activity/activity.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { enqueueCsvProcessing } from "../../queues/csvProcessing.queue.js";
import { badRequest, notFound, serviceUnavailable } from "../../utils/errors.js";
import { paginationMeta, type Pagination } from "../../utils/pagination.js";
import { UploadJob } from "./uploadJob.model.js";

const REQUIRED_CSV_HEADERS = ["date", "symbol", "side", "quantity", "price", "fees"];
const UPLOAD_STATUSES = new Set(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "PARTIAL_FAILURE"]);

function normalizeHeader(header: string): string {
  return header.replace(/^\ufeff/, "").trim().toLowerCase();
}

function validateCsvHeaders(csvContent: string): void {
  const headerLine = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!headerLine) {
    throw badRequest("EMPTY_CSV_UPLOAD", "CSV file is empty");
  }

  const headers = headerLine.split(",").map(normalizeHeader).filter(Boolean);
  const missingHeaders = REQUIRED_CSV_HEADERS.filter((header) => !headers.includes(header));
  const unsupportedHeaders = headers.filter((header) => !REQUIRED_CSV_HEADERS.includes(header));

  if (missingHeaders.length > 0 || unsupportedHeaders.length > 0) {
    throw badRequest("INVALID_CSV_HEADERS", `CSV columns must be exactly: ${REQUIRED_CSV_HEADERS.join(", ")}`, {
      expectedHeaders: REQUIRED_CSV_HEADERS,
      receivedHeaders: headers,
      missingHeaders,
      unsupportedHeaders
    });
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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

    if (input.file.size === 0 || csvContent.slice(0, 256).trim().length === 0) {
      throw badRequest("EMPTY_CSV_UPLOAD", "CSV file is empty");
    }

    validateCsvHeaders(csvContent);

    const checksum = createHash("sha256").update(input.file.buffer).digest("hex");
    const uploadJob = await UploadJob.create({
      userId: new Types.ObjectId(input.userId),
      portfolioId: new Types.ObjectId(input.portfolioId),
      originalFileName: input.file.originalname,
      fileSize: input.file.size,
      checksum,
      csvContent,
      status: "QUEUED",
      requestId: input.requestId
    });

    let queueJobId: string;
    try {
      queueJobId = await withTimeout(
        enqueueCsvProcessing({
          uploadJobId: uploadJob._id.toString(),
          userId: input.userId,
          portfolioId: input.portfolioId,
          originalFileName: input.file.originalname,
          fileSize: input.file.size,
          checksum,
          requestId: input.requestId
        }),
        8_000,
        "CSV queue did not respond"
      );
    } catch (error) {
      uploadJob.status = "FAILED";
      uploadJob.failedAt = new Date();
      uploadJob.rowErrors = [
        {
          row: 0,
          code: "CSV_QUEUE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "CSV processing queue is unavailable"
        }
      ];
      uploadJob.set("csvContent", undefined);
      await uploadJob.save();
      throw serviceUnavailable("CSV_QUEUE_UNAVAILABLE", "CSV upload queue is unavailable. Make sure Redis and the worker are running.");
    }

    uploadJob.queueJobId = queueJobId;
    await uploadJob.save();

    await activityService.record({
      userId: input.userId,
      portfolioId: input.portfolioId,
      type: "CSV_UPLOAD_STARTED",
      message: `Queued CSV upload ${input.file.originalname}`,
      metadata: { uploadJobId: uploadJob._id.toString() }
    });

    emitToUser(input.userId, "upload.queued", {
      uploadJobId: uploadJob._id.toString(),
      portfolioId: input.portfolioId,
      status: "QUEUED",
      progress: 0,
      processedRows: 0,
      validRows: 0,
      invalidRows: 0
    });
    return uploadJob;
  },

  async getUploadJob(userId: string, uploadJobId: string) {
    const uploadJob = await UploadJob.findOne({ _id: uploadJobId, userId }).lean();
    if (!uploadJob) throw notFound("Upload job");
    return uploadJob;
  },

  async listUploadJobs(
    userId: string,
    pagination: Pagination,
    filters: { portfolioId?: string; status?: string }
  ) {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId)
    };

    if (filters.portfolioId) {
      if (!Types.ObjectId.isValid(filters.portfolioId)) {
        throw badRequest("INVALID_PORTFOLIO_ID", "Portfolio id is invalid");
      }
      query.portfolioId = new Types.ObjectId(filters.portfolioId);
    }

    if (filters.status) {
      if (!UPLOAD_STATUSES.has(filters.status)) {
        throw badRequest("INVALID_UPLOAD_STATUS", "Upload status filter is invalid");
      }
      query.status = filters.status;
    }

    const [items, total] = await Promise.all([
      UploadJob.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      UploadJob.countDocuments(query)
    ]);

    return {
      items,
      meta: paginationMeta(pagination.page, pagination.limit, total)
    };
  }
};
