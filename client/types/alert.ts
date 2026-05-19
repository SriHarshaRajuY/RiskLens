export type RiskAlert = {
  _id: string;
  portfolioId: string;
  type: "DAILY_LOSS" | "MAX_DRAWDOWN" | "CONCENTRATION" | "VOLATILITY";
  threshold: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
};
