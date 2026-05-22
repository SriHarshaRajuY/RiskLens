export const samplePortfolio = {
  name: "US Large-Cap Risk Portfolio",
  description: "Diversified portfolio with technology, financials, energy, and healthcare exposure.",
  baseCurrency: "USD" as const
};

export const sampleTrades = [
  ["2024-01-08", "AAPL", "BUY", 25, 185.4, 1],
  ["2024-01-16", "MSFT", "BUY", 18, 403.1, 1],
  ["2024-02-05", "JPM", "BUY", 20, 172.3, 1],
  ["2024-02-20", "XOM", "BUY", 30, 103.75, 1],
  ["2024-03-04", "GOOGL", "BUY", 22, 136.9, 1],
  ["2024-03-18", "AMZN", "BUY", 16, 174.2, 1],
  ["2024-04-09", "AAPL", "BUY", 15, 172.85, 1],
  ["2024-05-02", "UNH", "BUY", 8, 492.6, 1],
  ["2024-06-17", "NVDA", "BUY", 14, 130.5, 1],
  ["2024-07-10", "MSFT", "BUY", 7, 415.3, 1],
  ["2024-08-05", "NVDA", "BUY", 6, 102.8, 1],
  ["2024-09-12", "GOOGL", "SELL", 6, 158.4, 1],
  ["2024-10-03", "JPM", "BUY", 10, 207.8, 1],
  ["2024-10-21", "AAPL", "SELL", 10, 214.2, 1],
  ["2024-11-11", "AMZN", "BUY", 8, 201.45, 1],
  ["2024-12-06", "XOM", "SELL", 10, 114.9, 1],
  ["2025-01-14", "MSFT", "SELL", 5, 443.5, 1],
  ["2025-02-03", "NVDA", "SELL", 5, 124.7, 1],
  ["2025-03-10", "UNH", "SELL", 3, 521.2, 1],
  ["2025-04-07", "GOOGL", "BUY", 10, 164.3, 1],
  ["2025-05-05", "AMZN", "SELL", 6, 188.6, 1],
  ["2025-06-02", "JPM", "SELL", 8, 221.4, 1]
] as const;

export const sampleAlerts = [
  { type: "CONCENTRATION", threshold: 35 },
  { type: "MAX_DRAWDOWN", threshold: 12 },
  { type: "VOLATILITY", threshold: 25 }
] as const;
