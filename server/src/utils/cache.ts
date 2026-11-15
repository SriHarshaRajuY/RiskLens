import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getRedis, isRedisReady } from "../config/redis.js";
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
  if (!isRedisReady()) {
    return null;
  }

  try {
    const redis = getRedis();
    const raw = await Promise.race([
      redis.get(key),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Redis get timeout")), 2000))
    ]);
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
  } catch (error) {
    logger.warn({ requestId, cacheKey: key, error: error instanceof Error ? error.message : String(error) }, "Cache lookup failed, proceeding without cache");
    return null;
  }
}

export async function setCache<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
  if (!isRedisReady()) {
    return;
  }

  try {
    const ttlSeconds = options?.ttlSeconds ?? env.CACHE_TTL_SECONDS;
    const redis = getRedis();

    await Promise.race([
      redis.set(key, JSON.stringify(value), "EX", ttlSeconds),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Redis set timeout")), 2000))
    ]);

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
      ).catch(() => undefined);
    }
  } catch (error) {
    logger.warn({ cacheKey: key, error: error instanceof Error ? error.message : String(error) }, "Cache set failed, skipping write");
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
  if (!isRedisReady()) {
    return 0;
  }

  try {
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
  } catch (error) {
    logger.warn({ requestId, pattern, error: error instanceof Error ? error.message : String(error) }, "Cache invalidation by pattern failed, skipping");
    return 0;
  }
}

export function portfolioCacheKey(portfolioId: string, metric: "summary" | "holdings" | "risk" | "returns"): string {
  return `portfolio:${portfolioId}:${metric}`;
}

export async function invalidatePortfolioCache(portfolioId: string, requestId?: string): Promise<void> {
  await deleteByPattern(`portfolio:${portfolioId}:*`, requestId);
}
