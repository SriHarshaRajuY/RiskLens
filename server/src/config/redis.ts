import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

function normalizedRedisUrl(): string {
  return env.REDIS_URL.trim().replace(/^redis-cli\s+--tls\s+-u\s+/i, "");
}

function requiresTls(redisUrl: string): boolean {
  return redisUrl.startsWith("rediss://") || /upstash\.io/i.test(redisUrl);
}

export function isRedisReady(client?: Redis | null): boolean {
  const target = client ?? redisClient;
  return target?.status === "ready";
}

export function createRedisConnection(connectionName = "risklens"): Redis {
  const redisUrl = normalizedRedisUrl();
  const client = new Redis(redisUrl, {
    connectionName,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 1000, 15000);
      return delay;
    },
    reconnectOnError(_err) {
      return true;
    },
    ...(requiresTls(redisUrl) ? { tls: {} } : {})
  });

  client.on("connect", () => {
    logger.info({ component: "redis", connectionName }, "Redis connected");
  });

  client.on("ready", () => {
    logger.info({ component: "redis", connectionName }, "Redis ready");
  });

  client.on("error", (error: Error) => {
    logger.warn({ component: "redis", connectionName, error: error.message }, "Redis connection error");
  });

  return client;
}

export function getRedis(): Redis {
  redisClient ??= createRedisConnection("risklens-api");
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}
