import { createHash } from "node:crypto";
import mongoose, { Types, type ClientSession, type HydratedDocument } from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { notificationService } from "../notifications/notification.service.js";
import { Portfolio, type PortfolioDocument } from "../portfolio/portfolio.model.js";
import { PortfolioSnapshot } from "../snapshots/portfolioSnapshot.model.js";
import { Trade } from "../trades/trade.model.js";
import { invalidatePortfolioCache } from "../../utils/cache.js";
import { addDays, startOfUtcDay } from "../../utils/date.js";
import { toObjectId } from "../../utils/objectId.js";
import { sampleAlerts, samplePortfolio, sampleTrades } from "./samplePortfolio.data.js";

function sampleTradeKey(portfolioId: string, date: string, symbol: string, side: string, quantity: number, price: number, fees: number): string {
  return createHash("sha256")
    .update(`sample:${portfolioId}:${date}:${symbol}:${side}:${quantity}:${price}:${fees}`)
    .digest("hex");
}

async function upsertSampleTrades(userId: Types.ObjectId, portfolioId: Types.ObjectId, session?: ClientSession): Promise<number> {
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

  const candidateKeySet = new Set(rows.map((row) => row.key));
  const existing = await Trade.find({ portfolioId })
    .select("idempotencyKey")
    .session(session ?? null)
    .lean();
  const existingKeys = new Set(
    existing
      .map((trade) => trade.idempotencyKey)
      .filter((key): key is string => typeof key === "string" && candidateKeySet.has(key))
  );
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
      { ordered: false, session }
    );
  }

  return insertable.length;
}

async function upsertSampleSnapshots(userId: Types.ObjectId, portfolioId: Types.ObjectId, session?: ClientSession): Promise<number> {
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
    ).session(session ?? null);
  }

  return 90;
}

async function upsertSampleAlerts(userId: Types.ObjectId, portfolioId: Types.ObjectId, session?: ClientSession): Promise<number> {
  for (const alert of sampleAlerts) {
    await Alert.findOneAndUpdate(
      { userId, portfolioId, type: alert.type },
      {
        userId,
        portfolioId,
        type: alert.type,
        threshold: alert.threshold,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).session(session ?? null);
  }
  return sampleAlerts.length;
}

export const demoService = {
  async loadSamplePortfolio(userId: string, requestId?: string) {
    const userObjectId = toObjectId(userId, "userId");
    const session = await mongoose.startSession();
    let portfolio: HydratedDocument<PortfolioDocument> | null = null;
    let created = false;
    let importedTrades = 0;
    let snapshotsCreated = 0;
    let alertsConfigured = 0;

    try {
      await session.withTransaction(async () => {
        portfolio = await Portfolio.findOne({
          userId: userObjectId,
          name: samplePortfolio.name
        }).session(session);
        created = !portfolio;

        if (!portfolio) {
          [portfolio] = await Portfolio.create(
            [
              {
                userId: userObjectId,
                ...samplePortfolio
              }
            ],
            { session }
          );
        } else {
          portfolio.description = samplePortfolio.description;
          portfolio.baseCurrency = samplePortfolio.baseCurrency;
          portfolio.isArchived = false;
          await portfolio.save({ session });
        }

        importedTrades = await upsertSampleTrades(userObjectId, portfolio._id, session);
        snapshotsCreated = await upsertSampleSnapshots(userObjectId, portfolio._id, session);
        alertsConfigured = await upsertSampleAlerts(userObjectId, portfolio._id, session);
      });
    } finally {
      await session.endSession();
    }

    const loadedPortfolio = portfolio as HydratedDocument<PortfolioDocument> | null;

    if (!loadedPortfolio) {
      throw new Error("Starter portfolio could not be created");
    }

    await Promise.all([
      invalidatePortfolioCache(loadedPortfolio._id.toString(), requestId),
      activityService.record({
        userId,
        portfolioId: loadedPortfolio._id,
        type: created ? "PORTFOLIO_CREATED" : "PORTFOLIO_UPDATED",
        message: created ? `Created starter portfolio ${loadedPortfolio.name}` : `Refreshed starter portfolio ${loadedPortfolio.name}`,
        metadata: {
          importedTrades,
          snapshotsCreated,
          alertsConfigured
        }
      }),
      notificationService.create({
        userId,
        portfolioId: loadedPortfolio._id,
        title: "Starter portfolio ready",
        message: `${loadedPortfolio.name} is ready.`,
        severity: "LOW",
        metadata: {
          importedTrades,
          snapshotsCreated,
          alertsConfigured
        }
      })
    ]);

    return {
      portfolio: loadedPortfolio,
      created,
      importedTrades,
      snapshotsCreated,
      alertsConfigured
    };
  }
};
