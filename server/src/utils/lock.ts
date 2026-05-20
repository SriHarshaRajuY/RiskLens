import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { getRedis } from "../config/redis.js";
import { conflict } from "./errors.js";

type LockOptions = {
  ttlMs?: number;
  waitMs?: number;
  retryEveryMs?: number;
};

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export async function withDistributedLock<T>(key: string, work: () => Promise<T>, options: LockOptions = {}): Promise<T> {
  const redis = getRedis();
  const token = randomUUID();
  const ttlMs = options.ttlMs ?? 30_000;
  const waitMs = options.waitMs ?? 10_000;
  const retryEveryMs = options.retryEveryMs ?? 75;
  const deadline = Date.now() + waitMs;

  while (Date.now() <= deadline) {
    const acquired = await redis.set(key, token, "PX", ttlMs, "NX");
    if (acquired === "OK") {
      try {
        return await work();
      } finally {
        await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token).catch(() => undefined);
      }
    }
    await sleep(retryEveryMs);
  }

  throw conflict("RESOURCE_LOCK_TIMEOUT", "Another operation is updating this portfolio. Please retry shortly.");
}

export function portfolioWriteLockKey(portfolioId: string): string {
  return `lock:portfolio:${portfolioId}:writes`;
}
