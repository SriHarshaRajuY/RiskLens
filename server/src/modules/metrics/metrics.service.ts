type RequestMetric = {
  route: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: number;
};

type CounterKey =
  | "apiFailures"
  | "authFailures"
  | "failedUploads"
  | "cacheHits"
  | "cacheMisses"
  | "notificationsCreated"
  | "websocketConnections";

const requestMetrics: RequestMetric[] = [];
const counters: Record<CounterKey, number> = {
  apiFailures: 0,
  authFailures: 0,
  failedUploads: 0,
  cacheHits: 0,
  cacheMisses: 0,
  notificationsCreated: 0,
  websocketConnections: 0
};

const MAX_REQUEST_SAMPLES = 1000;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)] ?? 0;
}

export const metricsService = {
  recordRequest(metric: RequestMetric): void {
    requestMetrics.push(metric);
    if (requestMetrics.length > MAX_REQUEST_SAMPLES) {
      requestMetrics.shift();
    }
    if (metric.statusCode >= 500) counters.apiFailures += 1;
  },

  increment(key: CounterKey, amount = 1): void {
    counters[key] += amount;
  },

  snapshot(): Record<string, unknown> {
    const latencies = requestMetrics.map((metric) => metric.latencyMs);
    const totalCacheLookups = counters.cacheHits + counters.cacheMisses;

    return {
      api: {
        sampleSize: requestMetrics.length,
        averageLatencyMs:
          latencies.length === 0 ? 0 : Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2)),
        p95LatencyMs: Number(percentile(latencies, 95).toFixed(2)),
        minLatencyMs: latencies.length === 0 ? 0 : Math.min(...latencies),
        maxLatencyMs: latencies.length === 0 ? 0 : Math.max(...latencies)
      },
      counters,
      cache: {
        hitRatio:
          totalCacheLookups === 0 ? 0 : Number((counters.cacheHits / totalCacheLookups).toFixed(4))
      }
    };
  }
};
