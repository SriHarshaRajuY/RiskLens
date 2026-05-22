import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);

  connectionPromise = mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production"
  });

  await connectionPromise.finally(() => {
    connectionPromise = null;
  });

  logger.info({ component: "mongo" }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info({ component: "mongo" }, "MongoDB disconnected");
}
