import { round, safeDivide } from "../../utils/math.js";
import { badRequest } from "../../utils/errors.js";
import { marketDataService, type MarketPriceSource } from "./marketData.service.js";

export type TradeLedgerEntry = {
  _id?: unknown;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees?: number;
  tradeDate: Date;
  createdAt?: Date;
};

export type Holding = {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  priceSource: MarketPriceSource;
  marketValue: number;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  allocationPercent: number;
};

export type InternalHolding = {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  lastTradePrice: number;
  realizedPnl: number;
  feesPaid: number;
};

export function applyTradeToState(state: Map<string, InternalHolding>, trade: TradeLedgerEntry): void {
  const symbol = trade.symbol.toUpperCase();
  const fees = trade.fees ?? 0;
  const existing = state.get(symbol) ?? {
    symbol,
    quantity: 0,
    averageBuyPrice: 0,
    lastTradePrice: trade.price,
    realizedPnl: 0,
    feesPaid: 0
  };

  existing.lastTradePrice = trade.price;

  if (trade.side === "BUY") {
    const currentCost = existing.quantity * existing.averageBuyPrice;
    const addedCost = trade.quantity * trade.price + fees;
    const newQuantity = existing.quantity + trade.quantity;
    existing.averageBuyPrice = newQuantity === 0 ? 0 : (currentCost + addedCost) / newQuantity;
    existing.quantity = newQuantity;
    existing.feesPaid += fees;
  } else {
    if (trade.quantity > existing.quantity + 1e-8) {
      throw badRequest("TRADE_OVERSELLS_POSITION", `Sell quantity exceeds available ${symbol} holdings`, {
        symbol,
        sellQuantity: trade.quantity,
        availableQuantity: round(existing.quantity, 4)
      });
    }

    existing.realizedPnl += trade.quantity * (trade.price - existing.averageBuyPrice) - fees;
    existing.quantity -= trade.quantity;
    existing.feesPaid += fees;
    if (existing.quantity <= 1e-8) {
      existing.quantity = 0;
      existing.averageBuyPrice = 0;
    }
  }

  state.set(symbol, existing);
}

export function replayTrades(trades: TradeLedgerEntry[]): InternalHolding[] {
  const state = new Map<string, InternalHolding>();
  const sorted = [...trades].sort((a, b) => {
    const dateDelta = a.tradeDate.getTime() - b.tradeDate.getTime();
    if (dateDelta !== 0) return dateDelta;

    const aCreated = a.createdAt ? a.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
    const bCreated = b.createdAt ? b.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
    if (aCreated !== bCreated) return aCreated - bCreated;

    if (a.side === b.side) return 0;
    return a.side === "BUY" ? -1 : 1;
  });

  for (const trade of sorted) {
    applyTradeToState(state, trade);
  }

  return [...state.values()];
}

export function ledgerStats(trades: TradeLedgerEntry[]): {
  totalInvested: number;
  realizedPnl: number;
  openCostBasis: number;
  symbols: string[];
} {
  const replayed = replayTrades(trades);
  const totalInvested = trades
    .filter((trade) => trade.side === "BUY")
    .reduce((total, trade) => total + trade.quantity * trade.price + (trade.fees ?? 0), 0);

  return {
    totalInvested: round(totalInvested, 2),
    realizedPnl: round(replayed.reduce((total, holding) => total + holding.realizedPnl, 0), 2),
    openCostBasis: round(replayed.reduce((total, holding) => total + holding.quantity * holding.averageBuyPrice, 0), 2),
    symbols: replayed.map((holding) => holding.symbol)
  };
}

export async function buildHoldings(trades: TradeLedgerEntry[], requestId?: string): Promise<Holding[]> {
  const internal = replayTrades(trades).filter((holding) => holding.quantity > 0);
  const prices = await marketDataService.getLatestPriceRecords(
    internal.map((holding) => holding.symbol),
    requestId
  );

  const subtotal = internal.reduce((total, holding) => {
    const currentPrice = prices[holding.symbol]?.price ?? holding.lastTradePrice ?? holding.averageBuyPrice;
    return total + holding.quantity * currentPrice;
  }, 0);

  return internal.map((holding) => {
    const priceRecord = prices[holding.symbol] ?? null;
    const currentPrice = priceRecord?.price ?? holding.lastTradePrice ?? holding.averageBuyPrice;
    const priceSource: MarketPriceSource = priceRecord?.source ?? "last_trade";
    const marketValue = holding.quantity * currentPrice;
    const costBasis = holding.quantity * holding.averageBuyPrice;
    const unrealizedPnl = marketValue - costBasis;

    return {
      symbol: holding.symbol,
      quantity: round(holding.quantity, 4),
      averageBuyPrice: round(holding.averageBuyPrice, 4),
      currentPrice: round(currentPrice, 2),
      priceSource,
      marketValue: round(marketValue, 2),
      costBasis: round(costBasis, 2),
      realizedPnl: round(holding.realizedPnl, 2),
      unrealizedPnl: round(unrealizedPnl, 2),
      totalPnl: round(holding.realizedPnl + unrealizedPnl, 2),
      allocationPercent: round(safeDivide(marketValue, subtotal) * 100, 2)
    };
  });
}
