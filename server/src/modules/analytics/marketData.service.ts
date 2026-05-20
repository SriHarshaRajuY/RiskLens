import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getCache, setCache } from "../../utils/cache.js";
import { addDays, toDateOnlyString } from "../../utils/date.js";
import { round } from "../../utils/math.js";

export type PricePoint = {
  date: string;
  close: number;
};

function symbolSeed(symbol: string): number {
  return symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function demoPrice(symbol: string, date = new Date()): number {
  const seed = symbolSeed(symbol);
  const day = Math.floor(date.getTime() / 86400000);
  const wave = Math.sin((day + seed) / 11) * 8 + Math.cos((day + seed) / 29) * 4;
  return round(80 + (seed % 240) + wave, 2);
}

function demoHistory(symbol: string, startDate: Date, endDate: Date): PricePoint[] {
  const points: PricePoint[] = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) continue;
    points.push({
      date: toDateOnlyString(cursor),
      close: demoPrice(symbol, cursor)
    });
  }
  return points;
}

async function fetchAlphaVantageDaily(symbol: string): Promise<PricePoint[]> {
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", env.ALPHA_VANTAGE_API_KEY);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with ${response.status}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const series = json["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;

  if (!series) {
    throw new Error("Alpha Vantage response did not include daily prices");
  }

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      close: Number(values["4. close"])
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const marketDataService = {
  async getHistoricalPrices(symbol: string, startDate: Date, endDate: Date, requestId?: string): Promise<PricePoint[]> {
    const normalized = symbol.toUpperCase();
    const cacheKey = `market:${normalized}:daily`;
    const cached = await getCache<PricePoint[]>(cacheKey, requestId);

    let allPrices = cached;
    if (!allPrices) {
      try {
        if (env.MARKET_DATA_PROVIDER !== "alpha_vantage" || !env.ALPHA_VANTAGE_API_KEY) {
          throw new Error("Alpha Vantage is not configured");
        }
        allPrices = await fetchAlphaVantageDaily(normalized);
        await setCache(cacheKey, allPrices, { ttlSeconds: 60 * 60 * 12, requestId });
      } catch (error) {
        logger.warn(
          { requestId, symbol: normalized, error },
          "Market data provider failed; using deterministic demo prices"
        );
        allPrices = demoHistory(normalized, addDays(new Date(), -420), new Date());
        await setCache(cacheKey, allPrices, { ttlSeconds: 60 * 15, requestId });
      }
    }

    const start = toDateOnlyString(startDate);
    const end = toDateOnlyString(endDate);
    const filtered = allPrices.filter((point) => point.date >= start && point.date <= end);

    if (filtered.length === 0 && env.MARKET_DATA_FALLBACK === "demo") {
      return demoHistory(normalized, startDate, endDate);
    }

    return filtered;
  },

  async getLatestPrice(symbol: string, requestId?: string): Promise<number> {
    const history = await this.getHistoricalPrices(symbol, addDays(new Date(), -10), new Date(), requestId);
    return history.at(-1)?.close ?? demoPrice(symbol);
  },

  async getLatestPrices(symbols: string[], requestId?: string): Promise<Record<string, number>> {
    const unique = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];
    const entries: Array<readonly [string, number]> = [];

    for (const symbol of unique) {
      entries.push([symbol, await this.getLatestPrice(symbol, requestId)] as const);
    }

    return Object.fromEntries(entries);
  }
};
