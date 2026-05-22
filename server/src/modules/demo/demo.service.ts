import { createHash } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { notificationService } from "../notifications/notification.service.js";
import { Portfolio } from "../portfolio/portfolio.model.js";
import { PortfolioSnapshot } from "../snapshots/portfolioSnapshot.model.js";
import { Trade } from "../trades/trade.model.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { addDays, startOfUtcDay } from "../../utils/date.js";
import { sampleAlerts, samplePortfolio, sampleTrades } from "./samplePortfolio.data.js";

function sampleTradeKey(portfolioId: string, date: string, symbol: string, side: string, quantity: number, price: number, fees: number): string {
  return createHash("sha256")
    .update(`sample:${portfolioId}:${date}:${symbol}:${side}:${quantity}:${price}:${fees}`)
    .digest("hex");
}

async function upsertSampleTrades(userId: Types.ObjectId, portfolioId: Types.ObjectId): Promise<number> {
  const rows = sampleTrades.map(([date, symbol, side, quantity, price, fees]) => {
    const key = sampleTradeKey(portfolioId.toString(), date, symbol, side, quantity, price, fees);
    return {
      date,
      symbol,
      side,
      quantity,
      price,
      fees,
      key
    };
  });

  const existing = await Trade.find({
    portfolioId,
    idempotencyKey: mongoose.trusted({ $in: rows.map((row) => row.key) })
  })
    .select("idempotencyKey")
    .lean();
  const existingKeys = new Set(existing.map((trade) => trade.idempotencyKey).filter(Boolean));
  const insertable = rows.filter((row) => !existingKeys.has(row.key));

  if (insertable.length > 0) {
    await Trade.insertMany(
      insertable.map((row) => ({
        userId,
        portfolioId,
        symbol: row.symbol,
        side: row.side,
        quantity: row.quantity,
        price: row.price,
        fees: row.fees,
        tradeDate: new Date(`${row.date}T00:00:00.000Z`),
        source: "SEED",
        idempotencyKey: row.key
      })),
      { ordered: false }
    );
  }

  return insertable.length;
}

async function upsertSampleSnapshots(userId: Types.ObjectId, portfolioId: Types.ObjectId): Promise<number> {
  const start = addDays(startOfUtcDay(new Date()), -89);
  let value = 48_000;
  const investedValue = 44_500;

  for (let index = 0; index < 90; index += 1) {
    const date = addDays(start, index);
    const dailyReturn = 0.0009 + Math.sin(index / 5) * 0.0045 + Math.cos(index / 13) * 0.0022 + (index === 56 ? -0.034 : 0);
    value = Number((value * (1 + dailyReturn)).toFixed(2));
    const totalPnl = value - investedValue;
    const realizedPnl = 1180;

    await PortfolioSnapshot.findOneAndUpdate(
      { portfolioId, date },
      {
        userId,
        portfolioId,
        date,
        totalValue: value,
        investedValue,
        realizedPnl,
        unrealizedPnl: Number((totalPnl - realizedPnl).toFixed(2)),
        dailyReturn: Number(dailyReturn.toFixed(6)),
        source: "SEED"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return 90;
}

async function upsertSampleAlerts(userId: Types.ObjectId, portfolioId: Types.ObjectId): Promise<number> {
  await Promise.all(
    sampleAlerts.map((alert) =>
      Alert.findOneAndUpdate(
        { userId, portfolioId, type: alert.type },
        {
          userId,
          portfolioId,
          type: alert.type,
          threshold: alert.threshold,
          isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  return sampleAlerts.length;
}

export const demoService = {
  async loadSamplePortfolio(userId: string, requestId?: string) {
    const userObjectId = new Types.ObjectId(userId);
    let portfolio = await Portfolio.findOne({
      userId: userObjectId,
      name: samplePortfolio.name
    });
    const created = !portfolio;

    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId: userObjectId,
        ...samplePortfolio
      });
    } else {
      portfolio.description = samplePortfolio.description;
      portfolio.baseCurrency = samplePortfolio.baseCurrency;
      portfolio.isArchived = false;
      await portfolio.save();
    }

    const [importedTrades, snapshotsCreated, alertsConfigured] = await Promise.all([
      upsertSampleTrades(userObjectId, portfolio._id),
      upsertSampleSnapshots(userObjectId, portfolio._id),
      upsertSampleAlerts(userObjectId, portfolio._id)
    ]);

    await Promise.all([
      invalidatePortfolioCache(portfolio._id.toString(), requestId),
      activityService.record({
        userId,
        portfolioId: portfolio._id,
        type: created ? "PORTFOLIO_CREATED" : "PORTFOLIO_UPDATED",
        message: created ? `Loaded sample portfolio ${portfolio.name}` : `Refreshed sample portfolio ${portfolio.name}`,
        metadata: {
          importedTrades,
          snapshotsCreated,
          alertsConfigured
        }
      }),
      notificationService.create({
        userId,
        portfolioId: portfolio._id,
        title: "Sample portfolio ready",
        message: `${portfolio.name} now includes sample trades, risk history, alerts, and analytics data.`,
        severity: "LOW",
        metadata: {
          importedTrades,
          snapshotsCreated,
          alertsConfigured
        }
      })
    ]);

    return {
      portfolio,
      created,
      importedTrades,
      snapshotsCreated,
      alertsConfigured
    };
  }
};
