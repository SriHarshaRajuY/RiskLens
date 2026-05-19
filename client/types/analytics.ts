export type Holding = {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  allocationPercent: number;
};

export type PortfolioSummary = {
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
