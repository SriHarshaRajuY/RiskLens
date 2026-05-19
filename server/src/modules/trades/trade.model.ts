import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const tradeSchema = new Schema(
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
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 1,
      maxlength: 12
    },
    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    fees: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    tradeDate: {
      type: Date,
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ["MANUAL", "CSV", "SEED"],
      default: "MANUAL"
    },
    uploadJobId: {
      type: Schema.Types.ObjectId,
      ref: "UploadJob"
    },
    idempotencyKey: {
      type: String,
      index: true
    }
  },
  { timestamps: true }
);

tradeSchema.index({ userId: 1, portfolioId: 1, tradeDate: -1 });
tradeSchema.index({ portfolioId: 1, symbol: 1 });
tradeSchema.index({ portfolioId: 1, tradeDate: 1 });
tradeSchema.index({ portfolioId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export type TradeDocument = InferSchemaType<typeof tradeSchema> & { _id: Types.ObjectId };

export const Trade: Model<TradeDocument> = model<TradeDocument>("Trade", tradeSchema);
