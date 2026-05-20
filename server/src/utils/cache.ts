import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getRedis } from "../config/redis.js";
import { CachedAnalyticsMetadata } from "../modules/analytics/cachedAnalyticsMetadata.model.js";
import { metricsService } from "../modules/metrics/metrics.service.js";

type CacheOptions = {
  ttlSeconds?: number;
  portfolioId?: string;
  metricType?: "SUMMARY" | "HOLDINGS" | "RISK" | "RETURNS";
  requestId?: string;
};

const inFlightComputations = new Map<string, Promise<unknown>>();

export async function getCache<T>(key: string, requestId?: string): Promise<T | null> {
  const redis = getRedis();
  const raw = await redis.get(key);
  const hit = Boolean(raw);

  metricsService.increment(hit ? "cacheHits" : "cacheMisses");
  logger.info({ requestId, cacheKey: key, hit }, "Cache lookup");

  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ requestId, cacheKey: key, error }, "Cache payload was malformed and will be evicted");
    await redis.del(key).catch(() => undefined);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
  const ttlSeconds = options?.ttlSeconds ?? env.CACHE_TTL_SECONDS;
  const redis = getRedis();

  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);

  if (options?.portfolioId && options.metricType) {
    const now = new Date();
    await CachedAnalyticsMetadata.findOneAndUpdate(
      { cacheKey: key },
      {
        portfolioId: options.portfolioId,
        cacheKey: key,
        metricType: options.metricType,
        lastComputedAt: now,
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
        $inc: { missCount: 1 }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export async function withCache<T>(key: string, compute: () => Promise<T>, options?: CacheOptions): Promise<T> {
  const cached = await getCache<T>(key, options?.requestId);
  if (cached) {
    if (options?.portfolioId && options.metricType) {
      await CachedAnalyticsMetadata.findOneAndUpdate({ cacheKey: key }, { $inc: { hitCount: 1 } }).catch(() => undefined);
    }
    return cached;
  }

  const existing = inFlightComputations.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = compute()
    .then(async (value) => {
      await setCache(key, value, options);
      return value;
    })
    .finally(() => {
      inFlightComputations.delete(key);
    });

  inFlightComputations.set(key, promise);
  return promise;
}

export async function deleteByPattern(pattern: string, requestId?: string): Promise<number> {
  const redis = getRedis();
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  logger.info({ requestId, pattern, deleted }, "Cache invalidated");
  return deleted;
}

export function portfolioCacheKey(portfolioId: string, metric: "summary" | "holdings" | "risk" | "returns"): string {
  return `portfolio:${portfolioId}:${metric}`;
}

export async function invalidatePortfolioCache(portfolioId: string, requestId?: string): Promise<void> {
  await deleteByPattern(`portfolio:${portfolioId}:*`, requestId);
}
