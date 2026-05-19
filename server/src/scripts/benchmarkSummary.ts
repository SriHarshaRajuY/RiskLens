import { writeFile } from "node:fs/promises";
import path from "node:path";
import { connectDb, disconnectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { closeRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { deleteByPattern, portfolioCacheKey } from "../utils/cache.js";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
};

type Stats = {
  averageLatencyMs: number;
  p95LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
};

function summarize(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted.at(-1) ?? 0;
  return {
    averageLatencyMs: Number(average.toFixed(2)),
    p95LatencyMs: Number(p95.toFixed(2)),
    minLatencyMs: Number(Math.min(...values).toFixed(2)),
    maxLatencyMs: Number(Math.max(...values).toFixed(2))
  };
}

async function api<T>(pathName: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.SERVER_URL}/api/v1${pathName}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function measure(pathName: string, token: string, iterations: number, beforeEach?: () => Promise<void>): Promise<Stats> {
  const latencies: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    await beforeEach?.();
    const startedAt = performance.now();
    await api(pathName, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    latencies.push(performance.now() - startedAt);
  }
  return summarize(latencies);
}

async function main(): Promise<void> {
  await connectDb();

  const login = await api<ApiResponse<{ token: string }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "demo@risklens.dev",
      password: "risklens123"
    })
  });

  const portfolios = await api<ApiResponse<Array<{ _id: string }>>>("/portfolios?limit=1", {
    headers: {
      authorization: `Bearer ${login.data.token}`
    }
  });

  const portfolioId = portfolios.data[0]?._id;
  if (!portfolioId) {
    throw new Error("No portfolio found. Run npm run seed --workspace server first.");
  }

  const summaryPath = `/portfolios/${portfolioId}/summary`;
  const iterations = 20;
  const cold = await measure(summaryPath, login.data.token, iterations, async () => {
    await deleteByPattern(portfolioCacheKey(portfolioId, "summary"));
  });
  const warm = await measure(summaryPath, login.data.token, iterations);

  const markdown = `# Performance Benchmark

Generated: ${new Date().toISOString()}

Endpoint: \`GET /api/v1/portfolios/${portfolioId}/summary\`

Iterations per run: ${iterations}

| Scenario | Average latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Cold cache | ${cold.averageLatencyMs} ms | ${cold.p95LatencyMs} ms | ${cold.minLatencyMs} ms | ${cold.maxLatencyMs} ms |
| Warm Redis cache | ${warm.averageLatencyMs} ms | ${warm.p95LatencyMs} ms | ${warm.minLatencyMs} ms | ${warm.maxLatencyMs} ms |

Notes:

- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
- These are local measurements from the currently configured machine and infrastructure.
`;

  await writeFile(path.resolve(process.cwd(), "..", "docs", "performance.md"), markdown);
  logger.info({ cold, warm }, "Benchmark completed");
  await Promise.allSettled([disconnectDb(), closeRedis()]);
}

main().catch(async (error) => {
  logger.error({ error }, "Benchmark failed");
  await Promise.allSettled([disconnectDb(), closeRedis()]);
  process.exit(1);
});
