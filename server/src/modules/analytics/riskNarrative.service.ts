import { getCache, portfolioCacheKey, setCache } from "../../utils/cache.js";
import { env } from "../../config/env.js";
import { toObjectId } from "../../utils/objectId.js";
import { Alert } from "../alerts/alert.model.js";
import { analyticsService } from "./analytics.service.js";

export const NON_ADVISORY_DISCLAIMER =
  "Informational recordkeeping only. This summary explains historical portfolio figures and mathematical definitions; it is not financial, investment, tax, or legal advice.";

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
  source: "deterministic";
  generatedAt: string;
  cached: boolean;
  disclaimer: string;
};

export type DeterministicRiskInput = {
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

const ALERT_DISPLAY_NAMES: Record<AlertNarrativeItem["alertType"], string> = {
  DAILY_LOSS: "daily loss",
  MAX_DRAWDOWN: "max drawdown",
  CONCENTRATION: "concentration",
  VOLATILITY: "volatility"
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
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

export function buildDeterministicRiskNarrative(input: DeterministicRiskInput): RiskNarrativePayload {
  const { risk, portfolio, alerts } = input;
  const currency = portfolio.baseCurrency ?? "USD";
  const topHolding = portfolio.topAllocations[0];
  const hasHistory = !risk.insufficientHistory && risk.snapshotCount >= 2;

  const executiveParts: string[] = [
    `Based on ${pluralize(portfolio.tradeCount, "recorded trade")} across ${pluralize(portfolio.holdingsCount, "open holding")}, the portfolio currently carries a composite risk score of ${risk.riskScore}/100 (${risk.riskLevel} tier).`
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
      `Across ${pluralize(risk.snapshotCount, "daily snapshot")}, annualized volatility stands at ${formatPct(risk.annualizedVolatilityPct)} with a historical maximum drawdown of ${formatPct(risk.maxDrawdownPct)}.`
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
        "Standard deviation of daily portfolio returns multiplied by √252, measuring historical day-to-day dispersion on an annualized scale.",
      historicalDriver: hasHistory
        ? `Computed over ${pluralize(risk.snapshotCount, "recorded daily snapshot")}. ${bestDriver}`
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
        ? `Derived empirically from the lower tail of ${pluralize(risk.snapshotCount - 1, "historical daily return interval")}.`
        : "Requires historical daily return observations to estimate the 5th percentile tail."
    },
    {
      metric: "Concentration Risk",
      valueLabel: formatPct(risk.concentrationRiskPct),
      mathematicalMeaning:
        "Percentage of total portfolio market value held in the single largest open position.",
      historicalDriver: topHolding
        ? `Driven by ${topHolding.symbol} representing ${formatPct(topHolding.percent)} of current market value across ${pluralize(portfolio.holdingsCount, "open holding")}.`
        : "No open holdings currently contribute to single-asset concentration."
    }
  ];

  const alertNarratives: AlertNarrativeItem[] = alerts.map((alert) => {
    const label = ALERT_DISPLAY_NAMES[alert.alertType];
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

    const input: DeterministicRiskInput = {
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

    const result: Omit<RiskNarrativeResult, "cached"> = {
      ...buildDeterministicRiskNarrative(input),
      source: "deterministic",
      generatedAt: new Date().toISOString(),
      disclaimer: NON_ADVISORY_DISCLAIMER
    };

    await setCache(cacheKey, result, { ttlSeconds: env.CACHE_TTL_SECONDS });
    return { ...result, cached: false };
  }
};
