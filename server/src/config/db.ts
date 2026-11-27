import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { Trade } from "../modules/trades/trade.model.js";
import { Portfolio } from "../modules/portfolio/portfolio.model.js";
import { PortfolioSnapshot } from "../modules/snapshots/portfolioSnapshot.model.js";
import { Alert } from "../modules/alerts/alert.model.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

async function repairTradeIdempotencyIndex(): Promise<void> {
  try {
    const indexes = await Trade.collection.indexes();
    const legacyIndex = indexes.find(
      (idx) =>
        idx.name === "portfolioId_1_idempotencyKey_1" &&
        !idx.partialFilterExpression
    );
    if (legacyIndex) {
      await Trade.collection.dropIndex("portfolioId_1_idempotencyKey_1");
      logger.info({ component: "mongo" }, "Dropped legacy compound sparse trade idempotency index");
    }
  } catch (error) {
    const codeName = (error as { codeName?: string }).codeName;
    if (codeName !== "NamespaceNotFound" && codeName !== "IndexNotFound") {
      logger.warn({ component: "mongo", error: error instanceof Error ? error.message : String(error) }, "Trade index check skipped");
    }
  }

  await Promise.allSettled([
    Trade.syncIndexes(),
    Portfolio.syncIndexes(),
    PortfolioSnapshot.syncIndexes(),
    Alert.syncIndexes()
  ]);
}

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

  if (env.NODE_ENV !== "test") {
    await repairTradeIdempotencyIndex();
  }

  logger.info({ component: "mongo" }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info({ component: "mongo" }, "MongoDB disconnected");
}
