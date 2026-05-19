import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const portfolioSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    baseCurrency: {
      type: String,
      enum: ["USD", "INR"],
      default: "USD"
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

portfolioSchema.index({ userId: 1, createdAt: -1 });
portfolioSchema.index({ userId: 1, name: 1 }, { unique: true });

export type PortfolioDocument = InferSchemaType<typeof portfolioSchema> & { _id: Types.ObjectId };

export const Portfolio: Model<PortfolioDocument> = model<PortfolioDocument>("Portfolio", portfolioSchema);
