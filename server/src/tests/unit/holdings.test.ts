import { describe, expect, it, vi } from "vitest";
import { buildHoldings, replayTrades, ledgerStats } from "../../modules/analytics/holdings.service.js";
import { marketDataService } from "../../modules/analytics/marketData.service.js";

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

  it("handles same-day BUY and SELL deterministically when SELL appears first in unsorted input", () => {
    const sameDay = new Date("2026-11-27T00:00:00.000Z");
    const [holding] = replayTrades([
      { symbol: "MSFT", side: "SELL" as const, quantity: 4, price: 520, fees: 0, tradeDate: sameDay },
      { symbol: "MSFT", side: "BUY" as const, quantity: 10, price: 500, fees: 0, tradeDate: sameDay }
    ]);

    expect(holding.quantity).toBe(6);
    expect(holding.averageBuyPrice).toBe(500);
    expect(holding.realizedPnl).toBe(80);
  });

  it("falls back to last recorded trade price instead of fake prices when live quotes are unavailable", async () => {
    const spy = vi.spyOn(marketDataService, "getLatestPriceRecords").mockResolvedValue({ MSFT: null });
    try {
      const [holding] = await buildHoldings([
        { symbol: "MSFT", side: "BUY" as const, quantity: 5, price: 520, fees: 0, tradeDate: new Date("2026-11-26") }
      ]);

      expect(holding.currentPrice).toBe(520);
      expect(holding.priceSource).toBe("last_trade");
      expect(holding.unrealizedPnl).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects overselling", () => {
    expect(() =>
      replayTrades([
        { symbol: "MSFT", side: "SELL" as const, quantity: 1, price: 400, fees: 0, tradeDate: new Date("2025-01-01") }
      ])
    ).toThrow(/exceeds available/);
  });
});
