import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const equityPointSchema = new Schema(
  {
    date: {
      type: Date,
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const backtestResultSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    strategy: {
      type: String,
      enum: ["BUY_AND_HOLD", "MOVING_AVERAGE_CROSSOVER"],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    initialCapital: {
      type: Number,
      required: true,
      min: 1
    },
    finalCapital: {
      type: Number,
      required: true
    },
    totalReturn: {
      type: Number,
      required: true
    },
    sharpeRatio: {
      type: Number,
      required: true
    },
    maxDrawdown: {
      type: Number,
      required: true
    },
    numberOfTrades: {
      type: Number,
      required: true
    },
    winRate: {
      type: Number,
      required: true
    },
    equityCurve: {
      type: [equityPointSchema],
      default: []
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

backtestResultSchema.index({ userId: 1, createdAt: -1 });
backtestResultSchema.index({ symbol: 1, strategy: 1, createdAt: -1 });

export type BacktestResultDocument = InferSchemaType<typeof backtestResultSchema> & { _id: Types.ObjectId };

export const BacktestResult: Model<BacktestResultDocument> = model<BacktestResultDocument>(
  "BacktestResult",
  backtestResultSchema
);
