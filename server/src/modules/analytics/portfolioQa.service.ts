import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getCache, setCache } from "../../utils/cache.js";
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

export type QaHistoryTurn = {
  question: string;
  answer: string;
};

const geminiQaSchema = z.object({
  answer: z.string().min(10).max(1600),
  supportingFacts: z.array(z.string().min(4).max(320)).max(5),
  metricsReferenced: z.array(z.string().min(2).max(60)).max(8)
});

const METRIC_LABEL_MAP: Record<string, string> = {
  riskScore: "Risk Score",
  riskLevel: "Risk Tier",
  annualizedVolatilityPct: "Annualized Volatility",
  annualizedVolatility: "Annualized Volatility",
  sharpeRatio: "Sharpe Ratio",
  maxDrawdownPct: "Max Drawdown",
  maxDrawdown: "Max Drawdown",
  valueAtRisk95Pct: "Value at Risk (95%)",
  valueAtRisk95: "Value at Risk (95%)",
  concentrationRiskPct: "Concentration Risk",
  concentrationRisk: "Concentration Risk",
  totalPortfolioValue: "Portfolio Value",
  totalInvestedAmount: "Invested Capital",
  realizedPnl: "Realized P&L",
  unrealizedPnl: "Unrealized P&L",
  totalPnl: "Total P&L",
  dailyPnl: "Daily P&L",
  dailyReturnPct: "Daily Return",
  holdingsCount: "Holdings Count",
  tradeCount: "Trade Count"
};

function humanizeMetricLabel(raw: string): string {
  const mapped = METRIC_LABEL_MAP[raw];
  if (mapped) return mapped;
  if (!/[a-z][A-Z]|_/.test(raw)) return raw;
  return raw
    .replace(/Pct$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const PROHIBITED_QUESTION_PATTERNS = [
  /\b(should i|ought i|can i|would you) (buy|sell|hold|trim|add|rebalance|invest|exit|short|hedge|dump|keep)\b/i,
  /\b(what|which) (stock|stocks|asset|assets|etf|coin|ticker|share|shares) (should i|to) (buy|sell|invest|pick)\b/i,
  /\b(give me|what is your) (advice|recommendation|pick|target)\b/i,
  /\b(recommend|suggest) (buying|selling|rebalancing|allocating|a stock|stocks|trades)\b/i,
  /\bhow (should|do) i rebalance\b/i,
  /\b(will|is|are|could|might) .+ (going to |likely to )?(go up|go down|rise|fall|crash|rally|beat|outperform|moon)\b/i,
  /\b(predict|forecast|price target|future return|future performance)\b/i,
  /\b(ignore (all )?(previous|above|prior) instructions|system prompt|reveal your prompt|jailbreak|bypass)\b/i
];

/**
 * Patterns that indicate a Gemini response contains genuine financial advice
 * (direct imperative recommendations to the user). These are NARROW on purpose —
 * factual explanations that happen to use words like "consider" or "rebalance"
 * in a historical/educational context must NOT trigger the guardrail.
 *
 * Rule: only fire when the model explicitly tells the user what to do with money.
 */
const ADVISORY_RESPONSE_PATTERNS = [
  // Direct second-person imperatives telling the user to trade
  /\byou should (buy|sell|short|exit|enter|trim|add|reduce|rebalance|liquidate|invest|divest)\b/i,
  // Explicit "I / we recommend" followed by an action
  /\b(i|we) recommend (buying|selling|shorting|exiting|trimming|adding|reducing|rebalancing|liquidating)\b/i,
  // "Buy / sell now / today / immediately" — time-urgent trade calls
  /\b(buy|sell|exit|short)\b.{0,30}\b(now|immediately|today|right now|at once|urgently)\b/i,
  // Guaranteed return / profit claims
  /\bguaranteed (return|profit|gain|income|yield)\b/i,
  // Definitive price-movement predictions
  /\bwill (definitely|certainly|surely|inevitably) (outperform|rise|fall|crash|rally|gain|drop|decline)\b/i
];

function sanitizeQuestionInput(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

const GEMINI_COOLDOWN_MS = 60_000;
let geminiCooldownUntil = 0;
let geminiCooldownReason: QaFallbackReason | null = null;

export function resetQaCircuitBreakerForTests(): void {
  geminiCooldownUntil = 0;
  geminiCooldownReason = null;
}

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

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

export function answerPortfolioQuestionDeterministically(
  question: string,
  context: AnonymizedQaContext
): { answer: string; supportingFacts: string[]; metricsReferenced: string[] } {
  const q = question.toLowerCase();
  const currency = context.baseCurrency;
  const { summary, risk, holdings, recentSnapshots, recentTrades, alerts } = context;

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|help|what can you do|what can i ask)\b[!.? ]*$/i.test(q)) {
    return {
      answer:
        "Hello! I can help explain your portfolio's numbers, risk concepts, drawdown history, holdings concentration, P&L breakdown, and alert rules in plain English. Ask me anything factual about your portfolio or how a risk metric works.",
      supportingFacts: [
        `Current snapshot: ${plural(summary.holdingsCount, "open holding")} worth ${formatMoney(summary.totalPortfolioValue, currency)} with a Risk Score of ${risk.riskScore}/100 (${risk.riskLevel}).`
      ],
      metricsReferenced: ["Portfolio Overview"]
    };
  }

  const isDefinitionQuestion = /^(what is|what's|what does|define|explain what|how does|how is)\b/i.test(q) && !/\bmy\b/i.test(q);
  if (isDefinitionQuestion) {
    if (/risk score|risk level|risk tier/i.test(q)) {
      return {
        answer: `A Risk Score is a 0 to 100 scale that summarizes how bumpy and concentrated a portfolio is (0–30 Low, 31–60 Medium, 61–100 High). RiskLens calculates it using four weighted ingredients: Annualized Volatility (30%), Max Drawdown (30%), Single-Asset Concentration (20%), and Value at Risk 95% (20%). Right now, your portfolio has a Risk Score of ${risk.riskScore}/100 (${risk.riskLevel} tier).`,
        supportingFacts: [
          `Your current inputs: ${risk.annualizedVolatilityPct.toFixed(2)}% volatility, ${risk.maxDrawdownPct.toFixed(2)}% max drawdown, ${risk.concentrationRiskPct.toFixed(2)}% top concentration, and ${risk.valueAtRisk95Pct.toFixed(2)}% VaR.`
        ],
        metricsReferenced: ["Risk Score", "Annualized Volatility", "Max Drawdown"]
      };
    }
    if (/volatil/i.test(q)) {
      return {
        answer: `Volatility measures how sharply a portfolio's daily value swings up and down over time. Annualized Volatility scales those daily swings across a 252-trading-day year—higher numbers mean wider day-to-day price movement. Your portfolio's current Annualized Volatility is ${risk.annualizedVolatilityPct.toFixed(2)}%.`,
        supportingFacts: [],
        metricsReferenced: ["Annualized Volatility"]
      };
    }
    if (/drawdown/i.test(q)) {
      return {
        answer: `Maximum Drawdown is the largest percentage drop from a portfolio's historical peak value to a later low point before reaching a new high. It shows the worst historical dip you would have experienced in the recorded window. Your portfolio's recorded Max Drawdown is ${risk.maxDrawdownPct.toFixed(2)}%.`,
        supportingFacts: [],
        metricsReferenced: ["Max Drawdown"]
      };
    }
    if (/sharpe/i.test(q)) {
      return {
        answer: `The Sharpe Ratio measures how much historical return a portfolio earned for each unit of daily volatility taken. Above 1.0 generally reflects stronger return relative to volatility, while negative values reflect net losses relative to swings. Your portfolio's current Sharpe Ratio is ${risk.sharpeRatio.toFixed(2)}.`,
        supportingFacts: [],
        metricsReferenced: ["Sharpe Ratio"]
      };
    }
    if (/var\b|value at risk/i.test(q)) {
      return {
        answer: `Value at Risk (95%) estimates the typical worst single-day loss seen on the weakest 5% of observed trading days. For example, a 3.00% VaR means roughly 1 in 20 days historically dropped by 3.00% or more. Your portfolio's current 95% daily VaR is ${risk.valueAtRisk95Pct.toFixed(2)}%.`,
        supportingFacts: [],
        metricsReferenced: ["Value at Risk (95%)"]
      };
    }
    if (/concentrat/i.test(q)) {
      return {
        answer: `Concentration Risk shows what percentage of your total portfolio value sits in your single largest holding. Higher concentration means one stock has a bigger impact on your overall gains or losses. Your portfolio's current Concentration Risk is ${risk.concentrationRiskPct.toFixed(2)}%.`,
        supportingFacts: [],
        metricsReferenced: ["Concentration Risk"]
      };
    }
  }

  const mentionedHolding = holdings.find((h) => new RegExp(`\\b${h.symbol.toLowerCase()}\\b`, "i").test(question));
  if (mentionedHolding) {
    const symbolTrades = recentTrades.filter((t) => t.symbol.toUpperCase() === mentionedHolding.symbol.toUpperCase());
    return {
      answer: `${mentionedHolding.symbol} currently represents ${mentionedHolding.allocationPercent.toFixed(2)}% of your portfolio (${formatMoney(mentionedHolding.marketValue, currency)} across ${mentionedHolding.quantity} units at ${formatMoney(mentionedHolding.currentPrice, currency)} per unit). Its historical total P&L is ${formatMoney(mentionedHolding.totalPnl, currency)} (${formatMoney(mentionedHolding.realizedPnl, currency)} realized, ${formatMoney(mentionedHolding.unrealizedPnl, currency)} unrealized).`,
      supportingFacts: [
        `Open quantity: ${mentionedHolding.quantity} at average buy price ${formatMoney(mentionedHolding.averageBuyPrice, currency)}.`,
        `Portfolio weight: ${mentionedHolding.allocationPercent.toFixed(2)}% of ${formatMoney(summary.totalPortfolioValue, currency)} total market value.`,
        `Total P&L for ${mentionedHolding.symbol}: ${formatMoney(mentionedHolding.totalPnl, currency)}.`,
        ...(symbolTrades.length > 0
          ? [`Most recent ${mentionedHolding.symbol} trade: ${symbolTrades[0]!.side} ${symbolTrades[0]!.quantity} @ ${formatMoney(symbolTrades[0]!.price, currency)} on ${symbolTrades[0]!.date}.`]
          : [])
      ],
      metricsReferenced: ["Holdings Allocation", "Realized P&L", "Unrealized P&L"]
    };
  }

  if (/drawdown|drop|decline|peak|trough|pullback/i.test(q)) {
    const worstSnapshot = [...recentSnapshots].sort((a, b) => b.drawdownFromPeakPct - a.drawdownFromPeakPct)[0];
    const worstDay = [...recentSnapshots].sort((a, b) => a.dailyReturnPct - b.dailyReturnPct)[0];
    const worstHolding = summary.worstPerformer;

    if (risk.insufficientHistory || recentSnapshots.length < 2) {
      return {
        answer: `Historical maximum drawdown is currently pending because fewer than 2 daily valuation snapshots are recorded (${recentSnapshots.length} available). Once daily snapshots accumulate across multiple days, RiskLens tracks peak-to-trough declines automatically.`,
        supportingFacts: [
          `Recorded daily snapshots: ${recentSnapshots.length}.`,
          `Recorded trades: ${plural(summary.tradeCount, "trade")} across ${plural(summary.holdingsCount, "open holding")}.`
        ],
        metricsReferenced: ["Max Drawdown", "Daily Snapshots"]
      };
    }

    const facts = [
      `Portfolio maximum drawdown is ${risk.maxDrawdownPct.toFixed(2)}% across ${plural(recentSnapshots.length, "recent daily snapshot")}.`,
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

  if (/volatil|sharpe|var\b|value at risk|risk score|risk level|swing/i.test(q)) {
    const volPts = Math.min((risk.annualizedVolatilityPct / 45) * 30, 30);
    const ddPts = Math.min((risk.maxDrawdownPct / 35) * 30, 30);
    const concPts = Math.min((risk.concentrationRiskPct / 60) * 20, 20);
    const varPts = Math.min((risk.valueAtRisk95Pct / 8) * 20, 20);
    const drivers = [
      { name: "Volatility (30% weight)", pts: volPts },
      { name: "Max Drawdown (30% weight)", pts: ddPts },
      { name: "Concentration (20% weight)", pts: concPts },
      { name: "Value at Risk 95% (20% weight)", pts: varPts }
    ].sort((a, b) => b.pts - a.pts);

    const topDriver = drivers[0]!;
    const swingDays = [...recentSnapshots].sort((a, b) => Math.abs(b.dailyReturnPct) - Math.abs(a.dailyReturnPct));
    const biggestSwing = swingDays[0];

    return {
      answer: `Your composite risk score is ${risk.riskScore}/100 (${risk.riskLevel} tier). Annualized volatility is ${risk.annualizedVolatilityPct.toFixed(2)}%, Sharpe ratio is ${risk.sharpeRatio.toFixed(2)}, and 95% daily Value at Risk is ${risk.valueAtRisk95Pct.toFixed(2)}%. The largest contributor to your risk score is ${topDriver.name} (${topDriver.pts.toFixed(1)} pts).`,
      supportingFacts: [
        `Score breakdown: Volatility ${volPts.toFixed(1)}/30, Drawdown ${ddPts.toFixed(1)}/30, Concentration ${concPts.toFixed(1)}/20, VaR 95% ${varPts.toFixed(1)}/20.`,
        ...(biggestSwing
          ? [`Largest recent daily move: ${biggestSwing.dailyReturnPct.toFixed(2)}% on ${biggestSwing.date}.`]
          : []),
        risk.insufficientHistory
          ? "Return-series metrics remain preliminary until at least 2 daily snapshots exist."
          : `Computed across ${plural(recentSnapshots.length, "daily snapshot")}.`
      ],
      metricsReferenced: ["Risk Score", "Annualized Volatility", "Sharpe Ratio", "Value at Risk (95%)"]
    };
  }

  if (/today|yesterday|this week|last week|7 days|recent performance|how did/i.test(q)) {
    const latest = recentSnapshots.at(-1);
    const weekAnchor = recentSnapshots.length >= 7 ? recentSnapshots[recentSnapshots.length - 7] : recentSnapshots[0];
    if (!latest || recentSnapshots.length < 2 || !weekAnchor) {
      return {
        answer: `Current portfolio value is ${formatMoney(summary.totalPortfolioValue, currency)} with total P&L of ${formatMoney(summary.totalPnl, currency)}. Multi-day period comparisons will populate once at least 2 daily valuation snapshots are recorded.`,
        supportingFacts: [
          `Recorded snapshots: ${recentSnapshots.length}`,
          `Recorded trades: ${plural(summary.tradeCount, "trade")}`
        ],
        metricsReferenced: ["Portfolio Value", "Daily Return"]
      };
    }

    const diff = latest.totalValue - weekAnchor.totalValue;
    const pct = weekAnchor.totalValue > 0 ? (diff / weekAnchor.totalValue) * 100 : 0;

    return {
      answer: `From ${weekAnchor.date} to ${latest.date}, portfolio value moved from ${formatMoney(weekAnchor.totalValue, currency)} to ${formatMoney(latest.totalValue, currency)} (${diff >= 0 ? "+" : ""}${formatMoney(diff, currency)}, ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%). The latest daily return was ${summary.dailyReturnPct.toFixed(2)}% (${formatMoney(summary.dailyPnl, currency)}).`,
      supportingFacts: [
        `Latest valuation (${latest.date}): ${formatMoney(latest.totalValue, currency)}.`,
        `Comparison baseline (${weekAnchor.date}): ${formatMoney(weekAnchor.totalValue, currency)}.`,
        `Latest daily P&L: ${formatMoney(summary.dailyPnl, currency)} (${summary.dailyReturnPct.toFixed(2)}%).`
      ],
      metricsReferenced: ["Portfolio Value", "Daily P&L", "Daily Returns"]
    };
  }

  if (/fee|fees|cost|invested|capital/i.test(q)) {
    const totalRecentFees = recentTrades.reduce((sum, t) => sum + (t.fees ?? 0), 0);
    return {
      answer: `Total recorded invested capital is ${formatMoney(summary.totalInvestedAmount, currency)} compared to current market value of ${formatMoney(summary.totalPortfolioValue, currency)} (net total P&L of ${formatMoney(summary.totalPnl, currency)}). Across your ${plural(recentTrades.length, "most recent trade")}, recorded fees total ${formatMoney(totalRecentFees, currency)}.`,
      supportingFacts: [
        `Total invested amount: ${formatMoney(summary.totalInvestedAmount, currency)}.`,
        `Current market value: ${formatMoney(summary.totalPortfolioValue, currency)}.`,
        `Recorded fees across last ${recentTrades.length} trade(s): ${formatMoney(totalRecentFees, currency)}.`
      ],
      metricsReferenced: ["Invested Capital", "Portfolio Value", "Trade Fees"]
    };
  }

  if (/concentrat|weight|allocat|largest|biggest|exposure|diversif|compare|top|breakdown|holding/i.test(q)) {
    const sorted = [...holdings].sort((a, b) => b.allocationPercent - a.allocationPercent);
    const top = sorted[0];
    if (!top) {
      return {
        answer: `There are currently no open holdings in this portfolio (${plural(summary.tradeCount, "recorded trade")}), so single-asset concentration is 0.00%.`,
        supportingFacts: ["Open holdings: 0", `Cumulative realized P&L: ${formatMoney(summary.realizedPnl, currency)}`],
        metricsReferenced: ["Concentration Risk", "Holdings Count"]
      };
    }
    return {
      answer: `Single-asset concentration is ${risk.concentrationRiskPct.toFixed(2)}%, led by ${top.symbol} (${formatMoney(top.marketValue, currency)} out of ${formatMoney(summary.totalPortfolioValue, currency)} total value across ${plural(summary.holdingsCount, "open holding")}).`,
      supportingFacts: sorted.slice(0, 5).map(
        (h) => `${h.symbol}: ${h.allocationPercent.toFixed(2)}% weight (${formatMoney(h.marketValue, currency)}, P&L ${formatMoney(h.totalPnl, currency)})`
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
          ? `${plural(breached.length, "alert")} out of ${alerts.length} currently meet or exceed their threshold: ${breached.map((b) => `${b.alertType.replaceAll("_", " ").toLowerCase()} (${b.currentValuePct.toFixed(2)}% vs ${b.thresholdPct.toFixed(2)}% limit)`).join(", ")}.`
          : `All ${plural(alerts.length, "configured alert")} are currently within their threshold limits.`,
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
      answer: `This portfolio has ${plural(summary.tradeCount, "recorded trade")}. The most recent entry was ${latest.side} ${latest.quantity} ${latest.symbol} at ${formatMoney(latest.price, currency)} on ${latest.date}.`,
      supportingFacts: recentTrades
        .slice(0, 4)
        .map((t) => `${t.date}: ${t.side} ${t.quantity} ${t.symbol} @ ${formatMoney(t.price, currency)}`),
      metricsReferenced: ["Trade History", "Holdings Count"]
    };
  }

  return {
    answer: `Your portfolio currently holds ${plural(summary.holdingsCount, "open position")} valued at ${formatMoney(summary.totalPortfolioValue, currency)} with a composite risk score of ${risk.riskScore}/100 (${risk.riskLevel} tier). Annualized volatility is ${risk.annualizedVolatilityPct.toFixed(2)}%, maximum drawdown is ${risk.maxDrawdownPct.toFixed(2)}%, and top concentration is ${risk.concentrationRiskPct.toFixed(2)}%.`,
    supportingFacts: [
      `Total P&L: ${formatMoney(summary.totalPnl, currency)} (${formatMoney(summary.realizedPnl, currency)} realized, ${formatMoney(summary.unrealizedPnl, currency)} unrealized).`,
      `Risk score: ${risk.riskScore}/100 (${risk.riskLevel}) | Sharpe: ${risk.sharpeRatio.toFixed(2)} | VaR 95%: ${risk.valueAtRisk95Pct.toFixed(2)}%.`,
      `Alerts configured: ${alerts.length} (${alerts.filter((a) => a.status === "BREACHED").length} breached).`
    ],
    metricsReferenced: ["Risk Score", "Volatility", "Max Drawdown", "Concentration Risk"]
  };
}

const GEMINI_QA_SYSTEM_INSTRUCTION = `You are a friendly, clear, and strictly factual portfolio assistant for RiskLens.
You help everyday investors understand:
- Both their own portfolio numbers (using ONLY the anonymized JSON provided) AND
- General portfolio/risk concepts (e.g., "what is a risk score", "what is Sharpe ratio", "how does drawdown work") in warm, jargon-free English, connecting the concept to their current figure when relevant.

STYLE & FORMATTING RULES:
1. Write natural, conversational, easy-to-read English (2–4 clear sentences in "answer").
2. NEVER expose raw JSON field names like "riskScore", "annualizedVolatilityPct", or "maxDrawdownPct" in "answer", "supportingFacts", or "metricsReferenced". Always use human labels like "Risk Score", "Annualized Volatility", "Max Drawdown", "Concentration Risk".
3. Do NOT repeat the exact same sentence in "supportingFacts"—keep "supportingFacts" to 0–3 genuinely distinct extra details (and leave it empty [] for greetings or pure conceptual definitions).

MANDATORY GLOBAL COMPLIANCE RULES:
1. NEVER provide investment, financial, trading, tax, or legal advice.
2. NEVER recommend buying, selling, holding, trimming, adding, or rebalancing any asset. Do NOT use phrases like "you should buy", "you should sell", "I recommend buying/selling", or "we recommend". Do NOT suggest trade actions even when explaining a metric.
3. NEVER predict future prices, returns, or market conditions. Do NOT say a stock or portfolio "will rise", "will fall", "will outperform", etc.
4. ONLY cite portfolio numbers, dates, trades, snapshots, or holdings that actually appear in the provided JSON. If snapshot history is limited (< 2 snapshots), note that clearly without guessing.
5. LANGUAGE CONSTRAINT: Use factual, educational, past-tense, or present-state descriptions only. It is acceptable to say "historically", "as of your last snapshot", or "based on recorded trades" — but never phrase anything as an action recommendation to the user.`;

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
  history: QaHistoryTurn[] = [],
  requestId?: string
): Promise<GeminiQaOutcome> {
  if (!env.GEMINI_API_KEY) {
    return { ok: false, reason: "missing_api_key" };
  }

  if (Date.now() < geminiCooldownUntil && geminiCooldownReason) {
    return { ok: false, reason: geminiCooldownReason, detail: "Cooldown active after recent provider limit/error" };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
  const isGemini25 = /gemini-2\.5/i.test(env.GEMINI_MODEL);
  const recentHistoryText =
    history.length > 0
      ? `\nRecent conversation context:\n${history
          .slice(-4)
          .map((turn) => `User: ${sanitizeQuestionInput(turn.question)}\nAssistant: ${sanitizeQuestionInput(turn.answer)}`)
          .join("\n")}\n`
      : "";

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
                text: `${recentHistoryText}Current user question: ${question}\n\nAnonymized portfolio data (currency: ${context.baseCurrency}):\n${JSON.stringify(context)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          ...(isGemini25 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          responseMimeType: "application/json",
          responseSchema: GEMINI_QA_SCHEMA
        }
      }),
      signal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS)
    });

    if (response.status === 429) {
      const errorText = await response.text().catch(() => "");
      geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
      geminiCooldownReason = "quota_exceeded";
      return { ok: false, reason: "quota_exceeded", detail: errorText.slice(0, 200) };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const isQuota = /RESOURCE_EXHAUSTED|quota/i.test(errorText);
      const isAuthOrBadKey = response.status === 401 || response.status === 403 || /API_KEY_INVALID/i.test(errorText);
      if (isAuthOrBadKey) {
        logger.error({ requestId, status: response.status }, "Gemini API key was rejected by Google; activating fallback cooldown");
      }
      const reason: QaFallbackReason = isQuota ? "quota_exceeded" : "provider_error";
      if (isQuota || isAuthOrBadKey) {
        geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
        geminiCooldownReason = reason;
      }
      return {
        ok: false,
        reason,
        detail: `HTTP ${response.status}: ${errorText.slice(0, 200)}`
      };
    }

    const body = (await response.json()) as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { ok: false, reason: "invalid_output", detail: `Empty candidate (${body.candidates?.[0]?.finishReason ?? "unknown"})` };
    }

    const parsedJson = JSON.parse(stripJsonCodeFences(rawText)) as unknown;
    const validated = geminiQaSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { ok: false, reason: "invalid_output", detail: "Schema validation failed" };
    }

    if (containsAdvisoryResponse(validated.data.answer, validated.data.supportingFacts)) {
      logger.warn({ requestId }, "Gemini Q&A response rejected by non-advisory compliance guardrail; falling back");
      return { ok: false, reason: "invalid_output", detail: "Compliance guardrail triggered" };
    }

    geminiCooldownUntil = 0;
    geminiCooldownReason = null;
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
  requestId?: string,
  history: QaHistoryTurn[] = []
): Promise<PortfolioQaResponse> {
  const trimmed = sanitizeQuestionInput(question);
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

  const outcome = await callGeminiPortfolioQa(trimmed, context, history, requestId);

  if (outcome.ok) {
    return {
      question: trimmed,
      answer: outcome.data.answer,
      supportingFacts: outcome.data.supportingFacts,
      metricsReferenced: Array.from(new Set(outcome.data.metricsReferenced.map(humanizeMetricLabel))),
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
    metricsReferenced: Array.from(new Set(fallback.metricsReferenced.map(humanizeMetricLabel))),
    refused: false,
    source: "deterministic-fallback",
    fallbackReason: outcome.reason,
    model: null,
    answeredAt,
    disclaimer: QA_NON_ADVISORY_DISCLAIMER
  };
}

function qaCacheKey(portfolioId: string, question: string): string {
  const hash = createHash("sha256").update(sanitizeQuestionInput(question).toLowerCase()).digest("hex").slice(0, 16);
  return `portfolio:${portfolioId}:qa:${hash}`;
}

export const portfolioQaService = {
  async ask(
    userId: string,
    portfolioId: string,
    question: string,
    options: { history?: QaHistoryTurn[]; requestId?: string } = {}
  ): Promise<PortfolioQaResponse> {
    const cleanQuestion = sanitizeQuestionInput(question);
    const history = options.history ?? [];
    const cacheKey = qaCacheKey(portfolioId, cleanQuestion);

    if (env.GEMINI_API_KEY && history.length === 0 && !isAdvisoryOrPredictiveQuestion(cleanQuestion)) {
      const cached = await getCache<PortfolioQaResponse>(cacheKey, options.requestId);
      if (cached && cached.source === "gemini") {
        return cached;
      }
    }

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
    const allWithDrawdown = returns.map((point) => {
      if (point.totalValue > runningPeak) runningPeak = point.totalValue;
      const drawdownFromPeakPct = runningPeak > 0 ? Number((((runningPeak - point.totalValue) / runningPeak) * 100).toFixed(2)) : 0;
      return {
        date: point.date,
        totalValue: point.totalValue,
        dailyReturnPct: Number((point.dailyReturn * 100).toFixed(2)),
        drawdownFromPeakPct
      };
    });
    const recentSnapshots = allWithDrawdown.slice(-30);

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

    const result = await generatePortfolioQaResponse(cleanQuestion, context, options.requestId, history);

    if (result.source === "gemini" && history.length === 0) {
      await setCache(cacheKey, result, { ttlSeconds: env.GEMINI_CACHE_TTL_SECONDS });
    }

    await activityService
      .record({
        userId,
        portfolioId,
        type: "PORTFOLIO_QA_ASKED",
        message: result.refused
          ? "Portfolio Q&A declined an advisory request"
          : result.source === "gemini"
            ? "Answered portfolio question via Gemini AI"
            : "Answered portfolio question via built-in assistant",
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
