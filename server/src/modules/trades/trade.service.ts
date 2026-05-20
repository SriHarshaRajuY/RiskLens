import { Types } from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { buildHoldings, replayTrades, type TradeLedgerEntry } from "../analytics/holdings.service.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { notFound } from "../../utils/errors.js";
import { paginationMeta, type Pagination } from "../../utils/pagination.js";
import { portfolioWriteLockKey, withDistributedLock } from "../../utils/lock.js";
import { Trade } from "./trade.model.js";
import type { CreateTradeInput, UpdateTradeInput } from "./trade.validation.js";

function toLedgerEntry(trade: {
  _id?: unknown;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  tradeDate: Date;
}): TradeLedgerEntry {
  return {
    _id: trade._id,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fees: trade.fees,
    tradeDate: new Date(trade.tradeDate)
  };
}

async function validateLedger(userId: string, portfolioId: string, candidate?: TradeLedgerEntry, excludeTradeId?: string): Promise<void> {
  const existing = await Trade.find({
    userId,
    portfolioId,
    ...(excludeTradeId ? { _id: { $ne: excludeTradeId } } : {})
  })
    .sort({ tradeDate: 1, createdAt: 1 })
    .lean();

  const ledger = existing.map(toLedgerEntry);
  if (candidate) ledger.push(candidate);
  replayTrades(ledger);
}

export const tradeService = {
  async create(userId: string, portfolioId: string, input: CreateTradeInput, requestId?: string) {
    return withDistributedLock(portfolioWriteLockKey(portfolioId), async () => {
      await portfolioService.getOwned(userId, portfolioId);
      await validateLedger(userId, portfolioId, input);

      const trade = await Trade.create({
        ...input,
        userId,
        portfolioId,
        source: "MANUAL"
      });

      await Promise.all([
        invalidatePortfolioCache(portfolioId, requestId),
        activityService.record({
          userId,
          portfolioId,
          type: "TRADE_CREATED",
          message: `${input.side} ${input.quantity} ${input.symbol} at ${input.price}`,
          metadata: { tradeId: trade._id.toString() }
        })
      ]);

      return trade;
    });
  },

  async list(userId: string, portfolioId: string, pagination: Pagination) {
    await portfolioService.getOwned(userId, portfolioId);
    const query = { userId: new Types.ObjectId(userId), portfolioId: new Types.ObjectId(portfolioId) };

    const [items, total] = await Promise.all([
      Trade.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Trade.countDocuments(query)
    ]);

    return {
      items,
      meta: paginationMeta(pagination.page, pagination.limit, total)
    };
  },

  async update(userId: string, tradeId: string, input: UpdateTradeInput, requestId?: string) {
    const existing = await Trade.findOne({ _id: tradeId, userId });
    if (!existing) throw notFound("Trade");

    return withDistributedLock(portfolioWriteLockKey(existing.portfolioId.toString()), async () => {
      const candidate = toLedgerEntry({
        _id: existing._id,
        symbol: input.symbol ?? existing.symbol,
        side: input.side ?? existing.side,
        quantity: input.quantity ?? existing.quantity,
        price: input.price ?? existing.price,
        fees: input.fees ?? existing.fees,
        tradeDate: input.tradeDate ?? existing.tradeDate
      });

      await validateLedger(userId, existing.portfolioId.toString(), candidate, tradeId);

      Object.assign(existing, input);
      await existing.save();

      await Promise.all([
        invalidatePortfolioCache(existing.portfolioId.toString(), requestId),
        activityService.record({
          userId,
          portfolioId: existing.portfolioId,
          type: "TRADE_UPDATED",
          message: `Updated ${existing.symbol} trade`,
          metadata: { tradeId }
        })
      ]);

      return existing;
    });
  },

  async remove(userId: string, tradeId: string, requestId?: string): Promise<void> {
    const trade = await Trade.findOne({ _id: tradeId, userId });
    if (!trade) throw notFound("Trade");

    await withDistributedLock(portfolioWriteLockKey(trade.portfolioId.toString()), async () => {
      await validateLedger(userId, trade.portfolioId.toString(), undefined, tradeId);
      await trade.deleteOne();

      await Promise.all([
        invalidatePortfolioCache(trade.portfolioId.toString(), requestId),
        activityService.record({
          userId,
          portfolioId: trade.portfolioId,
          type: "TRADE_DELETED",
          message: `Deleted ${trade.symbol} trade`,
          metadata: { tradeId }
        })
      ]);
    });
  },

  async holdings(userId: string, portfolioId: string, requestId?: string) {
    await portfolioService.getOwned(userId, portfolioId);
    const trades = await Trade.find({ userId, portfolioId }).sort({ tradeDate: 1, createdAt: 1 }).lean();
    return buildHoldings(trades.map(toLedgerEntry), requestId);
  }
};
