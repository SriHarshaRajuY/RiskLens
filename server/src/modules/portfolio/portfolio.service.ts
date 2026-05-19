import { Types } from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { PortfolioSnapshot } from "../snapshots/portfolioSnapshot.model.js";
import { Trade } from "../trades/trade.model.js";
import { notFound } from "../../utils/errors.js";
import { paginationMeta, type Pagination } from "../../utils/pagination.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { Portfolio } from "./portfolio.model.js";
import type { CreatePortfolioInput, UpdatePortfolioInput } from "./portfolio.validation.js";

export const portfolioService = {
  async create(userId: string, input: CreatePortfolioInput) {
    const portfolio = await Portfolio.create({
      ...input,
      userId
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
      userId: new Types.ObjectId(userId)
    };

    if (filters.search) {
      query.name = { $regex: filters.search, $options: "i" };
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
    const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
    if (!portfolio) throw notFound("Portfolio");
    return portfolio;
  },

  async update(userId: string, portfolioId: string, input: UpdatePortfolioInput, requestId?: string) {
    const portfolio = await Portfolio.findOneAndUpdate({ _id: portfolioId, userId }, input, {
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
    const portfolio = await Portfolio.findOneAndDelete({ _id: portfolioId, userId });
    if (!portfolio) throw notFound("Portfolio");

    await Promise.all([
      Trade.deleteMany({ userId, portfolioId }),
      Alert.deleteMany({ userId, portfolioId }),
      PortfolioSnapshot.deleteMany({ userId, portfolioId }),
      invalidatePortfolioCache(portfolioId, requestId),
      activityService.record({
        userId,
        portfolioId,
        type: "PORTFOLIO_DELETED",
        message: `Deleted portfolio ${portfolio.name}`
      })
    ]);
  }
};
