import { describe, expect, it } from "vitest";
import {
  buildDeterministicRiskNarrative,
  type DeterministicRiskInput
} from "../../modules/analytics/riskNarrative.service.js";

const sampleSnapshot: DeterministicRiskInput = {
  risk: {
    riskScore: 64,
    riskLevel: "High",
    annualizedVolatilityPct: 28.4,
    sharpeRatio: 1.12,
    maxDrawdownPct: 18.4,
    valueAtRisk95Pct: 3.25,
    concentrationRiskPct: 42.0,
    insufficientHistory: false,
    snapshotCount: 15
  },
  portfolio: {
    baseCurrency: "USD",
    holdingsCount: 3,
    tradeCount: 12,
    totalPortfolioValue: 25000,
    realizedPnl: 850,
    unrealizedPnl: 1200,
    totalPnl: 2050,
    dailyReturnPct: -1.45,
    topAllocations: [
      { symbol: "AAPL", percent: 42.0 },
      { symbol: "MSFT", percent: 33.0 },
      { symbol: "NVDA", percent: 25.0 }
    ],
    bestPerformer: { symbol: "NVDA", totalPnl: 1500, allocationPercent: 25.0 },
    worstPerformer: { symbol: "AAPL", totalPnl: -250, allocationPercent: 42.0 }
  },
  alerts: [
    {
      alertType: "CONCENTRATION",
      isActive: true,
      thresholdPct: 25,
      currentValuePct: 42,
      status: "BREACHED"
    },
    {
      alertType: "VOLATILITY",
      isActive: true,
      thresholdPct: 35,
      currentValuePct: 28.4,
      status: "WITHIN_THRESHOLD"
    }
  ]
};

describe("deterministic risk narrative", () => {
  it("builds natural, factual summaries with proper pluralization and alert casing", () => {
    const result = buildDeterministicRiskNarrative(sampleSnapshot);

    expect(result.executiveSummary).toContain("12 recorded trades across 3 open holdings");
    expect(result.executiveSummary).toContain("64/100 (High tier)");
    expect(result.metricExplanations).toHaveLength(5);
    expect(result.alertNarratives[0]?.status).toBe("BREACHED");
    expect(result.alertNarratives[0]?.factualExplanation).toContain("Observed concentration of 42.00%");
    expect(result.alertNarratives[0]?.factualExplanation).toContain("AAPL");
    expect(result.alertNarratives[1]?.factualExplanation).toContain("Observed volatility of 28.40%");
  });

  it("handles singular trade/holding and closed-out portfolios cleanly", () => {
    const closedSnapshot: DeterministicRiskInput = {
      ...sampleSnapshot,
      risk: { ...sampleSnapshot.risk, concentrationRiskPct: 0, riskScore: 10, riskLevel: "Low" },
      portfolio: {
        ...sampleSnapshot.portfolio,
        baseCurrency: "INR",
        holdingsCount: 0,
        tradeCount: 1,
        totalPortfolioValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 500,
        totalPnl: 500,
        topAllocations: [],
        bestPerformer: null,
        worstPerformer: null
      },
      alerts: []
    };

    const result = buildDeterministicRiskNarrative(closedSnapshot);

    expect(result.executiveSummary).toContain("1 recorded trade across 0 open holdings");
    expect(result.executiveSummary).toContain("All positions are currently closed");
    expect(result.executiveSummary).toContain("₹500.00");
    expect(result.dataLimitations).toContain(
      "All traded positions are currently closed; concentration risk is 0.00% with no open exposure."
    );
  });
});
