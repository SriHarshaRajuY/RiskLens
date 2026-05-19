import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { closeRedis } from "../config/redis.js";
import { ActivityLog } from "../modules/activity/activityLog.model.js";
import { Alert } from "../modules/alerts/alert.model.js";
import { User } from "../modules/auth/user.model.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { Portfolio } from "../modules/portfolio/portfolio.model.js";
import { PortfolioSnapshot } from "../modules/snapshots/portfolioSnapshot.model.js";
import { Trade } from "../modules/trades/trade.model.js";
import { addDays, startOfUtcDay } from "../utils/date.js";

const demoEmail = "demo@risklens.dev";
const demoPassword = "risklens123";

async function main(): Promise<void> {
  await connectDb();

  const passwordHash = await bcrypt.hash(demoPassword, env.BCRYPT_SALT_ROUNDS);
  const user = await User.findOneAndUpdate(
    { email: demoEmail },
    {
      name: "RiskLens Demo",
      email: demoEmail,
      passwordHash,
      role: "USER"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const portfolio = await Portfolio.findOneAndUpdate(
    { userId: user._id, name: "Internship Demo Portfolio" },
    {
      userId: user._id,
      name: "Internship Demo Portfolio",
      description: "Seeded portfolio with technology holdings, risk alerts, snapshots, and CSV-ready data.",
      baseCurrency: "USD",
      isArchived: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const trades = [
    ["2025-01-02", "AAPL", "BUY", 12, 181, 1.5],
    ["2025-01-08", "MSFT", "BUY", 6, 412, 1.25],
    ["2025-01-14", "NVDA", "BUY", 10, 128, 1.75],
    ["2025-02-03", "AAPL", "SELL", 4, 196, 1],
    ["2025-02-21", "GOOGL", "BUY", 8, 164, 1.2],
    ["2025-03-10", "MSFT", "SELL", 2, 429, 1],
    ["2025-03-18", "AMZN", "BUY", 7, 184, 1.3]
  ] as const;

  for (const [date, symbol, side, quantity, price, fees] of trades) {
    await Trade.findOneAndUpdate(
      {
        portfolioId: portfolio._id,
        idempotencyKey: `seed:${date}:${symbol}:${side}:${quantity}:${price}`
      },
      {
        userId: user._id,
        portfolioId: portfolio._id,
        symbol,
        side,
        quantity,
        price,
        fees,
        tradeDate: new Date(`${date}T00:00:00.000Z`),
        source: "SEED",
        idempotencyKey: `seed:${date}:${symbol}:${side}:${quantity}:${price}`
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const start = addDays(startOfUtcDay(new Date()), -70);
  let value = 10000;
  for (let index = 0; index < 60; index += 1) {
    const date = addDays(start, index);
    const drift = 0.0015;
    const cycle = Math.sin(index / 4) * 0.008 + Math.cos(index / 9) * 0.005;
    const shock = index === 38 ? -0.045 : 0;
    const dailyReturn = drift + cycle + shock;
    value *= 1 + dailyReturn;

    await PortfolioSnapshot.findOneAndUpdate(
      { portfolioId: portfolio._id, date },
      {
        userId: user._id,
        portfolioId: portfolio._id,
        date,
        totalValue: Number(value.toFixed(2)),
        investedValue: 9200,
        realizedPnl: 92,
        unrealizedPnl: Number((value - 9200 - 92).toFixed(2)),
        dailyReturn: Number(dailyReturn.toFixed(6)),
        source: "SEED"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Alert.findOneAndUpdate(
    { userId: user._id, portfolioId: portfolio._id, type: "CONCENTRATION" },
    { userId: user._id, portfolioId: portfolio._id, type: "CONCENTRATION", threshold: 40, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Alert.findOneAndUpdate(
    { userId: user._id, portfolioId: portfolio._id, type: "VOLATILITY" },
    { userId: user._id, portfolioId: portfolio._id, type: "VOLATILITY", threshold: 25, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Notification.findOneAndUpdate(
    { userId: user._id, title: "Demo workspace ready" },
    {
      userId: user._id,
      portfolioId: portfolio._id,
      title: "Demo workspace ready",
      message: "RiskLens is seeded with trades, snapshots, alerts, and analytics history.",
      severity: "LOW",
      isRead: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ActivityLog.create({
    userId: user._id,
    portfolioId: portfolio._id,
    type: "PORTFOLIO_UPDATED",
    message: "Seeded demo workspace",
    metadata: { script: "seed" }
  });

  logger.info(
    {
      demoEmail,
      demoPassword,
      portfolioId: portfolio._id.toString()
    },
    "Seed completed"
  );

  await Promise.allSettled([disconnectDb(), closeRedis()]);
}

main().catch(async (error) => {
  logger.error({ error }, "Seed failed");
  await Promise.allSettled([disconnectDb(), closeRedis()]);
  process.exit(1);
});
