import { PortfolioSnapshot } from "../snapshots/portfolioSnapshot.model.js";
import { Trade } from "../trades/trade.model.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { portfolioCacheKey, withCache } from "../../utils/cache.js";
import { calculateDailyReturns, calculateRiskMetrics } from "../../utils/risk.js";
import { round } from "../../utils/math.js";
import { toObjectId } from "../../utils/objectId.js";
import { buildHoldings, ledgerStats, type TradeLedgerEntry } from "./holdings.service.js";

function toLedgerEntry(trade: {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  tradeDate: Date;
}): TradeLedgerEntry {
  return {
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fees: trade.fees,
    tradeDate: new Date(trade.tradeDate)
  };
}

async function getPortfolioTrades(userId: string, portfolioId: string): Promise<TradeLedgerEntry[]> {
  await portfolioService.getOwned(userId, portfolioId);
  const trades = await Trade.find({ userId: toObjectId(userId, "userId"), portfolioId: toObjectId(portfolioId, "portfolioId") })
    .sort({ tradeDate: 1, createdAt: 1 })
    .lean();
  return trades.map(toLedgerEntry);
}

export const analyticsService = {
  async holdings(userId: string, portfolioId: string, requestId?: string) {
    return withCache(
      portfolioCacheKey(portfolioId, "holdings"),
      async () => {
        const trades = await getPortfolioTrades(userId, portfolioId);
        return buildHoldings(trades, requestId);
      },
      { portfolioId, metricType: "HOLDINGS", requestId }
    );
  },

  async summary(userId: string, portfolioId: string, requestId?: string) {
    return withCache(
      portfolioCacheKey(portfolioId, "summary"),
      async () => {
        const trades = await getPortfolioTrades(userId, portfolioId);
        const holdings = await buildHoldings(trades, requestId);
        const stats = ledgerStats(trades);
        const totalPortfolioValue = holdings.reduce((total, holding) => total + holding.marketValue, 0);
        const unrealizedPnl = holdings.reduce((total, holding) => total + holding.unrealizedPnl, 0);
        const totalPnl = stats.realizedPnl + unrealizedPnl;
        const snapshots = await PortfolioSnapshot.find({ userId: toObjectId(userId, "userId"), portfolioId: toObjectId(portfolioId, "portfolioId") })
          .sort({ date: -1 })
          .limit(2)
          .lean();
        const latest = snapshots[0];
        const previous = snapshots[1];
        const dailyPnl = latest && previous ? latest.totalValue - previous.totalValue : 0;
        const best = [...holdings].sort((a, b) => b.totalPnl - a.totalPnl)[0] ?? null;
        const worst = [...holdings].sort((a, b) => a.totalPnl - b.totalPnl)[0] ?? null;

        return {
          totalPortfolioValue: round(totalPortfolioValue, 2),
          totalInvestedAmount: stats.totalInvested,
          openCostBasis: stats.openCostBasis,
          realizedPnl: stats.realizedPnl,
          unrealizedPnl: round(unrealizedPnl, 2),
          totalPnl: round(totalPnl, 2),
          dailyPnl: round(dailyPnl, 2),
          dailyReturn: latest?.dailyReturn ?? 0,
          holdingsCount: holdings.length,
          tradeCount: trades.length,
          bestPerformer: best
            ? {
                symbol: best.symbol,
                totalPnl: best.totalPnl,
                allocationPercent: best.allocationPercent
              }
            : null,
          worstPerformer: worst
            ? {
                symbol: worst.symbol,
                totalPnl: worst.totalPnl,
                allocationPercent: worst.allocationPercent
              }
            : null,
          allocation: holdings.map((holding) => ({
            symbol: holding.symbol,
            value: holding.marketValue,
            percent: holding.allocationPercent
          }))
        };
      },
      { portfolioId, metricType: "SUMMARY", requestId }
    );
  },

  async returns(userId: string, portfolioId: string, requestId?: string) {
    return withCache(
      portfolioCacheKey(portfolioId, "returns"),
      async () => {
        await portfolioService.getOwned(userId, portfolioId);
        const snapshots = await PortfolioSnapshot.find({ userId: toObjectId(userId, "userId"), portfolioId: toObjectId(portfolioId, "portfolioId") })
          .sort({ date: 1 })
          .lean();
        const values = snapshots.map((snapshot) => snapshot.totalValue);
        const returns = calculateDailyReturns(values);

        return snapshots.map((snapshot, index) => ({
          date: snapshot.date.toISOString().slice(0, 10),
          totalValue: round(snapshot.totalValue, 2),
          investedValue: round(snapshot.investedValue, 2),
          realizedPnl: round(snapshot.realizedPnl, 2),
          unrealizedPnl: round(snapshot.unrealizedPnl, 2),
          dailyReturn: index === 0 ? 0 : round(returns[index - 1] ?? 0, 6)
        }));
      },
      { portfolioId, metricType: "RETURNS", requestId }
    );
  },

  async risk(userId: string, portfolioId: string, requestId?: string) {
    return withCache(
      portfolioCacheKey(portfolioId, "risk"),
      async () => {
        const [snapshots, holdings] = await Promise.all([
          PortfolioSnapshot.find({ userId: toObjectId(userId, "userId"), portfolioId: toObjectId(portfolioId, "portfolioId") }).sort({ date: 1 }).lean(),
          this.holdings(userId, portfolioId, requestId)
        ]);

        const values = snapshots.map((snapshot) => snapshot.totalValue);
        const fallbackValue = holdings.reduce((total, holding) => total + holding.marketValue, 0);
        const portfolioValues = values.length >= 2 ? values : [fallbackValue, fallbackValue];
        const metrics = calculateRiskMetrics(
          portfolioValues,
          holdings.map((holding) => holding.allocationPercent)
        );

        return {
          ...metrics,
          insufficientHistory: values.length < 2
        };
      },
      { portfolioId, metricType: "RISK", requestId }
    );
  },

  async pnl(userId: string, portfolioId: string, requestId?: string) {
    const returns = await this.returns(userId, portfolioId, requestId);
    return returns.map((point) => ({
      date: point.date,
      realizedPnl: point.realizedPnl,
      unrealizedPnl: point.unrealizedPnl,
      totalPnl: round(point.realizedPnl + point.unrealizedPnl, 2)
    }));
  }
};
