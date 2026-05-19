import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

export function createRedisConnection(connectionName = "risklens"): Redis {
  const client = new Redis(env.REDIS_URL, {
    connectionName,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true
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
