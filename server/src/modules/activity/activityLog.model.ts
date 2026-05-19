import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const activityLogSchema = new Schema(
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
      index: true
    },
    type: {
      type: String,
      enum: [
        "PORTFOLIO_CREATED",
        "PORTFOLIO_UPDATED",
        "PORTFOLIO_DELETED",
        "TRADE_CREATED",
        "TRADE_UPDATED",
        "TRADE_DELETED",
        "CSV_UPLOAD_STARTED",
        "CSV_UPLOAD_COMPLETED",
        "CSV_UPLOAD_FAILED",
        "ALERT_CREATED",
        "ALERT_TRIGGERED",
        "ALERT_UPDATED",
        "ALERT_DELETED",
        "BACKTEST_COMPLETED"
      ],
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ portfolioId: 1, createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema> & { _id: Types.ObjectId };

export const ActivityLog: Model<ActivityLogDocument> = model<ActivityLogDocument>(
  "ActivityLog",
  activityLogSchema
);
