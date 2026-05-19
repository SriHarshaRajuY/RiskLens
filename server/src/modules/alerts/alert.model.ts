import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const alertSchema = new Schema(
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
    type: {
      type: String,
      enum: ["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"],
      required: true
    },
    threshold: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastTriggeredAt: {
      type: Date
    }
  },
  { timestamps: true }
);

alertSchema.index({ userId: 1, portfolioId: 1, isActive: 1 });
alertSchema.index({ portfolioId: 1, type: 1, isActive: 1 });

export type AlertDocument = InferSchemaType<typeof alertSchema> & { _id: Types.ObjectId };

export const Alert: Model<AlertDocument> = model<AlertDocument>("Alert", alertSchema);
