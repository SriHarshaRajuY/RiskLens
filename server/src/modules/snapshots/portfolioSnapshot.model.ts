import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const portfolioSnapshotSchema = new Schema(
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
    date: {
      type: Date,
      required: true
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0
    },
    investedValue: {
      type: Number,
      required: true,
      min: 0
    },
    realizedPnl: {
      type: Number,
      required: true,
      default: 0
    },
    unrealizedPnl: {
      type: Number,
      required: true,
      default: 0
    },
    dailyReturn: {
      type: Number,
      required: true,
      default: 0
    },
    source: {
      type: String,
      enum: ["WORKER", "SEED", "MANUAL"],
      default: "WORKER"
    }
  },
  { timestamps: true }
);

portfolioSnapshotSchema.index({ portfolioId: 1, date: 1 }, { unique: true });
portfolioSnapshotSchema.index({ userId: 1, portfolioId: 1, date: -1 });

export type PortfolioSnapshotDocument = InferSchemaType<typeof portfolioSnapshotSchema> & { _id: Types.ObjectId };

export const PortfolioSnapshot: Model<PortfolioSnapshotDocument> = model<PortfolioSnapshotDocument>(
  "PortfolioSnapshot",
  portfolioSnapshotSchema
);
