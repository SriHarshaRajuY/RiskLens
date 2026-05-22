import { Portfolio } from "../portfolio/portfolio.model.js";
import { analyticsService } from "../analytics/analytics.service.js";
import { PortfolioSnapshot } from "./portfolioSnapshot.model.js";
import { startOfUtcDay } from "../../utils/date.js";
import { round } from "../../utils/math.js";
import { toObjectId } from "../../utils/objectId.js";

export const snapshotService = {
  async generateForPortfolio(input: { userId: string; portfolioId: string; requestId?: string }) {
    const today = startOfUtcDay(new Date());
    const summary = await analyticsService.summary(input.userId, input.portfolioId, input.requestId);
    const previousSnapshots = await PortfolioSnapshot.find({
      userId: toObjectId(input.userId, "userId"),
      portfolioId: toObjectId(input.portfolioId, "portfolioId")
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    const previous = previousSnapshots.find((snapshot) => snapshot.date < today);

    const dailyReturn =
      previous && previous.totalValue > 0
        ? (summary.totalPortfolioValue - previous.totalValue) / previous.totalValue
        : 0;

    const snapshot = await PortfolioSnapshot.findOneAndUpdate(
      {
        userId: toObjectId(input.userId, "userId"),
        portfolioId: toObjectId(input.portfolioId, "portfolioId"),
        date: today
      },
      {
        totalValue: summary.totalPortfolioValue,
        investedValue: summary.totalInvestedAmount,
        realizedPnl: summary.realizedPnl,
        unrealizedPnl: summary.unrealizedPnl,
        dailyReturn: round(dailyReturn, 6),
        source: "WORKER"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return snapshot;
  },

  async generate(input: { userId?: string; portfolioId?: string; requestId?: string } = {}) {
    const query: Record<string, unknown> = { isArchived: false };
    if (input.userId) query.userId = toObjectId(input.userId, "userId");
    if (input.portfolioId) query._id = toObjectId(input.portfolioId, "portfolioId");

    const portfolios = await Portfolio.find(query).lean();
    const snapshots = [];

    for (const portfolio of portfolios) {
      snapshots.push(
        await this.generateForPortfolio({
          userId: portfolio.userId.toString(),
          portfolioId: portfolio._id.toString(),
          requestId: input.requestId
        })
      );
    }

    return {
      generated: snapshots.length,
      snapshotIds: snapshots.map((snapshot) => snapshot._id.toString())
    };
  }
};
