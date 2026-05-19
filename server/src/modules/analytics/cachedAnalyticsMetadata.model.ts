import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const cachedAnalyticsMetadataSchema = new Schema(
  {
    portfolioId: {
      type: Schema.Types.ObjectId,
      ref: "Portfolio",
      required: true,
      index: true
    },
    cacheKey: {
      type: String,
      required: true,
      unique: true
    },
    metricType: {
      type: String,
      enum: ["SUMMARY", "HOLDINGS", "RISK", "RETURNS"],
      required: true
    },
    lastComputedAt: {
      type: Date,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    hitCount: {
      type: Number,
      default: 0
    },
    missCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

cachedAnalyticsMetadataSchema.index({ portfolioId: 1, metricType: 1 });

export type CachedAnalyticsMetadataDocument = InferSchemaType<typeof cachedAnalyticsMetadataSchema> & {
  _id: Types.ObjectId;
};

export const CachedAnalyticsMetadata: Model<CachedAnalyticsMetadataDocument> =
  model<CachedAnalyticsMetadataDocument>("CachedAnalyticsMetadata", cachedAnalyticsMetadataSchema);
