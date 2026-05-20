import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const uploadJobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    portfolioId: {
      type: Schema.Types.ObjectId,
      ref: "Portfolio",
      required: true,
      index: true
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    checksum: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "PARTIAL_FAILURE"],
      default: "QUEUED",
      index: true
    },
    totalRows: {
      type: Number,
      default: 0
    },
    processedRows: {
      type: Number,
      default: 0
    },
    validRows: {
      type: Number,
      default: 0
    },
    invalidRows: {
      type: Number,
      default: 0
    },
    rowErrors: {
      type: [
        {
          row: Number,
          code: String,
          message: String
        }
      ],
      default: []
    },
    startedAt: Date,
    completedAt: Date,
    failedAt: Date,
    queueJobId: String,
    requestId: String
  },
  { timestamps: true }
);

uploadJobSchema.index({ userId: 1, status: 1, createdAt: -1 });
uploadJobSchema.index({ portfolioId: 1, createdAt: -1 });
uploadJobSchema.index({ userId: 1, portfolioId: 1, checksum: 1 });

export type UploadJobDocument = InferSchemaType<typeof uploadJobSchema> & { _id: Types.ObjectId };

export const UploadJob: Model<UploadJobDocument> = model<UploadJobDocument>("UploadJob", uploadJobSchema);
