# Performance Benchmark

Last generated: 2026-05-22T11:37:24.032Z

Endpoint: `GET /api/v1/portfolios/6a0c36fd5d52e885690fcd17/summary`

Iterations per run: 20

| Scenario | Average latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Cold cache | 839.43 ms | 1245.7 ms | 655.62 ms | 2615.34 ms |
| Warm Redis cache | 390.19 ms | 434.71 ms | 345.64 ms | 445.83 ms |

Notes:

- These values are preserved from the last real local benchmark run.
- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
- The benchmark script now records average, p50, p95, min, and max latency. Re-run `npm run benchmark:summary` to regenerate this file with p50 values.
- Local benchmark results depend on machine, network, database, Redis, dataset size, and market-data cache state. Do not treat them as universal production numbers.
