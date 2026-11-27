import { activityService } from "../activity/activity.service.js";
import { alertService } from "../alerts/alert.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { snapshotService } from "../snapshots/snapshot.service.js";
import { buildHoldings, replayTrades, type TradeLedgerEntry } from "../analytics/holdings.service.js";
import { enqueueAlertEvaluation } from "../../queues/alertEvaluation.queue.js";
import { enqueueSnapshot } from "../../queues/snapshot.queue.js";
import { logger } from "../../config/logger.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { notFound } from "../../utils/errors.js";
import { toObjectId } from "../../utils/objectId.js";
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
  createdAt?: Date;
}): TradeLedgerEntry {
  return {
    _id: trade._id,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fees: trade.fees,
    tradeDate: new Date(trade.tradeDate),
    createdAt: trade.createdAt ? new Date(trade.createdAt) : undefined
  };
}

async function syncDerivedStateAfterTradeChange(userId: string, portfolioId: string, requestId?: string): Promise<void> {
  await invalidatePortfolioCache(portfolioId, requestId);

  try {
    await snapshotService.generateForPortfolio({ userId, portfolioId, requestId });
    await invalidatePortfolioCache(portfolioId, requestId);
    await alertService.evaluate({ userId, portfolioId, requestId });
  } catch (error) {
    logger.warn(
      { requestId, portfolioId, error: error instanceof Error ? error.message : String(error) },
      "Synchronous post-trade snapshot/alert refresh fell back to background workers"
    );
  }

  void Promise.allSettled([
    enqueueSnapshot({ userId, portfolioId, requestId }),
    enqueueAlertEvaluation({ userId, portfolioId, requestId })
  ]);
}

async function validateLedger(userId: string, portfolioId: string, candidate?: TradeLedgerEntry, excludeTradeId?: string): Promise<void> {
  const userObjectId = toObjectId(userId, "userId");
  const portfolioObjectId = toObjectId(portfolioId, "portfolioId");
  const existing = await Trade.find({
    userId: userObjectId,
    portfolioId: portfolioObjectId
  })
    .sort({ tradeDate: 1, createdAt: 1 })
    .lean();

  const excludedTradeObjectId = excludeTradeId ? toObjectId(excludeTradeId, "tradeId").toString() : undefined;
  const ledger = existing
    .filter((trade) => trade._id.toString() !== excludedTradeObjectId)
    .map(toLedgerEntry);
  if (candidate) ledger.push(candidate);
  replayTrades(ledger);
}

export const tradeService = {
  async create(userId: string, portfolioId: string, input: CreateTradeInput, requestId?: string) {
    return withDistributedLock(portfolioWriteLockKey(portfolioId), async () => {
      await portfolioService.getOwned(userId, portfolioId);
      await validateLedger(userId, portfolioId, input);
      const userObjectId = toObjectId(userId, "userId");
      const portfolioObjectId = toObjectId(portfolioId, "portfolioId");

      const trade = await Trade.create({
        ...input,
        userId: userObjectId,
        portfolioId: portfolioObjectId,
        source: "MANUAL"
      });

      await Promise.all([
        activityService.record({
          userId,
          portfolioId,
          type: "TRADE_CREATED",
          message: `${input.side} ${input.quantity} ${input.symbol} at ${input.price}`,
          metadata: { tradeId: trade._id.toString() }
        }),
        syncDerivedStateAfterTradeChange(userId, portfolioId, requestId)
      ]);

      return trade;
    });
  },

  async list(
    userId: string,
    portfolioId: string,
    pagination: Pagination,
    filters: { symbol?: string; side?: "BUY" | "SELL" } = {}
  ) {
    await portfolioService.getOwned(userId, portfolioId);
    const query: Record<string, unknown> = {
      userId: toObjectId(userId, "userId"),
      portfolioId: toObjectId(portfolioId, "portfolioId")
    };
    if (filters.symbol) {
      query.symbol = filters.symbol.trim().toUpperCase();
    }
    if (filters.side) {
      query.side = filters.side;
    }

    const [items, total] = await Promise.all([
      Trade.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder, createdAt: pagination.sortOrder })
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
    const existing = await Trade.findOne({ _id: toObjectId(tradeId, "tradeId"), userId: toObjectId(userId, "userId") });
    if (!existing) throw notFound("Trade");

    return withDistributedLock(portfolioWriteLockKey(existing.portfolioId.toString()), async () => {
      const candidate = toLedgerEntry({
        _id: existing._id,
        symbol: input.symbol ?? existing.symbol,
        side: input.side ?? existing.side,
        quantity: input.quantity ?? existing.quantity,
        price: input.price ?? existing.price,
        fees: input.fees ?? existing.fees,
        tradeDate: input.tradeDate ?? existing.tradeDate,
        createdAt: existing.createdAt
      });

      await validateLedger(userId, existing.portfolioId.toString(), candidate, tradeId);

      Object.assign(existing, input);
      await existing.save();

      await Promise.all([
        activityService.record({
          userId,
          portfolioId: existing.portfolioId,
          type: "TRADE_UPDATED",
          message: `Updated ${existing.symbol} trade`,
          metadata: { tradeId }
        }),
        syncDerivedStateAfterTradeChange(userId, existing.portfolioId.toString(), requestId)
      ]);

      return existing;
    });
  },

  async remove(userId: string, tradeId: string, requestId?: string): Promise<void> {
    const trade = await Trade.findOne({ _id: toObjectId(tradeId, "tradeId"), userId: toObjectId(userId, "userId") });
    if (!trade) throw notFound("Trade");

    await withDistributedLock(portfolioWriteLockKey(trade.portfolioId.toString()), async () => {
      await validateLedger(userId, trade.portfolioId.toString(), undefined, tradeId);
      await trade.deleteOne();

      await Promise.all([
        activityService.record({
          userId,
          portfolioId: trade.portfolioId,
          type: "TRADE_DELETED",
          message: `Deleted ${trade.symbol} trade`,
          metadata: { tradeId }
        }),
        syncDerivedStateAfterTradeChange(userId, trade.portfolioId.toString(), requestId)
      ]);
    });
  },

  async holdings(userId: string, portfolioId: string, requestId?: string) {
    await portfolioService.getOwned(userId, portfolioId);
    const trades = await Trade.find({ userId: toObjectId(userId, "userId"), portfolioId: toObjectId(portfolioId, "portfolioId") })
      .sort({ tradeDate: 1, createdAt: 1 })
      .lean();
    return buildHoldings(trades.map(toLedgerEntry), requestId);
  }
};
