import { Schema, Types, model, type InferSchemaType, type Model } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userAgent: {
      type: String,
      maxlength: 300
    },
    ipAddress: {
      type: String,
      maxlength: 80
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: {
      type: Date
    },
    replacedByTokenHash: {
      type: String
    }
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, expiresAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & { _id: Types.ObjectId };

export const Session: Model<SessionDocument> = model<SessionDocument>("Session", sessionSchema);
