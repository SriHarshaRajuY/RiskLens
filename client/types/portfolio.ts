export type Portfolio = {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  baseCurrency: "USD" | "INR";
  isArchived: boolean;
  tradeCount?: number;
  lastTradeDate?: string | null;
  createdAt: string;
  updatedAt: string;
};
