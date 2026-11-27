import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getCache, setCache } from "../../utils/cache.js";
import { addDays, toDateOnlyString } from "../../utils/date.js";
import { badRequest } from "../../utils/errors.js";
import { round } from "../../utils/math.js";

export type MarketPriceSource = "yahoo" | "stooq" | "alpha_vantage" | "last_trade" | "fallback";

export type PricePoint = {
  date: string;
  close: number;
  source: Exclude<MarketPriceSource, "last_trade">;
};

export type LatestPrice = {
  price: number;
  source: Exclude<MarketPriceSource, "last_trade">;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function symbolHash(symbol: string): number {
  return symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function fallbackPrice(symbol: string, date = new Date()): number {
  const hash = symbolHash(symbol);
  const day = Math.floor(date.getTime() / 86400000);
  const wave = Math.sin((day + hash) / 11) * 8 + Math.cos((day + hash) / 29) * 4;
  return round(80 + (hash % 240) + wave, 2);
}

function fallbackHistory(symbol: string, startDate: Date, endDate: Date): PricePoint[] {
  const points: PricePoint[] = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) continue;
    points.push({
      date: toDateOnlyString(cursor),
      close: fallbackPrice(symbol, cursor),
      source: "fallback"
    });
  }
  return points;
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; symbol?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

async function fetchYahooChart(
  symbol: string,
  params: Record<string, string>
): Promise<{ points: PricePoint[]; regularMarketPrice: number | null }> {
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastError: unknown = null;

  for (const host of hosts) {
    try {
      const url = new URL(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(4500)
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned HTTP ${response.status}`);
      }

      const json = (await response.json()) as YahooChartResponse;
      if (json.chart?.error) {
        throw new Error(json.chart.error.description ?? json.chart.error.code ?? "Yahoo Finance chart error");
      }

      const result = json.chart?.result?.[0];
      const timestamps = result?.timestamp ?? [];
      const closes = result?.indicators?.quote?.[0]?.close ?? [];
      const byDate = new Map<string, number>();

      for (let i = 0; i < timestamps.length; i += 1) {
        const ts = timestamps[i];
        const close = closes[i];
        if (typeof ts !== "number" || typeof close !== "number" || !Number.isFinite(close) || close <= 0) {
          continue;
        }
        const date = new Date(ts * 1000).toISOString().slice(0, 10);
        byDate.set(date, round(close, 2));
      }

      const points: PricePoint[] = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, close]) => ({ date, close, source: "yahoo" as const }));

      const regularMarketPrice =
        typeof result?.meta?.regularMarketPrice === "number" &&
        Number.isFinite(result.meta.regularMarketPrice) &&
        result.meta.regularMarketPrice > 0
          ? round(result.meta.regularMarketPrice, 2)
          : null;

      if (points.length === 0 && regularMarketPrice === null) {
        throw new Error("Yahoo Finance response did not include price points");
      }

      return { points, regularMarketPrice };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Yahoo Finance lookup failed");
}

function toStooqSymbol(symbol: string): string {
  const lower = symbol.toLowerCase();
  if (lower.includes(".")) return lower;
  return `${lower}.us`;
}

async function fetchStooqDaily(symbol: string): Promise<PricePoint[]> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(toStooqSymbol(symbol))}&i=d`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(4500)
  });

  if (!response.ok) {
    throw new Error(`Stooq returned HTTP ${response.status}`);
  }

  const csv = await response.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || !lines[0]?.toLowerCase().includes("close")) {
    throw new Error("Stooq returned empty or invalid CSV");
  }

  const points: PricePoint[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i]!.split(",");
    const date = parts[0]?.trim();
    const close = Number(parts[4]);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    points.push({ date, close: round(close, 2), source: "stooq" });
  }

  if (points.length === 0) {
    throw new Error("Stooq did not contain usable daily closes");
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchAlphaVantageDaily(symbol: string): Promise<PricePoint[]> {
  if (!env.ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage is not configured");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", env.ALPHA_VANTAGE_API_KEY);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(3500)
  });
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with ${response.status}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const series = json["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;

  if (!series) {
    throw new Error("Alpha Vantage response did not include daily prices (likely rate-limited)");
  }

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      close: round(Number(values["4. close"]), 2),
      source: "alpha_vantage" as const
    }))
    .filter((point) => Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchLiveHistoryWithCascade(symbol: string, startDate: Date, endDate: Date): Promise<PricePoint[]> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000) + 86400;

  try {
    const yahoo = await fetchYahooChart(symbol, {
      period1: String(period1),
      period2: String(period2),
      interval: "1d"
    });
    if (yahoo.points.length > 0) {
      return yahoo.points;
    }
  } catch {
    // Fall through to secondary real market feeds
  }

  try {
    const stooq = await fetchStooqDaily(symbol);
    const start = toDateOnlyString(startDate);
    const end = toDateOnlyString(endDate);
    const filtered = stooq.filter((p) => p.date >= start && p.date <= end);
    if (filtered.length > 0) return filtered;
  } catch {
    // Fall through to Alpha Vantage
  }

  if (env.ALPHA_VANTAGE_API_KEY) {
    return await fetchAlphaVantageDaily(symbol);
  }

  throw new Error(`No live market history available for ${symbol}`);
}

export const marketDataService = {
  async getHistoricalPrices(symbol: string, startDate: Date, endDate: Date, requestId?: string): Promise<PricePoint[]> {
    const normalized = symbol.toUpperCase();
    const start = toDateOnlyString(startDate);
    const end = toDateOnlyString(endDate);

    if (env.MARKET_DATA_PROVIDER === "fallback") {
      return fallbackHistory(normalized, startDate, endDate);
    }

    const cacheKey = `market:${normalized}:hist:${start}:${end}`;
    const cached = await getCache<PricePoint[]>(cacheKey, requestId);
    if (cached && cached.length > 0) {
      return cached;
    }

    try {
      const points = await fetchLiveHistoryWithCascade(normalized, startDate, endDate);
      const filtered = points.filter((point) => point.date >= start && point.date <= end);
      if (filtered.length > 0) {
        await setCache(cacheKey, filtered, { ttlSeconds: 60 * 60 * 6, requestId });
        return filtered;
      }
      throw new Error(`Empty historical window for ${normalized}`);
    } catch (error) {
      logger.warn(
        { requestId, symbol: normalized, error: error instanceof Error ? error.message : String(error) },
        "Real market historical feed unavailable for backtest/history"
      );
      throw badRequest(
        "MARKET_DATA_UNAVAILABLE",
        `Could not retrieve real market price history for ${normalized}. Check the symbol or try again shortly.`
      );
    }
  },

  async getLatestPriceRecord(symbol: string, requestId?: string): Promise<LatestPrice | null> {
    const normalized = symbol.toUpperCase();

    if (env.MARKET_DATA_PROVIDER === "fallback") {
      return {
        price: fallbackPrice(normalized),
        source: "fallback"
      };
    }

    const cacheKey = `market:${normalized}:latest:v2`;
    const cached = await getCache<LatestPrice>(cacheKey, requestId);
    if (cached && cached.price > 0) {
      return cached;
    }

    try {
      const yahoo = await fetchYahooChart(normalized, { range: "1mo", interval: "1d" });
      const livePrice = yahoo.regularMarketPrice ?? yahoo.points.at(-1)?.close ?? null;
      if (livePrice && livePrice > 0) {
        const record: LatestPrice = { price: livePrice, source: "yahoo" };
        await setCache(cacheKey, record, { ttlSeconds: 60 * 5, requestId });
        return record;
      }
    } catch {
      // Fall through
    }

    try {
      const stooq = await fetchStooqDaily(normalized);
      const latest = stooq.at(-1);
      if (latest && latest.close > 0) {
        const record: LatestPrice = { price: latest.close, source: "stooq" };
        await setCache(cacheKey, record, { ttlSeconds: 60 * 15, requestId });
        return record;
      }
    } catch {
      // Fall through
    }

    try {
      if (env.ALPHA_VANTAGE_API_KEY) {
        const av = await fetchAlphaVantageDaily(normalized);
        const latest = av.at(-1);
        if (latest && latest.close > 0) {
          const record: LatestPrice = { price: latest.close, source: "alpha_vantage" };
          await setCache(cacheKey, record, { ttlSeconds: 60 * 30, requestId });
          return record;
        }
      }
    } catch {
      // Fall through
    }

    logger.warn({ requestId, symbol: normalized }, "All live quote providers failed; returning null for honest last-trade fallback");
    return null;
  },

  async getLatestPrice(symbol: string, requestId?: string): Promise<number | null> {
    return (await this.getLatestPriceRecord(symbol, requestId))?.price ?? null;
  },

  async getLatestPriceRecords(symbols: string[], requestId?: string): Promise<Record<string, LatestPrice | null>> {
    const unique = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];
    const entries = await Promise.all(unique.map(async (symbol) => [symbol, await this.getLatestPriceRecord(symbol, requestId)] as const));

    return Object.fromEntries(entries);
  },

  async getLatestPrices(symbols: string[], requestId?: string): Promise<Record<string, number | null>> {
    const unique = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];
    const entries = await Promise.all(unique.map(async (symbol) => [symbol, await this.getLatestPrice(symbol, requestId)] as const));

    return Object.fromEntries(entries);
  }
};
