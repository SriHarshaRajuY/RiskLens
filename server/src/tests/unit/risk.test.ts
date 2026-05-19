import { describe, expect, it } from "vitest";
import { calculateRiskMetrics } from "../../utils/risk.js";

describe("risk metrics", () => {
  it("calculates core risk metrics from portfolio values", () => {
    const metrics = calculateRiskMetrics([100, 102, 101, 98, 105], [70, 30]);

    expect(metrics.dailyReturns).toHaveLength(4);
    expect(metrics.maxDrawdown).toBeGreaterThan(0);
    expect(metrics.valueAtRisk95).toBeGreaterThanOrEqual(0);
    expect(metrics.riskScore).toBeGreaterThanOrEqual(0);
    expect(["Low", "Medium", "High"]).toContain(metrics.riskLevel);
  });
});
