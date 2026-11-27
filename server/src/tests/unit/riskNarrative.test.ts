import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../../config/env.js";
import {
  NON_ADVISORY_DISCLAIMER,
  containsAdvisoryLanguage,
  generateNarrativeFromSnapshot
} from "../../modules/analytics/riskNarrative.service.js";

const sampleSnapshot = {
  risk: {
    riskScore: 64,
    riskLevel: "High" as const,
    annualizedVolatilityPct: 28.4,
    sharpeRatio: 1.12,
    maxDrawdownPct: 18.4,
    valueAtRisk95Pct: 3.25,
    concentrationRiskPct: 42.0,
    insufficientHistory: false,
    snapshotCount: 15
  },
  portfolio: {
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
      alertType: "CONCENTRATION" as const,
      isActive: true,
      thresholdPct: 25,
      currentValuePct: 42,
      status: "BREACHED" as const
    }
  ]
};

describe("riskNarrative service", () => {
  const originalKey = env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    env.GEMINI_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses deterministic fallback when GEMINI_API_KEY is missing", async () => {
    env.GEMINI_API_KEY = "";
    const result = await generateNarrativeFromSnapshot(sampleSnapshot);

    expect(result.source).toBe("deterministic-fallback");
    expect(result.fallbackReason).toBe("missing_api_key");
    expect(result.model).toBeNull();
    expect(result.disclaimer).toBe(NON_ADVISORY_DISCLAIMER);
    expect(result.executiveSummary).toContain("64/100");
    expect(result.metricExplanations).toHaveLength(5);
    expect(result.alertNarratives[0]?.status).toBe("BREACHED");
    expect(result.alertNarratives[0]?.factualExplanation).toContain("AAPL");
  });

  it("falls back cleanly when Gemini returns 429 quota exceeded", async () => {
    env.GEMINI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), { status: 429 })
    ) as typeof fetch;

    const result = await generateNarrativeFromSnapshot(sampleSnapshot);

    expect(result.source).toBe("deterministic-fallback");
    expect(result.fallbackReason).toBe("quota_exceeded");
    expect(result.metricExplanations.length).toBeGreaterThan(0);
  });

  it("falls back cleanly when Gemini times out", async () => {
    env.GEMINI_API_KEY = "test-key";
    const timeoutError = new Error("The operation timed out");
    timeoutError.name = "TimeoutError";
    globalThis.fetch = vi.fn().mockRejectedValue(timeoutError) as typeof fetch;

    const result = await generateNarrativeFromSnapshot(sampleSnapshot);

    expect(result.source).toBe("deterministic-fallback");
    expect(result.fallbackReason).toBe("timeout");
  });

  it("rejects advisory language from Gemini and falls back to deterministic", async () => {
    env.GEMINI_API_KEY = "test-key";
    const advisoryPayload = {
      executiveSummary: "Your AAPL weight is 42%. You should sell some AAPL shares to lower risk.",
      metricExplanations: [
        {
          metric: "Concentration Risk",
          valueLabel: "42.00%",
          mathematicalMeaning: "Share of portfolio value in the largest holding.",
          historicalDriver: "AAPL represents 42.00% of total market value."
        }
      ],
      alertNarratives: [],
      dataLimitations: []
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(advisoryPayload) }] } }]
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    expect(containsAdvisoryLanguage(advisoryPayload)).toBe(true);
    const result = await generateNarrativeFromSnapshot(sampleSnapshot);

    expect(result.source).toBe("deterministic-fallback");
    expect(result.fallbackReason).toBe("invalid_output");
    expect(containsAdvisoryLanguage(result)).toBe(false);
  });

  it("returns Gemini narrative when valid non-advisory JSON is returned", async () => {
    env.GEMINI_API_KEY = "test-key";
    const validPayload = {
      executiveSummary:
        "Across 12 recorded trades and 15 daily snapshots, the portfolio has a composite risk score of 64/100 (High tier), led by 42.00% concentration in AAPL.",
      metricExplanations: [
        {
          metric: "Concentration Risk",
          valueLabel: "42.00%",
          mathematicalMeaning: "Percentage of total portfolio market value held in the single largest open position.",
          historicalDriver: "AAPL accounts for 42.00% of open market value across 3 holdings."
        }
      ],
      alertNarratives: [
        {
          alertType: "CONCENTRATION",
          status: "BREACHED",
          currentValueLabel: "42.00%",
          thresholdLabel: "25.00%",
          factualExplanation: "Concentration in AAPL is 42.00%, exceeding the configured 25.00% threshold."
        }
      ],
      dataLimitations: []
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(validPayload) }] } }]
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const result = await generateNarrativeFromSnapshot(sampleSnapshot);

    expect(result.source).toBe("gemini");
    expect(result.fallbackReason).toBeUndefined();
    expect(result.model).toBe(env.GEMINI_MODEL);
    expect(result.disclaimer).toBe(NON_ADVISORY_DISCLAIMER);
    expect(result.executiveSummary).toContain("AAPL");
  });

  it("handles closed-out portfolios cleanly in deterministic fallback", async () => {
    env.GEMINI_API_KEY = "";
    const closedSnapshot = {
      ...sampleSnapshot,
      risk: { ...sampleSnapshot.risk, concentrationRiskPct: 0, riskScore: 10, riskLevel: "Low" as const },
      portfolio: {
        ...sampleSnapshot.portfolio,
        holdingsCount: 0,
        tradeCount: 4,
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

    const result = await generateNarrativeFromSnapshot(closedSnapshot);

    expect(result.source).toBe("deterministic-fallback");
    expect(result.executiveSummary).toContain("All positions are currently closed");
    expect(result.dataLimitations).toContain(
      "All traded positions are currently closed; concentration risk is 0.00% with no open exposure."
    );
  });
});
