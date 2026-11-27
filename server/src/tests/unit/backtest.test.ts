import { describe, expect, it } from "vitest";
import { metricsFromEquity, runBuyAndHold, runMovingAverageCrossover } from "../../modules/backtests/backtest.service.js";
import type { PricePoint } from "../../modules/analytics/marketData.service.js";

function buildSeries(closes: number[]): PricePoint[] {
  return closes.map((close, idx) => ({
    date: `2025-01-${String(idx + 1).padStart(2, "0")}`,
    close,
    source: "fallback"
  }));
}

describe("backtest strategy calculations", () => {
  it("computes buy-and-hold equity curve and metrics accurately", () => {
    const points = buildSeries([100, 110, 105, 120]);
    const result = runBuyAndHold(points, 10000);

    expect(result.numberOfTrades).toBe(1);
    expect(result.equityCurve).toHaveLength(4);
    expect(result.equityCurve[0]?.value).toBe(10000);
    expect(result.equityCurve[3]?.value).toBe(12000);

    const metrics = metricsFromEquity(
      result.equityCurve.map((p) => p.value),
      10000
    );
    expect(metrics.finalCapital).toBe(12000);
    expect(metrics.totalReturn).toBe(20);
    expect(metrics.maxDrawdown).toBeGreaterThan(0);
  });

  it("executes moving-average crossover entry and exit with win rate", () => {
    const points = buildSeries([100, 95, 90, 92, 98, 108, 115, 112, 102, 94]);
    const result = runMovingAverageCrossover(points, 10000, 2, 4);

    expect(result.equityCurve).toHaveLength(points.length);
    expect(result.numberOfTrades).toBeGreaterThanOrEqual(1);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });
});
