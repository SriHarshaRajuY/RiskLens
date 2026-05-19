export type BacktestResult = {
  _id: string;
  symbol: string;
  strategy: "BUY_AND_HOLD" | "MOVING_AVERAGE_CROSSOVER";
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  numberOfTrades: number;
  winRate: number;
  equityCurve: Array<{ date: string; value: number }>;
  createdAt: string;
};
