import mongoose from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { PortfolioSnapshot } from "../snapshots/portfolioSnapshot.model.js";
import { Trade } from "../trades/trade.model.js";
import { UploadJob } from "../uploads/uploadJob.model.js";
import { Notification } from "../notifications/notification.model.js";
import { notFound } from "../../utils/errors.js";
import { paginationMeta, type Pagination } from "../../utils/pagination.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { toObjectId } from "../../utils/objectId.js";
import { Portfolio } from "./portfolio.model.js";
import type { CreatePortfolioInput, UpdatePortfolioInput } from "./portfolio.validation.js";

function objectIds(userId: string, portfolioId: string) {
  return {
    userObjectId: toObjectId(userId, "userId"),
    portfolioObjectId: toObjectId(portfolioId, "portfolioId")
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const portfolioService = {
  async create(userId: string, input: CreatePortfolioInput) {
    const portfolio = await Portfolio.create({
      ...input,
      userId: toObjectId(userId, "userId")
    });

    await activityService.record({
      userId,
      portfolioId: portfolio._id,
      type: "PORTFOLIO_CREATED",
      message: `Created portfolio ${portfolio.name}`
    });

    return portfolio;
  },

  async list(userId: string, pagination: Pagination, filters: { search?: string; isArchived?: boolean }) {
    const query: Record<string, unknown> = {
      userId: toObjectId(userId, "userId")
    };

    if (filters.search) {
      query.name = new RegExp(escapeRegex(filters.search), "i");
    }

    if (typeof filters.isArchived === "boolean") {
      query.isArchived = filters.isArchived;
    }

    const [items, total] = await Promise.all([
      Portfolio.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Portfolio.countDocuments(query)
    ]);

    return {
      items,
      meta: paginationMeta(pagination.page, pagination.limit, total)
    };
  },

  async getOwned(userId: string, portfolioId: string) {
    const { userObjectId, portfolioObjectId } = objectIds(userId, portfolioId);
    const portfolio = await Portfolio.findOne({ _id: portfolioObjectId, userId: userObjectId });
    if (!portfolio) throw notFound("Portfolio");
    return portfolio;
  },

  async update(userId: string, portfolioId: string, input: UpdatePortfolioInput, requestId?: string) {
    const { userObjectId, portfolioObjectId } = objectIds(userId, portfolioId);
    const portfolio = await Portfolio.findOneAndUpdate({ _id: portfolioObjectId, userId: userObjectId }, input, {
      new: true,
      runValidators: true
    });

    if (!portfolio) throw notFound("Portfolio");
    await invalidatePortfolioCache(portfolioId, requestId);
    await activityService.record({
      userId,
      portfolioId,
      type: "PORTFOLIO_UPDATED",
      message: `Updated portfolio ${portfolio.name}`,
      metadata: { fields: Object.keys(input) }
    });

    return portfolio;
  },

  async remove(userId: string, portfolioId: string, requestId?: string): Promise<void> {
    const { userObjectId, portfolioObjectId } = objectIds(userId, portfolioId);
    const session = await mongoose.startSession();
    let portfolioName = "";

    try {
      await session.withTransaction(async () => {
        const portfolio = await Portfolio.findOne({ _id: portfolioObjectId, userId: userObjectId }).session(session);
        if (!portfolio) throw notFound("Portfolio");
        portfolioName = portfolio.name;

        await Trade.deleteMany({ userId: userObjectId, portfolioId: portfolioObjectId }).session(session);
        await Alert.deleteMany({ userId: userObjectId, portfolioId: portfolioObjectId }).session(session);
        await PortfolioSnapshot.deleteMany({ userId: userObjectId, portfolioId: portfolioObjectId }).session(session);
        await UploadJob.deleteMany({ userId: userObjectId, portfolioId: portfolioObjectId }).session(session);
        await Notification.deleteMany({ userId: userObjectId, portfolioId: portfolioObjectId }).session(session);
        await Portfolio.deleteOne({ _id: portfolioObjectId, userId: userObjectId }).session(session);
      });
    } finally {
      await session.endSession();
    }

    await Promise.all([
      invalidatePortfolioCache(portfolioId, requestId),
      activityService.record({
        userId,
        portfolioId,
        type: "PORTFOLIO_DELETED",
        message: `Deleted portfolio ${portfolioName}`
      })
    ]);
  }
};
