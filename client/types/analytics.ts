export type MarketPriceSource = "yahoo" | "stooq" | "alpha_vantage" | "last_trade" | "fallback";

export type Holding = {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  priceSource?: MarketPriceSource;
  marketValue: number;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  allocationPercent: number;
};

export type PortfolioSummary = {
  baseCurrency?: "USD" | "INR";
  totalPortfolioValue: number;
  totalInvestedAmount: number;
  openCostBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  dailyPnl: number;
  dailyReturn: number;
  holdingsCount: number;
  tradeCount: number;
  bestPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
  worstPerformer: { symbol: string; totalPnl: number; allocationPercent: number } | null;
  allocation: Array<{ symbol: string; value: number; percent: number }>;
};

export type ReturnPoint = {
  date: string;
  totalValue: number;
  investedValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dailyReturn: number;
};

export type RiskMetrics = {
  dailyReturns: number[];
  volatility: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk95: number;
  concentrationRisk: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  insufficientHistory: boolean;
};

export type NarrativeSource = "deterministic";

export type QaSource = "gemini" | "deterministic-fallback" | "guardrail";

export type QaFallbackReason =
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

export type RiskNarrative = {
  executiveSummary: string;
  metricExplanations: MetricNarrativeItem[];
  alertNarratives: AlertNarrativeItem[];
  dataLimitations: string[];
  source: NarrativeSource;
  generatedAt: string;
  cached: boolean;
  disclaimer: string;
};

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
