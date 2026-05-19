import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production"
  });

  logger.info({ component: "mongo" }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  logger.info({ component: "mongo" }, "MongoDB disconnected");
}
