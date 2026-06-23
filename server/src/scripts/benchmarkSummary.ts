import { writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { app } from "../app.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { closeRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { authService } from "../modules/auth/auth.service.js";
import { deleteByPattern, portfolioCacheKey } from "../utils/cache.js";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
};

type Stats = {
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
};

type BenchmarkContext = {
  baseUrl: string;
  server: Server;
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)] ?? sorted.at(-1) ?? 0;
}

function summarize(values: number[]): Stats {
  if (values.length === 0) {
    throw new Error("No benchmark samples were collected");
  }

  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return {
    averageLatencyMs: Number(average.toFixed(2)),
    p50LatencyMs: Number(percentile(values, 50).toFixed(2)),
    p95LatencyMs: Number(percentile(values, 95).toFixed(2)),
    minLatencyMs: Number(Math.min(...values).toFixed(2)),
    maxLatencyMs: Number(Math.max(...values).toFixed(2))
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { message: String(error) };
}

async function startBenchmarkServer(): Promise<BenchmarkContext> {
  const server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, () => resolve(instance));
    instance.once("error", reject);
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Benchmark server did not return a listening address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server
  };
}

async function stopBenchmarkServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function api<T>(baseUrl: string, pathName: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api/v1${pathName}`, {
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

async function measure(baseUrl: string, pathName: string, token: string, iterations: number, beforeEach?: () => Promise<void>): Promise<Stats> {
  const latencies: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    await beforeEach?.();
    const startedAt = performance.now();
    await api(baseUrl, pathName, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    latencies.push(performance.now() - startedAt);
  }
  return summarize(latencies);
}

async function getBenchmarkAccessToken(): Promise<string> {
  const email = process.env.BENCHMARK_EMAIL ?? "benchmark@risklens.local";
  const password = process.env.BENCHMARK_PASSWORD ?? "RiskLensDemo123!";

  try {
    const auth = await authService.login({ email, password }, "benchmark-summary");
    return auth.accessToken;
  } catch (error) {
    throw new Error(
      `Benchmark login failed for ${email}. Set BENCHMARK_EMAIL and BENCHMARK_PASSWORD for an existing account with portfolio data. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function main(): Promise<void> {
  await connectDb();
  const { baseUrl, server } = await startBenchmarkServer();

  try {
    const accessToken = await getBenchmarkAccessToken();

    const portfolios = await api<ApiResponse<Array<{ _id: string }>>>(baseUrl, "/portfolios?limit=1", {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    const portfolioId = portfolios.data[0]?._id;
    if (!portfolioId) {
      throw new Error("No portfolio found for the benchmark user. Create a portfolio with trades before running the benchmark, or set BENCHMARK_EMAIL and BENCHMARK_PASSWORD for an account that already has portfolio data.");
    }

    const summaryPath = `/portfolios/${portfolioId}/summary`;
    const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? 20);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      throw new Error("BENCHMARK_ITERATIONS must be a positive integer");
    }
    const cold = await measure(baseUrl, summaryPath, accessToken, iterations, async () => {
      await deleteByPattern(portfolioCacheKey(portfolioId, "summary"));
    });
    const warm = await measure(baseUrl, summaryPath, accessToken, iterations);

    const markdown = `# Performance Benchmark

Generated: ${new Date().toISOString()}

Endpoint: \`GET /api/v1/portfolios/${portfolioId}/summary\`

Iterations per run: ${iterations}

| Scenario | Average latency | p50 latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold cache | ${cold.averageLatencyMs} ms | ${cold.p50LatencyMs} ms | ${cold.p95LatencyMs} ms | ${cold.minLatencyMs} ms | ${cold.maxLatencyMs} ms |
| Warm Redis cache | ${warm.averageLatencyMs} ms | ${warm.p50LatencyMs} ms | ${warm.p95LatencyMs} ms | ${warm.minLatencyMs} ms | ${warm.maxLatencyMs} ms |

Notes:

- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
- These are local measurements from the currently configured machine and infrastructure.
- Regenerate this file after changing cache TTLs, analytics code, infrastructure, or dataset size.
`;

    await writeFile(path.resolve(process.cwd(), "..", "docs", "performance.md"), markdown);
    logger.info({ cold, warm }, "Benchmark completed");
  } finally {
    await stopBenchmarkServer(server);
  }
}

main().catch(async (error) => {
  logger.error({ error: serializeError(error) }, "Benchmark failed");
  process.exitCode = 1;
}).finally(async () => {
  await Promise.allSettled([disconnectDb(), closeRedis()]);
});
