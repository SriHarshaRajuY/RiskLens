import type { Types } from "mongoose";
import { ActivityLog } from "./activityLog.model.js";

type ActivityType =
  | "PORTFOLIO_CREATED"
  | "PORTFOLIO_UPDATED"
  | "PORTFOLIO_DELETED"
  | "TRADE_CREATED"
  | "TRADE_UPDATED"
  | "TRADE_DELETED"
  | "CSV_UPLOAD_STARTED"
  | "CSV_UPLOAD_COMPLETED"
  | "CSV_UPLOAD_FAILED"
  | "ALERT_CREATED"
  | "ALERT_TRIGGERED"
  | "ALERT_UPDATED"
  | "ALERT_DELETED"
  | "BACKTEST_COMPLETED";

export const activityService = {
  async record(input: {
    userId: Types.ObjectId | string;
    portfolioId?: Types.ObjectId | string;
    type: ActivityType;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await ActivityLog.create(input);
  },

  async listForUser(userId: string, limit = 30) {
    return ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  },

  async listForPortfolio(userId: string, portfolioId: string, limit = 30) {
    return ActivityLog.find({ userId, portfolioId }).sort({ createdAt: -1 }).limit(limit).lean();
  }
};
