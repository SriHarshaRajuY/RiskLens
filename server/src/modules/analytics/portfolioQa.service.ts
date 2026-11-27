import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { toObjectId } from "../../utils/objectId.js";
import { activityService } from "../activity/activity.service.js";
import { Alert } from "../alerts/alert.model.js";
import { Trade } from "../trades/trade.model.js";
import { analyticsService } from "./analytics.service.js";

export const QA_NON_ADVISORY_DISCLAIMER =
  "Informational recordkeeping only. Answers reflect your recorded historical trades, snapshots, and math—never financial, investment, tax, or legal advice.";

export type QaSource = "gemini" | "deterministic-fallback" | "guardrail";

export type QaFallbackReason =
  | "missing_api_key"
  | "quota_exceeded"
  | "timeout"
  | "provider_error"
  | "invalid_output";

export type PortfolioQaResponse = {
  question: string;
  answer: string;
  supportingFacts: string[];
  metricsReferenced: string[];
  refused: boolean;
  source: QaSource;
  fallbackReason?: QaFallbackReason;
  model: string | null;
  answeredAt: string;
  disclaimer: string;
};

export type AnonymizedQaContext = {
  baseCurrency: "USD" | "INR";
  summary: {
    totalPortfolioValue: number;
    totalInvestedAmount: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    dailyPnl: number;
    dailyReturnPct: number;
    holdingsCount: number;
    tradeCount: number;
    bestPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
    worstPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
  };
  risk: {
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High";
    annualizedVolatilityPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    valueAtRisk95Pct: number;
    concentrationRiskPct: number;
    insufficientHistory: boolean;
  };
  holdings: Array<{
    symbol: string;
    quantity: number;
    averageBuyPrice: number;
    currentPrice: number;
    marketValue: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    allocationPercent: number;
  }>;
  recentSnapshots: Array<{
    date: string;
    totalValue: number;
    dailyReturnPct: number;
    drawdownFromPeakPct: number;
  }>;
  recentTrades: Array<{
    date: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    fees: number;
  }>;
  alerts: Array<{
    alertType: "DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY";
    status: "BREACHED" | "WITHIN_THRESHOLD" | "INACTIVE";
    currentValuePct: number;
    thresholdPct: number;
  }>;
};

const geminiQaSchema = z.object({
  answer: z.string().min(15).max(1500),
  supportingFacts: z.array(z.string().min(5).max(320)).min(1).max(6),
  metricsReferenced: z.array(z.string().min(2).max(60)).max(8)
});

const PROHIBITED_QUESTION_PATTERNS = [
  /\b(should i|ought i|can i|would you) (buy|sell|hold|trim|add|rebalance|invest|exit|short|hedge|dump|keep)\b/i,
  /\b(what|which) (stock|stocks|asset|assets|etf|coin|ticker|share|shares) (should i|to) (buy|sell|invest|pick)\b/i,
  /\b(give me|what is your) (advice|recommendation|pick|target)\b/i,
  /\b(recommend|suggest) (buying|selling|rebalancing|allocating|a stock|stocks|trades)\b/i,
  /\bhow (should|do) i rebalance\b/i,
  /\b(will|is|are|could|might) .+ (going to |likely to )?(go up|go down|rise|fall|crash|rally|beat|outperform|moon)\b/i,
  /\b(predict|forecast|price target|future return|future performance)\b/i
];

const ADVISORY_RESPONSE_PATTERNS = [
  /\byou should\b/i,
  /\bi recommend\b/i,
  /\bwe recommend\b/i,
  /\bconsider (buying|selling|rebalancing|reducing|increasing|exiting|entering)\b/i,
  /\b(buy|sell|rebalance|short|hedge) (more|some|all|your|shares|positions)\b/i,
  /\bwill (outperform|rise|fall|crash|rally|gain)\b/i,
  /\bguaranteed\b/i
];

export function isAdvisoryOrPredictiveQuestion(question: string): boolean {
  return PROHIBITED_QUESTION_PATTERNS.some((pattern) => pattern.test(question));
}

export function containsAdvisoryResponse(answer: string, facts: string[]): boolean {
  return [answer, ...facts].some((text) => ADVISORY_RESPONSE_PATTERNS.some((pattern) => pattern.test(text)));
}

function formatMoney(value: number, currency: "USD" | "INR" = "USD"): string {
  const symbol = currency === "INR" ? "₹" : "$";
  const abs = Math.abs(value).toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return value < 0 ? `-${symbol}${abs}` : `${symbol}${abs}`;
}

export function answerPortfolioQuestionDeterministically(
  question: string,
  context: AnonymizedQaContext
): { answer: string; supportingFacts: string[]; metricsReferenced: string[] } {
  const q = question.toLowerCase();
  const currency = context.baseCurrency;
  const { summary, risk, holdings, recentSnapshots, recentTrades, alerts } = context;

  const mentionedHolding = holdings.find((h) => new RegExp(`\\b${h.symbol.toLowerCase()}\\b`, "i").test(question));
  if (mentionedHolding) {
    return {
      answer: `${mentionedHolding.symbol} currently represents ${mentionedHolding.allocationPercent.toFixed(2)}% of your portfolio (${formatMoney(mentionedHolding.marketValue, currency)} across ${mentionedHolding.quantity} units at ${formatMoney(mentionedHolding.currentPrice, currency)} per unit). Its historical total P&L is ${formatMoney(mentionedHolding.totalPnl, currency)} (${formatMoney(mentionedHolding.realizedPnl, currency)} realized, ${formatMoney(mentionedHolding.unrealizedPnl, currency)} unrealized).`,
      supportingFacts: [
        `Open quantity: ${mentionedHolding.quantity} at average buy price ${formatMoney(mentionedHolding.averageBuyPrice, currency)}.`,
        `Portfolio weight: ${mentionedHolding.allocationPercent.toFixed(2)}% of ${formatMoney(summary.totalPortfolioValue, currency)} total market value.`,
        `Total P&L for ${mentionedHolding.symbol}: ${formatMoney(mentionedHolding.totalPnl, currency)}.`
      ],
      metricsReferenced: ["Holdings Allocation", "Realized P&L", "Unrealized P&L"]
    };
  }

  if (/drawdown|drop|decline|peak|trough|last week|history|snapshot/i.test(q)) {
    const worstSnapshot = [...recentSnapshots].sort((a, b) => b.drawdownFromPeakPct - a.drawdownFromPeakPct)[0];
    const worstDay = [...recentSnapshots].sort((a, b) => a.dailyReturnPct - b.dailyReturnPct)[0];
    const worstHolding = summary.worstPerformer;

    if (risk.insufficientHistory || recentSnapshots.length < 2) {
      return {
        answer: `Historical maximum drawdown is currently pending because fewer than 2 daily valuation snapshots are recorded (${recentSnapshots.length} available). Once daily snapshots accumulate across multiple days, RiskLens tracks peak-to-trough declines automatically.`,
        supportingFacts: [
          `Recorded daily snapshots: ${recentSnapshots.length}.`,
          `Recorded trades: ${summary.tradeCount} across ${summary.holdingsCount} open holding(s).`
        ],
        metricsReferenced: ["Max Drawdown", "Daily Snapshots"]
      };
    }

    const facts = [
      `Portfolio maximum drawdown is ${risk.maxDrawdownPct.toFixed(2)}% across ${recentSnapshots.length} recent daily snapshots.`,
      worstSnapshot
        ? `Deepest recent drawdown from peak (${worstSnapshot.drawdownFromPeakPct.toFixed(2)}%) was recorded on ${worstSnapshot.date} at value ${formatMoney(worstSnapshot.totalValue, currency)}.`
        : "No peak-to-trough snapshot contraction recorded.",
      worstDay
        ? `Largest single-day return drop in recent snapshots was ${worstDay.dailyReturnPct.toFixed(2)}% on ${worstDay.date}.`
        : "No daily return decline observed.",
      worstHolding
        ? `Lowest P&L contributor among open holdings is ${worstHolding.symbol} (${formatMoney(worstHolding.totalPnl, currency)}, ${worstHolding.allocationPercent.toFixed(2)}% weight).`
        : "No open holdings with negative P&L."
    ];

    return {
      answer: `Your recorded maximum drawdown is ${risk.maxDrawdownPct.toFixed(2)}%. ${worstSnapshot ? `The largest recent pullback from a prior peak occurred on ${worstSnapshot.date} (${worstSnapshot.drawdownFromPeakPct.toFixed(2)}% below peak). ` : ""}${worstDay && worstDay.dailyReturnPct < 0 ? `The steepest single-day drop in the window was ${worstDay.dailyReturnPct.toFixed(2)}% on ${worstDay.date}. ` : ""}${worstHolding ? `Among open positions, ${worstHolding.symbol} shows the lowest cumulative P&L at ${formatMoney(worstHolding.totalPnl, currency)}.` : ""}`.trim(),
      supportingFacts: facts,
      metricsReferenced: ["Max Drawdown", "Daily Returns", "Worst Performer"]
    };
  }

  if (/concentrat|weight|allocat|largest|biggest|exposure|diversif/i.test(q)) {
    const sorted = [...holdings].sort((a, b) => b.allocationPercent - a.allocationPercent);
    const top = sorted[0];
    if (!top) {
      return {
        answer: `There are currently no open holdings in this portfolio (${summary.tradeCount} recorded trades), so single-asset concentration is 0.00%.`,
        supportingFacts: ["Open holdings: 0", `Cumulative realized P&L: ${formatMoney(summary.realizedPnl, currency)}`],
        metricsReferenced: ["Concentration Risk", "Holdings Count"]
      };
    }
    return {
      answer: `Single-asset concentration is ${risk.concentrationRiskPct.toFixed(2)}%, driven by ${top.symbol} (${formatMoney(top.marketValue, currency)} out of ${formatMoney(summary.totalPortfolioValue, currency)} total value across ${summary.holdingsCount} open holding${summary.holdingsCount === 1 ? "" : "s"}).`,
      supportingFacts: sorted.slice(0, 4).map(
        (h) => `${h.symbol}: ${h.allocationPercent.toFixed(2)}% weight (${formatMoney(h.marketValue, currency)})`
      ),
      metricsReferenced: ["Concentration Risk", "Portfolio Allocation"]
    };
  }

  if (/alert|breach|threshold|limit|trigger/i.test(q)) {
    const breached = alerts.filter((a) => a.status === "BREACHED");
    if (alerts.length === 0) {
      return {
        answer: "No risk alert thresholds are currently configured for this portfolio.",
        supportingFacts: ["Configured alerts: 0"],
        metricsReferenced: ["Risk Alerts"]
      };
    }
    return {
      answer:
        breached.length > 0
          ? `${breached.length} of ${alerts.length} configured alert(s) currently meet or exceed their threshold: ${breached.map((b) => `${b.alertType.replaceAll("_", " ").toLowerCase()} (${b.currentValuePct.toFixed(2)}% vs ${b.thresholdPct.toFixed(2)}% limit)`).join(", ")}.`
          : `All ${alerts.length} configured alert(s) are currently within their threshold limits.`,
      supportingFacts: alerts.map(
        (a) => `${a.alertType.replaceAll("_", " ")}: ${a.status.replaceAll("_", " ")} (${a.currentValuePct.toFixed(2)}% observed vs ${a.thresholdPct.toFixed(2)}% threshold)`
      ),
      metricsReferenced: ["Alert Thresholds", "Risk Score"]
    };
  }

  if (/pnl|profit|loss|gain|return|best|worst|earn|made/i.test(q)) {
    return {
      answer: `Total recorded P&L is ${formatMoney(summary.totalPnl, currency)}, composed of ${formatMoney(summary.realizedPnl, currency)} realized P&L from closed sales and ${formatMoney(summary.unrealizedPnl, currency)} unrealized P&L on open holdings.`,
      supportingFacts: [
        `Total portfolio value: ${formatMoney(summary.totalPortfolioValue, currency)} (invested: ${formatMoney(summary.totalInvestedAmount, currency)}).`,
        summary.bestPerformer
          ? `Top P&L contributor: ${summary.bestPerformer.symbol} (${formatMoney(summary.bestPerformer.totalPnl, currency)}).`
          : "No P&L contributors recorded yet.",
        summary.worstPerformer
          ? `Lowest P&L contributor: ${summary.worstPerformer.symbol} (${formatMoney(summary.worstPerformer.totalPnl, currency)}).`
          : "No negative contributors recorded."
      ],
      metricsReferenced: ["Total P&L", "Realized P&L", "Unrealized P&L"]
    };
  }

  if (/trade|recent|activity|bought|sold|buy|sell/i.test(q)) {
    if (recentTrades.length === 0) {
      return {
        answer: "No trades have been recorded in this portfolio ledger yet.",
        supportingFacts: ["Recorded trades: 0"],
        metricsReferenced: ["Trade Ledger"]
      };
    }
    const latest = recentTrades[0]!;
    return {
      answer: `This portfolio has ${summary.tradeCount} recorded trade(s). The most recent entry was ${latest.side} ${latest.quantity} ${latest.symbol} at ${formatMoney(latest.price, currency)} on ${latest.date}.`,
      supportingFacts: recentTrades
        .slice(0, 4)
        .map((t) => `${t.date}: ${t.side} ${t.quantity} ${t.symbol} @ ${formatMoney(t.price, currency)}`),
      metricsReferenced: ["Trade History", "Holdings Count"]
    };
  }

  return {
    answer: `Your portfolio currently holds ${summary.holdingsCount} open position(s) valued at ${formatMoney(summary.totalPortfolioValue, currency)} with a composite risk score of ${risk.riskScore}/100 (${risk.riskLevel} tier). Annualized volatility is ${risk.annualizedVolatilityPct.toFixed(2)}%, maximum drawdown is ${risk.maxDrawdownPct.toFixed(2)}%, and top concentration is ${risk.concentrationRiskPct.toFixed(2)}%.`,
    supportingFacts: [
      `Total P&L: ${formatMoney(summary.totalPnl, currency)} (${formatMoney(summary.realizedPnl, currency)} realized, ${formatMoney(summary.unrealizedPnl, currency)} unrealized).`,
      `Risk score: ${risk.riskScore}/100 (${risk.riskLevel}) | Sharpe: ${risk.sharpeRatio.toFixed(2)} | VaR 95%: ${risk.valueAtRisk95Pct.toFixed(2)}%.`,
      `Alerts configured: ${alerts.length} (${alerts.filter((a) => a.status === "BREACHED").length} breached).`
    ],
    metricsReferenced: ["Risk Score", "Volatility", "Max Drawdown", "Concentration Risk"]
  };
}

const GEMINI_QA_SYSTEM_INSTRUCTION = `You are a strictly factual portfolio recordkeeping assistant for RiskLens.
You answer user questions ONLY using the anonymized historical portfolio JSON provided in the prompt.

MANDATORY GLOBAL COMPLIANCE RULES:
1. NEVER provide investment, financial, trading, tax, or legal advice.
2. NEVER recommend buying, selling, holding, trimming, adding, or rebalancing any asset.
3. NEVER predict future prices, returns, or market conditions.
4. ONLY cite facts, dates, symbols, trades, snapshots, and numbers present in the provided JSON. If the JSON lacks enough history (e.g., < 2 snapshots), state that plainly instead of guessing.
5. Keep answers concise, accurate, neutral, and easy for a non-technical investor to read.`;

const GEMINI_QA_SCHEMA = {
  type: "OBJECT",
  properties: {
    answer: { type: "STRING" },
    supportingFacts: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    metricsReferenced: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["answer", "supportingFacts", "metricsReferenced"]
};

type GeminiQaOutcome =
  | { ok: true; data: z.infer<typeof geminiQaSchema> }
  | { ok: false; reason: QaFallbackReason; detail?: string };

async function callGeminiPortfolioQa(
  question: string,
  context: AnonymizedQaContext,
  requestId?: string
): Promise<GeminiQaOutcome> {
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
          parts: [{ text: GEMINI_QA_SYSTEM_INSTRUCTION }]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `User question: ${question}\n\nAnonymized portfolio data (currency: ${context.baseCurrency}):\n${JSON.stringify(context)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
          responseSchema: GEMINI_QA_SCHEMA
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
    const validated = geminiQaSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { ok: false, reason: "invalid_output", detail: "Schema validation failed" };
    }

    if (containsAdvisoryResponse(validated.data.answer, validated.data.supportingFacts)) {
      logger.warn({ requestId }, "Gemini Q&A response rejected by non-advisory compliance guardrail; falling back");
      return { ok: false, reason: "invalid_output", detail: "Compliance guardrail triggered" };
    }

    return { ok: true, data: validated.data };
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

export async function generatePortfolioQaResponse(
  question: string,
  context: AnonymizedQaContext,
  requestId?: string
): Promise<PortfolioQaResponse> {
  const trimmed = question.trim();
  const answeredAt = new Date().toISOString();

  if (isAdvisoryOrPredictiveQuestion(trimmed)) {
    return {
      question: trimmed,
      answer:
        "I can only explain your recorded historical trades, portfolio metrics, and alert thresholds—I cannot recommend buying, selling, rebalancing, or predict future market performance.",
      supportingFacts: [
        "Try asking about historical drawdown changes, single-stock concentration, realized vs. unrealized P&L, or active alert thresholds."
      ],
      metricsReferenced: ["Non-Advisory Policy"],
      refused: true,
      source: "guardrail",
      model: null,
      answeredAt,
      disclaimer: QA_NON_ADVISORY_DISCLAIMER
    };
  }

  const outcome = await callGeminiPortfolioQa(trimmed, context, requestId);

  if (outcome.ok) {
    return {
      question: trimmed,
      answer: outcome.data.answer,
      supportingFacts: outcome.data.supportingFacts,
      metricsReferenced: outcome.data.metricsReferenced,
      refused: false,
      source: "gemini",
      model: env.GEMINI_MODEL,
      answeredAt,
      disclaimer: QA_NON_ADVISORY_DISCLAIMER
    };
  }

  if (outcome.reason !== "missing_api_key") {
    logger.warn({ requestId, fallbackReason: outcome.reason, detail: outcome.detail }, "Gemini Q&A unavailable, using deterministic fallback");
  }

  const fallback = answerPortfolioQuestionDeterministically(trimmed, context);
  return {
    question: trimmed,
    answer: fallback.answer,
    supportingFacts: fallback.supportingFacts,
    metricsReferenced: fallback.metricsReferenced,
    refused: false,
    source: "deterministic-fallback",
    fallbackReason: outcome.reason,
    model: null,
    answeredAt,
    disclaimer: QA_NON_ADVISORY_DISCLAIMER
  };
}

export const portfolioQaService = {
  async ask(
    userId: string,
    portfolioId: string,
    question: string,
    options: { requestId?: string } = {}
  ): Promise<PortfolioQaResponse> {
    const [summary, risk, holdings, returns, alerts, recentRawTrades] = await Promise.all([
      analyticsService.summary(userId, portfolioId, options.requestId),
      analyticsService.risk(userId, portfolioId, options.requestId),
      analyticsService.holdings(userId, portfolioId, options.requestId),
      analyticsService.returns(userId, portfolioId, options.requestId),
      Alert.find({
        userId: toObjectId(userId, "userId"),
        portfolioId: toObjectId(portfolioId, "portfolioId")
      })
        .sort({ createdAt: -1 })
        .lean(),
      Trade.find({
        userId: toObjectId(userId, "userId"),
        portfolioId: toObjectId(portfolioId, "portfolioId")
      })
        .sort({ tradeDate: -1, createdAt: -1 })
        .limit(30)
        .lean()
    ]);

    let runningPeak = 0;
    const recentSnapshots = returns.slice(-30).map((point) => {
      if (point.totalValue > runningPeak) runningPeak = point.totalValue;
      const drawdownFromPeakPct = runningPeak > 0 ? Number((((runningPeak - point.totalValue) / runningPeak) * 100).toFixed(2)) : 0;
      return {
        date: point.date,
        totalValue: point.totalValue,
        dailyReturnPct: Number((point.dailyReturn * 100).toFixed(2)),
        drawdownFromPeakPct
      };
    });

    const currentAlertValues: Record<"DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY", number> = {
      DAILY_LOSS: Math.abs(Math.min((summary.dailyReturn ?? 0) * 100, 0)),
      MAX_DRAWDOWN: risk.maxDrawdown * 100,
      CONCENTRATION: risk.concentrationRisk * 100,
      VOLATILITY: risk.annualizedVolatility * 100
    };

    const context: AnonymizedQaContext = {
      baseCurrency: summary.baseCurrency,
      summary: {
        totalPortfolioValue: summary.totalPortfolioValue,
        totalInvestedAmount: summary.totalInvestedAmount,
        realizedPnl: summary.realizedPnl,
        unrealizedPnl: summary.unrealizedPnl,
        totalPnl: summary.totalPnl,
        dailyPnl: summary.dailyPnl,
        dailyReturnPct: Number(((summary.dailyReturn ?? 0) * 100).toFixed(2)),
        holdingsCount: summary.holdingsCount,
        tradeCount: summary.tradeCount,
        bestPerformer: summary.bestPerformer,
        worstPerformer: summary.worstPerformer
      },
      risk: {
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        annualizedVolatilityPct: Number((risk.annualizedVolatility * 100).toFixed(2)),
        sharpeRatio: risk.sharpeRatio,
        maxDrawdownPct: Number((risk.maxDrawdown * 100).toFixed(2)),
        valueAtRisk95Pct: Number((risk.valueAtRisk95 * 100).toFixed(2)),
        concentrationRiskPct: Number((risk.concentrationRisk * 100).toFixed(2)),
        insufficientHistory: risk.insufficientHistory
      },
      holdings: holdings.slice(0, 25).map((h) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        realizedPnl: h.realizedPnl,
        unrealizedPnl: h.unrealizedPnl,
        totalPnl: h.totalPnl,
        allocationPercent: h.allocationPercent
      })),
      recentSnapshots,
      recentTrades: recentRawTrades.map((t) => ({
        date: new Date(t.tradeDate).toISOString().slice(0, 10),
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        fees: t.fees ?? 0
      })),
      alerts: alerts.map((alert) => {
        const currentValuePct = Number(currentAlertValues[alert.type].toFixed(2));
        const status = !alert.isActive ? "INACTIVE" : currentValuePct >= alert.threshold ? "BREACHED" : "WITHIN_THRESHOLD";
        return {
          alertType: alert.type,
          status,
          currentValuePct,
          thresholdPct: alert.threshold
        };
      })
    };

    const result = await generatePortfolioQaResponse(question, context, options.requestId);

    await activityService
      .record({
        userId,
        portfolioId,
        type: "PORTFOLIO_QA_ASKED",
        message: result.refused
          ? "Portfolio Q&A blocked non-factual advisory request"
          : `Answered portfolio question (${result.source})`,
        metadata: {
          source: result.source,
          refused: result.refused,
          fallbackReason: result.fallbackReason ?? null,
          questionLength: result.question.length
        }
      })
      .catch(() => undefined);

    return result;
  }
};
