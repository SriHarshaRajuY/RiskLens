import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
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
    alertId: {
      type: Schema.Types.ObjectId,
      ref: "Alert"
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW"
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ portfolioId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: Types.ObjectId };

export const Notification: Model<NotificationDocument> = model<NotificationDocument>(
  "Notification",
  notificationSchema
);
