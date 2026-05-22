import { createHash } from "node:crypto";
import { Worker } from "bullmq";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import { analyticsWarmupQueue } from "../queues/analyticsWarmup.queue.js";
import { alertEvaluationQueue } from "../queues/alertEvaluation.queue.js";
import { snapshotQueue } from "../queues/snapshot.queue.js";
import type { CsvProcessingJobData } from "../queues/csvProcessing.queue.js";
import { emitToUser } from "../sockets/socketServer.js";
import { activityService } from "../modules/activity/activity.service.js";
import { applyTradeToState, buildHoldings, replayTrades, type InternalHolding, type TradeLedgerEntry } from "../modules/analytics/holdings.service.js";
import { Trade } from "../modules/trades/trade.model.js";
import { UploadJob } from "../modules/uploads/uploadJob.model.js";
import { metricsService } from "../modules/metrics/metrics.service.js";
import { invalidatePortfolioCache } from "../utils/cache.js";
import { parseCsv } from "../utils/csvParser.js";
import { portfolioWriteLockKey, withDistributedLock } from "../utils/lock.js";

const csvRowSchema = z.object({
  date: z.coerce.date(),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z][A-Za-z0-9.-]*$/)
    .transform((value) => value.toUpperCase()),
  side: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(["BUY", "SELL"])),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  fees: z.coerce.number().min(0).default(0)
});

type CsvValidationError = {
  row: number;
  code: string;
  message: string;
};

type ValidatedCsvTrade = {
  row: number;
  key: string;
  ledgerEntry: TradeLedgerEntry;
  doc: Record<string, unknown>;
};

function idempotencyKey(portfolioId: string, row: z.infer<typeof csvRowSchema>): string {
  return createHash("sha256")
    .update(`${portfolioId}:${row.date.toISOString()}:${row.symbol}:${row.side}:${row.quantity}:${row.price}:${row.fees}`)
    .digest("hex");
}

function toLedgerEntry(input: {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  tradeDate: Date;
}): TradeLedgerEntry {
  return {
    symbol: input.symbol,
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    fees: input.fees,
    tradeDate: input.tradeDate
  };
}

async function emitProgress(data: CsvProcessingJobData, payload: Record<string, unknown>): Promise<void> {
  emitToUser(data.userId, "upload.progress", {
    uploadJobId: data.uploadJobId,
    portfolioId: data.portfolioId,
    ...payload
  });
}

function processingFailureMessage(error: unknown): string {
  if (!(error instanceof Error)) return "CSV processing failed. Please retry after checking the worker logs.";
  if (error.message.length <= 180) return error.message;
  return "CSV processing failed because the worker hit an internal processing error. Check the worker logs and retry the upload.";
}

export const csvWorker = new Worker<CsvProcessingJobData>(
  "csv-processing",
  async (job) => {
    const data = job.data;
    const startedAt = performance.now();

    logger.info(
      {
        requestId: data.requestId,
        queueJobId: job.id,
        uploadJobId: data.uploadJobId,
        userId: data.userId,
        portfolioId: data.portfolioId
      },
      "CSV worker started"
    );

    const uploadJob = await UploadJob.findByIdAndUpdate(
      data.uploadJobId,
      { status: "PROCESSING", startedAt: new Date() },
      { new: true }
    ).select("+csvContent");

    if (!uploadJob) {
      throw new Error(`Upload job ${data.uploadJobId} not found`);
    }
    const csvContent = (uploadJob as unknown as { csvContent?: string }).csvContent;
    if (!csvContent) {
      throw new Error(`Upload job ${data.uploadJobId} does not include CSV content`);
    }

    await emitProgress(data, { status: "PROCESSING", progress: 1 });

    try {
      return await withDistributedLock(
        portfolioWriteLockKey(data.portfolioId),
        async () => {
      const existingTrades = await Trade.find({ userId: data.userId, portfolioId: data.portfolioId })
        .sort({ tradeDate: 1, createdAt: 1 })
        .lean();
      const ledger = existingTrades.map((trade) =>
        toLedgerEntry({
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          fees: trade.fees,
          tradeDate: trade.tradeDate
        })
      );

      const seenKeys = new Set<string>();
      const errors: CsvValidationError[] = [];
      const validCandidates: ValidatedCsvTrade[] = [];

      const rows = await parseCsv(csvContent);
      const totalRows = rows.length;

      rows.forEach((rawRow, index) => {
        const rowNumber = index + 2;
        const parsed = csvRowSchema.safeParse(rawRow);

        if (!parsed.success) {
          errors.push({
            row: rowNumber,
            code: "INVALID_CSV_ROW",
            message: parsed.error.issues.map((issue) => issue.message).join("; ")
          });
          return;
        }

        const key = idempotencyKey(data.portfolioId, parsed.data);
        if (seenKeys.has(key)) {
          errors.push({
            row: rowNumber,
            code: "DUPLICATE_CSV_ROW",
            message: "Duplicate trade row in upload"
          });
          return;
        }

        const candidate = toLedgerEntry({
          symbol: parsed.data.symbol,
          side: parsed.data.side,
          quantity: parsed.data.quantity,
          price: parsed.data.price,
          fees: parsed.data.fees,
          tradeDate: parsed.data.date
        });

        seenKeys.add(key);
        validCandidates.push({
          row: rowNumber,
          key,
          ledgerEntry: candidate,
          doc: {
            userId: data.userId,
            portfolioId: data.portfolioId,
            symbol: parsed.data.symbol,
            side: parsed.data.side,
            quantity: parsed.data.quantity,
            price: parsed.data.price,
            fees: parsed.data.fees,
            tradeDate: parsed.data.date,
            source: "CSV",
            uploadJobId: data.uploadJobId,
            idempotencyKey: key
          }
        });
      });

      const state = new Map<string, InternalHolding>();
      for (const holding of replayTrades(ledger)) {
        state.set(holding.symbol, holding);
      }

      const validated: ValidatedCsvTrade[] = [];
      const orderedCandidates = [...validCandidates].sort((a, b) => {
        const dateDelta = a.ledgerEntry.tradeDate.getTime() - b.ledgerEntry.tradeDate.getTime();
        return dateDelta === 0 ? a.row - b.row : dateDelta;
      });

      for (const [index, candidate] of orderedCandidates.entries()) {
        try {
          applyTradeToState(state, candidate.ledgerEntry);
          ledger.push(candidate.ledgerEntry);
          validated.push(candidate);
        } catch (error) {
          errors.push({
            row: candidate.row,
            code: "LEDGER_VALIDATION_FAILED",
            message: error instanceof Error ? error.message : "Trade would make portfolio ledger invalid"
          });
        }

        if (index % 50 === 0) {
          const progress = Math.max(5, Math.round((index / Math.max(orderedCandidates.length, 1)) * 80));
          await job.updateProgress(progress);
          await UploadJob.findByIdAndUpdate(data.uploadJobId, {
            totalRows,
            processedRows: index + 1,
            validRows: validated.length,
            invalidRows: errors.length
          });
          await emitProgress(data, {
            status: "PROCESSING",
            progress,
            processedRows: index + 1,
            totalRows
          });
        }
      }

      const existingKeys = await Trade.find({
        portfolioId: data.portfolioId,
        idempotencyKey: mongoose.trusted({ $in: validated.map((trade) => trade.key) })
      })
        .select("idempotencyKey")
        .lean();
      const existingKeySet = new Set(existingKeys.map((trade) => trade.idempotencyKey).filter(Boolean));
      const insertable = validated.filter((trade) => {
        if (!existingKeySet.has(trade.key)) return true;
        errors.push({
          row: trade.row,
          code: "DUPLICATE_EXISTING_TRADE",
          message: "Trade row already exists in this portfolio"
        });
        return false;
      });

      for (let index = 0; index < insertable.length; index += env.CSV_BATCH_SIZE) {
        const batch = insertable.slice(index, index + env.CSV_BATCH_SIZE).map((trade) => ({
          insertOne: { document: trade.doc }
        }));
        if (batch.length > 0) {
          await Trade.bulkWrite(batch, { ordered: false });
        }
      }

      const status = errors.length === 0 ? "COMPLETED" : insertable.length > 0 ? "PARTIAL_FAILURE" : "FAILED";
      const completedAt = new Date();

      await UploadJob.findByIdAndUpdate(data.uploadJobId, {
        $set: {
          status,
          totalRows,
          processedRows: totalRows,
          validRows: insertable.length,
          invalidRows: errors.length,
          rowErrors: errors.slice(0, 250),
          completedAt,
          ...(status === "FAILED" ? { failedAt: completedAt } : {})
        },
        $unset: { csvContent: "" }
      });

      if (status === "FAILED") {
        metricsService.increment("failedUploads");
      }

      await Promise.all([
        invalidatePortfolioCache(data.portfolioId, data.requestId),
        activityService.record({
          userId: data.userId,
          portfolioId: data.portfolioId,
          type: status === "FAILED" ? "CSV_UPLOAD_FAILED" : "CSV_UPLOAD_COMPLETED",
          message: `${data.originalFileName}: ${insertable.length} trades imported, ${errors.length} rejected`,
          metadata: {
            uploadJobId: data.uploadJobId,
            status,
            validRows: insertable.length,
            invalidRows: errors.length
          }
        }),
        analyticsWarmupQueue.add("warm-analytics-cache", {
          userId: data.userId,
          portfolioId: data.portfolioId,
          requestId: data.requestId
        }),
        snapshotQueue.add("generate-snapshot", {
          userId: data.userId,
          portfolioId: data.portfolioId,
          requestId: data.requestId
        }),
        alertEvaluationQueue.add("evaluate-alerts", {
          userId: data.userId,
          portfolioId: data.portfolioId,
          requestId: data.requestId
        })
      ]);

      await buildHoldings(ledger, data.requestId);
      await job.updateProgress(100);
      await emitProgress(data, {
        status,
        progress: 100,
        processedRows: totalRows,
        validRows: insertable.length,
        invalidRows: errors.length
      });

      logger.info(
        {
          requestId: data.requestId,
          queueJobId: job.id,
          uploadJobId: data.uploadJobId,
          latencyMs: Number((performance.now() - startedAt).toFixed(2)),
          status,
          validRows: insertable.length,
          invalidRows: errors.length
        },
        "CSV worker completed"
      );

      return { status, validRows: insertable.length, invalidRows: errors.length };
        },
        { ttlMs: 120_000, waitMs: 30_000 }
      );
    } catch (error) {
      metricsService.increment("failedUploads");
      const failureMessage = processingFailureMessage(error);
      await UploadJob.findByIdAndUpdate(data.uploadJobId, {
        $set: {
          status: "FAILED",
          failedAt: new Date(),
          invalidRows: 1,
          rowErrors: [
            {
              row: 0,
              code: "CSV_PROCESSING_FAILED",
              message: failureMessage
            }
          ]
        },
        $unset: { csvContent: "" }
      });

      await activityService.record({
        userId: data.userId,
        portfolioId: data.portfolioId,
        type: "CSV_UPLOAD_FAILED",
        message: `${data.originalFileName} failed during processing`,
        metadata: { uploadJobId: data.uploadJobId }
      });

      await emitProgress(data, {
        status: "FAILED",
        progress: 100,
        error: failureMessage
      });

      throw error;
    }
  },
  {
    connection: createRedisConnection("risklens-csv-worker"),
    concurrency: 3
  }
);

csvWorker.on("failed", (job, error) => {
  logger.error(
    {
      queueJobId: job?.id,
      uploadJobId: job?.data.uploadJobId,
      requestId: job?.data.requestId,
      error
    },
    "CSV worker job failed"
  );
});
