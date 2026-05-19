import { describe, expect, it } from "vitest";
import { replayTrades, ledgerStats } from "../../modules/analytics/holdings.service.js";

describe("holdings ledger replay", () => {
  it("calculates average cost and realized pnl", () => {
    const trades = [
      { symbol: "AAPL", side: "BUY" as const, quantity: 10, price: 100, fees: 0, tradeDate: new Date("2025-01-01") },
      { symbol: "AAPL", side: "SELL" as const, quantity: 4, price: 120, fees: 0, tradeDate: new Date("2025-01-02") }
    ];

    const [holding] = replayTrades(trades);
    const stats = ledgerStats(trades);

    expect(holding.quantity).toBe(6);
    expect(holding.averageBuyPrice).toBe(100);
    expect(holding.realizedPnl).toBe(80);
    expect(stats.realizedPnl).toBe(80);
  });

  it("rejects overselling", () => {
    expect(() =>
      replayTrades([
        { symbol: "MSFT", side: "SELL" as const, quantity: 1, price: 400, fees: 0, tradeDate: new Date("2025-01-01") }
      ])
    ).toThrow(/exceeds available/);
  });
});
