import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getCache, portfolioCacheKey, setCache } from "../../utils/cache.js";
import { toObjectId } from "../../utils/objectId.js";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { analyticsService } from "./analytics.service.js";

export const NON_ADVISORY_DISCLAIMER =
  "Informational recordkeeping only. This narrative explains historical portfolio figures and mathematical definitions; it is not financial, investment, tax, or legal advice.";

export type NarrativeSource = "gemini" | "deterministic-fallback";

export type NarrativeFallbackReason =
  | "missing_api_key"
  | "quota_exceeded"
  | "timeout"
  | "provider_error"
  | "invalid_output";

export type MetricNarrativeItem = {
  metric: string;
  valueLabel: string;
  mathematicalMeaning: string;
  historicalDriver: string;
};

export type AlertNarrativeItem = {
  alertType: "DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY";
  status: "BREACHED" | "WITHIN_THRESHOLD" | "INACTIVE";
  currentValueLabel: string;
  thresholdLabel: string;
  factualExplanation: string;
};

export type RiskNarrativePayload = {
  executiveSummary: string;
  metricExplanations: MetricNarrativeItem[];
  alertNarratives: AlertNarrativeItem[];
  dataLimitations: string[];
};

export type RiskNarrativeResult = RiskNarrativePayload & {
  source: NarrativeSource;
  fallbackReason?: NarrativeFallbackReason;
  model: string | null;
  generatedAt: string;
  cached: boolean;
  disclaimer: string;
};

const metricNarrativeSchema = z.object({
  metric: z.string().min(1).max(80),
  valueLabel: z.string().min(1).max(60),
  mathematicalMeaning: z.string().min(10).max(500),
  historicalDriver: z.string().min(10).max(500)
});

const alertNarrativeSchema = z.object({
  alertType: z.enum(["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"]),
  status: z.enum(["BREACHED", "WITHIN_THRESHOLD", "INACTIVE"]),
  currentValueLabel: z.string().min(1).max(40),
  thresholdLabel: z.string().min(1).max(40),
  factualExplanation: z.string().min(10).max(500)
});

const geminiNarrativeSchema = z.object({
  executiveSummary: z.string().min(20).max(900),
  metricExplanations: z.array(metricNarrativeSchema).min(1).max(8),
  alertNarratives: z.array(alertNarrativeSchema).max(20),
  dataLimitations: z.array(z.string().min(5).max(300)).max(10)
});

type AnonymizedRiskInput = {
  risk: {
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High";
    annualizedVolatilityPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    valueAtRisk95Pct: number;
    concentrationRiskPct: number;
    insufficientHistory: boolean;
    snapshotCount: number;
  };
  portfolio: {
    baseCurrency?: "USD" | "INR";
    holdingsCount: number;
    tradeCount: number;
    totalPortfolioValue: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    dailyReturnPct: number;
    topAllocations: Array<{ symbol: string; percent: number }>;
    bestPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
    worstPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
  };
  alerts: Array<{
    alertType: "DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY";
    isActive: boolean;
    thresholdPct: number;
    currentValuePct: number;
    status: "BREACHED" | "WITHIN_THRESHOLD" | "INACTIVE";
  }>;
};

const ADVISORY_LANGUAGE_PATTERNS = [
  /\byou should\b/i,
  /\bwe recommend\b/i,
  /\bi recommend\b/i,
  /\bconsider (buying|selling|rebalancing|reducing|increasing|exiting|entering)\b/i,
  /\b(buy|sell|rebalance|short|hedge) (more|some|all|your|shares|positions)\b/i,
  /\bwill (outperform|rise|fall|crash|rally|gain)\b/i,
  /\bguaranteed\b/i,
  /\bfinancial advice\b(?!.*not\s+financial)/i
];

export function containsAdvisoryLanguage(payload: RiskNarrativePayload): boolean {
  const texts = [
    payload.executiveSummary,
    ...payload.metricExplanations.flatMap((m) => [m.mathematicalMeaning, m.historicalDriver]),
    ...payload.alertNarratives.map((a) => a.factualExplanation),
    ...payload.dataLimitations
  ];
  return texts.some((text) => ADVISORY_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text)));
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: number, currency: "USD" | "INR" = "USD"): string {
  const symbol = currency === "INR" ? "₹" : "$";
  const abs = Math.abs(value).toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return value < 0 ? `-${symbol}${abs}` : `${symbol}${abs}`;
}

export function buildDeterministicRiskNarrative(input: AnonymizedRiskInput): RiskNarrativePayload {
  const { risk, portfolio, alerts } = input;
  const currency = portfolio.baseCurrency ?? "USD";
  const topHolding = portfolio.topAllocations[0];
  const hasHistory = !risk.insufficientHistory && risk.snapshotCount >= 2;

  const executiveParts: string[] = [
    `Based on ${portfolio.tradeCount} recorded trade(s) across ${portfolio.holdingsCount} open holding(s), the portfolio currently carries a composite risk score of ${risk.riskScore}/100 (${risk.riskLevel} tier).`
  ];

  if (topHolding) {
    executiveParts.push(
      `Largest single-asset concentration is ${topHolding.symbol} at ${formatPct(topHolding.percent)} of total portfolio market value.`
    );
  } else if (portfolio.tradeCount > 0) {
    executiveParts.push(
      `All positions are currently closed, with cumulative realized P&L of ${formatSignedCurrency(portfolio.realizedPnl, currency)}.`
    );
  }

  if (hasHistory) {
    executiveParts.push(
      `Across ${risk.snapshotCount} daily snapshots, annualized volatility stands at ${formatPct(risk.annualizedVolatilityPct)} with a historical maximum drawdown of ${formatPct(risk.maxDrawdownPct)}.`
    );
  } else {
    executiveParts.push(
      "Historical return-series metrics (volatility, Sharpe ratio, drawdown, and VaR) are pending until at least two daily portfolio snapshots are recorded."
    );
  }

  const bestDriver = portfolio.bestPerformer
    ? `Best historical P&L contributor: ${portfolio.bestPerformer.symbol} (${formatSignedCurrency(portfolio.bestPerformer.totalPnl, currency)}, ${formatPct(portfolio.bestPerformer.allocationPercent)} weight).`
    : "No realized or unrealized P&L contributors recorded yet.";

  const worstDriver = portfolio.worstPerformer
    ? `Lowest historical P&L contributor: ${portfolio.worstPerformer.symbol} (${formatSignedCurrency(portfolio.worstPerformer.totalPnl, currency)}, ${formatPct(portfolio.worstPerformer.allocationPercent)} weight).`
    : "No negative P&L contributors recorded.";

  const metricExplanations: MetricNarrativeItem[] = [
    {
      metric: "Annualized Volatility",
      valueLabel: hasHistory ? formatPct(risk.annualizedVolatilityPct) : "Needs history",
      mathematicalMeaning:
        "Standard deviation of daily portfolio returns multiplied by sqrt(252), measuring historical day-to-day dispersion on an annualized scale.",
      historicalDriver: hasHistory
        ? `Computed over ${risk.snapshotCount} recorded daily valuation snapshots. ${bestDriver}`
        : "Requires at least 2 daily portfolio snapshots to compute daily return dispersion."
    },
    {
      metric: "Sharpe Ratio",
      valueLabel: hasHistory ? risk.sharpeRatio.toFixed(2) : "Needs history",
      mathematicalMeaning:
        "Ratio of mean daily return (above a 0% risk-free baseline) to daily return standard deviation, measuring historical return per unit of total volatility.",
      historicalDriver: hasHistory
        ? `Reflects net total P&L of ${formatSignedCurrency(portfolio.totalPnl, currency)} relative to daily return variability.`
        : "Pending sufficient daily snapshot history to establish return variance."
    },
    {
      metric: "Maximum Drawdown",
      valueLabel: hasHistory ? formatPct(risk.maxDrawdownPct) : "Needs history",
      mathematicalMeaning:
        "Largest observed percentage decline from a historical peak portfolio value to a subsequent trough within the recorded snapshot window.",
      historicalDriver: hasHistory
        ? `Reflects the steepest peak-to-trough contraction observed in the ledger. ${worstDriver}`
        : "Cannot be observed until multiple daily valuation snapshots exist."
    },
    {
      metric: "Value at Risk (95%)",
      valueLabel: hasHistory ? formatPct(risk.valueAtRisk95Pct) : "Needs history",
      mathematicalMeaning:
        "The 5th percentile of historical daily returns expressed as a positive loss magnitude, indicating the daily loss threshold exceeded in 5% of observed days.",
      historicalDriver: hasHistory
        ? `Derived empirically from the lower tail of ${risk.snapshotCount - 1} historical daily return intervals.`
        : "Requires historical daily return observations to estimate the 5th percentile tail."
    },
    {
      metric: "Concentration Risk",
      valueLabel: formatPct(risk.concentrationRiskPct),
      mathematicalMeaning:
        "Percentage of total portfolio market value held in the single largest open position.",
      historicalDriver: topHolding
        ? `Driven by ${topHolding.symbol} representing ${formatPct(topHolding.percent)} of current market value across ${portfolio.holdingsCount} holding(s).`
        : "No open holdings currently contribute to single-asset concentration."
    }
  ];

  const alertNarratives: AlertNarrativeItem[] = alerts.map((alert) => {
    const label = alert.alertType.replaceAll("_", " ");
    let factualExplanation = "";
    if (alert.status === "INACTIVE") {
      factualExplanation = `This ${label} rule (${formatPct(alert.thresholdPct)} threshold) is currently paused and not evaluated during alert checks.`;
    } else if (alert.status === "BREACHED") {
      const driverSuffix =
        alert.alertType === "CONCENTRATION" && topHolding
          ? ` Primary contributor is ${topHolding.symbol} at ${formatPct(topHolding.percent)} allocation.`
          : "";
      factualExplanation = `Observed ${label} of ${formatPct(alert.currentValuePct)} meets or exceeds the configured ${formatPct(alert.thresholdPct)} threshold.${driverSuffix}`;
    } else {
      factualExplanation = `Observed ${label} of ${formatPct(alert.currentValuePct)} remains below the configured ${formatPct(alert.thresholdPct)} threshold.`;
    }

    return {
      alertType: alert.alertType,
      status: alert.status,
      currentValueLabel: formatPct(alert.currentValuePct),
      thresholdLabel: formatPct(alert.thresholdPct),
      factualExplanation
    };
  });

  const dataLimitations: string[] = [];
  if (portfolio.tradeCount === 0) {
    dataLimitations.push("No trades have been recorded in this portfolio yet; metrics reflect an empty ledger.");
  } else if (portfolio.holdingsCount === 0) {
    dataLimitations.push("All traded positions are currently closed; concentration risk is 0.00% with no open exposure.");
  }
  if (!hasHistory) {
    dataLimitations.push("Fewer than 2 daily portfolio snapshots are available; time-series risk metrics use a flat baseline.");
  }
  if (alerts.length === 0) {
    dataLimitations.push("No risk alert thresholds are configured for this portfolio.");
  }

  return {
    executiveSummary: executiveParts.join(" "),
    metricExplanations,
    alertNarratives,
    dataLimitations
  };
}

const GEMINI_SYSTEM_INSTRUCTION = `You are a strictly factual financial recordkeeping narrator for RiskLens.
Your ONLY job is to explain already-computed historical portfolio metrics, mathematical definitions, and alert threshold states in plain English.

STRICT REGULATORY RULES (MANDATORY):
1. NEVER give investment, financial, tax, or legal advice.
2. NEVER recommend buying, selling, holding, trimming, adding, or rebalancing any asset.
3. NEVER predict future prices, future returns, or future market performance.
4. ONLY describe historical ledger facts, mathematical definitions of the metrics, and which recorded holdings/trades or snapshot counts drove the numbers.
5. Keep language neutral, objective, concise, and audit-ready.`;

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    executiveSummary: { type: "STRING" },
    metricExplanations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          metric: { type: "STRING" },
          valueLabel: { type: "STRING" },
          mathematicalMeaning: { type: "STRING" },
          historicalDriver: { type: "STRING" }
        },
        required: ["metric", "valueLabel", "mathematicalMeaning", "historicalDriver"]
      }
    },
    alertNarratives: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          alertType: {
            type: "STRING",
            enum: ["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"]
          },
          status: {
            type: "STRING",
            enum: ["BREACHED", "WITHIN_THRESHOLD", "INACTIVE"]
          },
          currentValueLabel: { type: "STRING" },
          thresholdLabel: { type: "STRING" },
          factualExplanation: { type: "STRING" }
        },
        required: ["alertType", "status", "currentValueLabel", "thresholdLabel", "factualExplanation"]
      }
    },
    dataLimitations: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["executiveSummary", "metricExplanations", "alertNarratives", "dataLimitations"]
};

type GeminiCallOutcome =
  | { ok: true; payload: RiskNarrativePayload }
  | { ok: false; reason: NarrativeFallbackReason; detail?: string };

async function callGeminiNarrator(input: AnonymizedRiskInput, requestId?: string): Promise<GeminiCallOutcome> {
  if (!env.GEMINI_API_KEY) {
    return { ok: false, reason: "missing_api_key" };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a factual, backward-looking Risk & Alert Narrative JSON for this anonymized portfolio snapshot:\n${JSON.stringify(input)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA
        }
      }),
      signal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS)
    });

    if (response.status === 429) {
      const errorText = await response.text().catch(() => "");
      return { ok: false, reason: "quota_exceeded", detail: errorText.slice(0, 200) };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const isQuota = /RESOURCE_EXHAUSTED|quota/i.test(errorText);
      return {
        ok: false,
        reason: isQuota ? "quota_exceeded" : "provider_error",
        detail: `HTTP ${response.status}: ${errorText.slice(0, 200)}`
      };
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { ok: false, reason: "invalid_output", detail: "Empty candidate text" };
    }

    const parsedJson = JSON.parse(rawText) as unknown;
    const validated = geminiNarrativeSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { ok: false, reason: "invalid_output", detail: "Schema validation failed" };
    }

    if (containsAdvisoryLanguage(validated.data)) {
      logger.warn({ requestId }, "Gemini narrative rejected by non-advisory compliance guardrail; using deterministic fallback");
      return { ok: false, reason: "invalid_output", detail: "Compliance guardrail triggered" };
    }

    return { ok: true, payload: validated.data };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { ok: false, reason: "timeout", detail: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, reason: "invalid_output", detail: "Invalid JSON from provider" };
    }
    return {
      ok: false,
      reason: "provider_error",
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function generateNarrativeFromSnapshot(
  input: AnonymizedRiskInput,
  requestId?: string
): Promise<Omit<RiskNarrativeResult, "cached">> {
  const outcome = await callGeminiNarrator(input, requestId);
  const generatedAt = new Date().toISOString();

  if (outcome.ok) {
    return {
      ...outcome.payload,
      source: "gemini",
      model: env.GEMINI_MODEL,
      generatedAt,
      disclaimer: NON_ADVISORY_DISCLAIMER
    };
  }

  if (outcome.reason !== "missing_api_key") {
    logger.warn(
      { requestId, fallbackReason: outcome.reason, detail: outcome.detail },
      "Gemini narrator unavailable, using deterministic fallback"
    );
  }

  return {
    ...buildDeterministicRiskNarrative(input),
    source: "deterministic-fallback",
    fallbackReason: outcome.reason,
    model: null,
    generatedAt,
    disclaimer: NON_ADVISORY_DISCLAIMER
  };
}

const inFlightNarratives = new Map<string, Promise<RiskNarrativeResult>>();

export const riskNarrativeService = {
  async explainPortfolioRisk(
    userId: string,
    portfolioId: string,
    options: { refresh?: boolean; requestId?: string } = {}
  ): Promise<RiskNarrativeResult> {
    const cacheKey = portfolioCacheKey(portfolioId, "risk-narrative");

    if (!options.refresh) {
      const cached = await getCache<Omit<RiskNarrativeResult, "cached">>(cacheKey, options.requestId);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const inFlightKey = `${userId}:${portfolioId}`;
    const existing = inFlightNarratives.get(inFlightKey);
    if (existing) {
      return existing;
    }

    const computation = (async (): Promise<RiskNarrativeResult> => {
      const [risk, summary, alerts] = await Promise.all([
        analyticsService.risk(userId, portfolioId, options.requestId),
        analyticsService.summary(userId, portfolioId, options.requestId),
        Alert.find({
          userId: toObjectId(userId, "userId"),
          portfolioId: toObjectId(portfolioId, "portfolioId")
        })
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const currentAlertValues: Record<"DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY", number> = {
        DAILY_LOSS: Math.abs(Math.min((summary.dailyReturn ?? 0) * 100, 0)),
        MAX_DRAWDOWN: risk.maxDrawdown * 100,
        CONCENTRATION: risk.concentrationRisk * 100,
        VOLATILITY: risk.annualizedVolatility * 100
      };

      const anonymizedInput: AnonymizedRiskInput = {
        risk: {
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          annualizedVolatilityPct: Number((risk.annualizedVolatility * 100).toFixed(2)),
          sharpeRatio: risk.sharpeRatio,
          maxDrawdownPct: Number((risk.maxDrawdown * 100).toFixed(2)),
          valueAtRisk95Pct: Number((risk.valueAtRisk95 * 100).toFixed(2)),
          concentrationRiskPct: Number((risk.concentrationRisk * 100).toFixed(2)),
          insufficientHistory: risk.insufficientHistory,
          snapshotCount: risk.dailyReturns.length > 0 ? risk.dailyReturns.length + 1 : 0
        },
        portfolio: {
          baseCurrency: summary.baseCurrency,
          holdingsCount: summary.holdingsCount,
          tradeCount: summary.tradeCount,
          totalPortfolioValue: summary.totalPortfolioValue,
          realizedPnl: summary.realizedPnl,
          unrealizedPnl: summary.unrealizedPnl,
          totalPnl: summary.totalPnl,
          dailyReturnPct: Number(((summary.dailyReturn ?? 0) * 100).toFixed(2)),
          topAllocations: [...summary.allocation]
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 5)
            .map((item) => ({ symbol: item.symbol, percent: item.percent })),
          bestPerformer: summary.bestPerformer,
          worstPerformer: summary.worstPerformer
        },
        alerts: alerts.map((alert) => {
          const currentValuePct = Number(currentAlertValues[alert.type].toFixed(2));
          const status: AlertNarrativeItem["status"] = !alert.isActive
            ? "INACTIVE"
            : currentValuePct >= alert.threshold
              ? "BREACHED"
              : "WITHIN_THRESHOLD";
          return {
            alertType: alert.type,
            isActive: alert.isActive,
            thresholdPct: alert.threshold,
            currentValuePct,
            status
          };
        })
      };

      const result = await generateNarrativeFromSnapshot(anonymizedInput, options.requestId);
      await setCache(cacheKey, result, { ttlSeconds: env.GEMINI_CACHE_TTL_SECONDS });

      await activityService
        .record({
          userId,
          portfolioId,
          type: "RISK_NARRATIVE_GENERATED",
          message: `Generated descriptive risk narrative (${result.source})`,
          metadata: {
            source: result.source,
            fallbackReason: result.fallbackReason ?? null,
            model: result.model
          }
        })
        .catch(() => undefined);

      return { ...result, cached: false };
    })().finally(() => {
      inFlightNarratives.delete(inFlightKey);
    });

    inFlightNarratives.set(inFlightKey, computation);
    return computation;
  }
};
