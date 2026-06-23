import { activityService } from "../activity/activity.service.js";
import { marketDataService, type PricePoint } from "../analytics/marketData.service.js";
import { calculateDailyReturns } from "../../utils/risk.js";
import { maxDrawdown, mean, round, standardDeviation } from "../../utils/math.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { toObjectId } from "../../utils/objectId.js";
import { BacktestResult } from "./backtestResult.model.js";
import type { RunBacktestInput } from "./backtest.validation.js";

function movingAverage(points: PricePoint[], index: number, window: number): number | null {
  if (index + 1 < window) return null;
  const slice = points.slice(index + 1 - window, index + 1);
  return mean(slice.map((point) => point.close));
}

function metricsFromEquity(values: number[], initialCapital: number) {
  const dailyReturns = calculateDailyReturns(values);
  const finalCapital = values.at(-1) ?? initialCapital;
  const dailyVolatility = standardDeviation(dailyReturns);
  return {
    finalCapital: round(finalCapital, 2),
    totalReturn: round(((finalCapital - initialCapital) / initialCapital) * 100, 2),
    maxDrawdown: round(maxDrawdown(values) * 100, 2),
    sharpeRatio: dailyVolatility === 0 ? 0 : round(mean(dailyReturns) / dailyVolatility, 4)
  };
}

function runBuyAndHold(points: PricePoint[], initialCapital: number) {
  const firstPrice = points[0]?.close ?? 1;
  const shares = initialCapital / firstPrice;
  const equityCurve = points.map((point) => ({
    date: new Date(point.date),
    value: round(shares * point.close, 2)
  }));
  return {
    equityCurve,
    numberOfTrades: points.length > 0 ? 1 : 0,
    winRate: 100
  };
}

function runMovingAverageCrossover(points: PricePoint[], initialCapital: number, shortWindow: number, longWindow: number) {
  let cash = initialCapital;
  let shares = 0;
  let inPosition = false;
  let trades = 0;
  let wins = 0;
  let entryPrice = 0;

  const equityCurve = points.map((point, index) => {
    const shortAverage = movingAverage(points, index, shortWindow);
    const longAverage = movingAverage(points, index, longWindow);
    const previousShort = index > 0 ? movingAverage(points, index - 1, shortWindow) : null;
    const previousLong = index > 0 ? movingAverage(points, index - 1, longWindow) : null;

    const crossedUp =
      shortAverage !== null &&
      longAverage !== null &&
      previousShort !== null &&
      previousLong !== null &&
      previousShort <= previousLong &&
      shortAverage > longAverage;
    const crossedDown =
      shortAverage !== null &&
      longAverage !== null &&
      previousShort !== null &&
      previousLong !== null &&
      previousShort >= previousLong &&
      shortAverage < longAverage;

    if (!inPosition && crossedUp) {
      shares = cash / point.close;
      cash = 0;
      inPosition = true;
      entryPrice = point.close;
      trades += 1;
    } else if (inPosition && crossedDown) {
      cash = shares * point.close;
      shares = 0;
      inPosition = false;
      trades += 1;
      if (point.close > entryPrice) wins += 1;
    }

    return {
      date: new Date(point.date),
      value: round(cash + shares * point.close, 2)
    };
  });

  return {
    equityCurve,
    numberOfTrades: trades,
    winRate: trades === 0 ? 0 : round((wins / Math.max(Math.floor(trades / 2), 1)) * 100, 2)
  };
}

export const backtestService = {
  async run(userId: string, input: RunBacktestInput, requestId?: string) {
    const points = await marketDataService.getHistoricalPrices(input.symbol, input.startDate, input.endDate, requestId);
    if (points.length < input.longWindow && input.strategy === "MOVING_AVERAGE_CROSSOVER") {
      throw badRequest("INSUFFICIENT_PRICE_HISTORY", "Not enough price history for selected moving-average windows");
    }

    const result =
      input.strategy === "BUY_AND_HOLD"
        ? runBuyAndHold(points, input.initialCapital)
        : runMovingAverageCrossover(points, input.initialCapital, input.shortWindow, input.longWindow);

    const values = result.equityCurve.map((point) => point.value);
    const metrics = metricsFromEquity(values, input.initialCapital);
    const dataSource = points.some((point) => point.source === "alpha_vantage") ? "alpha_vantage" : "fallback";

    const saved = await BacktestResult.create({
      userId: toObjectId(userId, "userId"),
      symbol: input.symbol,
      strategy: input.strategy,
      startDate: input.startDate,
      endDate: input.endDate,
      initialCapital: input.initialCapital,
      finalCapital: metrics.finalCapital,
      totalReturn: metrics.totalReturn,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown,
      numberOfTrades: result.numberOfTrades,
      winRate: result.winRate,
      dataSource,
      equityCurve: result.equityCurve,
      parameters: {
        shortWindow: input.shortWindow,
        longWindow: input.longWindow
      }
    });

    await activityService.record({
      userId,
      type: "BACKTEST_COMPLETED",
      message: `${input.strategy} backtest completed for ${input.symbol}`,
      metadata: { backtestId: saved._id.toString(), totalReturn: metrics.totalReturn }
    });

    return saved;
  },

  async list(userId: string) {
    return BacktestResult.find({ userId: toObjectId(userId, "userId") }).sort({ createdAt: -1 }).limit(30).lean();
  },

  async get(userId: string, backtestId: string) {
    const result = await BacktestResult.findOne({ _id: toObjectId(backtestId, "backtestId"), userId: toObjectId(userId, "userId") }).lean();
    if (!result) throw notFound("Backtest result");
    return result;
  }
};
