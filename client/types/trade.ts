export type Trade = {
  _id: string;
  portfolioId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  tradeDate: string;
  source: "MANUAL" | "CSV" | "SEED";
};
