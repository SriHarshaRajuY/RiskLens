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

export function createRedisConnection(connectionName = "risklens"): Redis {
  const redisUrl = normalizedRedisUrl();
  const client = new Redis(redisUrl, {
    connectionName,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    ...(requiresTls(redisUrl) ? { tls: {} } : {})
  });

  client.on("connect", () => {
    logger.info({ component: "redis", connectionName }, "Redis connected");
  });

  client.on("error", (error: Error) => {
    logger.error({ component: "redis", connectionName, error }, "Redis error");
  });

  return client;
}

export function getRedis(): Redis {
  redisClient ??= createRedisConnection("risklens-api");
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
