# Performance Benchmark

Generated: 2026-05-22T11:37:24.032Z

Endpoint: `GET /api/v1/portfolios/6a0c36fd5d52e885690fcd17/summary`

Iterations per run: 20

| Scenario | Average latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Cold cache | 839.43 ms | 1245.7 ms | 655.62 ms | 2615.34 ms |
| Warm Redis cache | 390.19 ms | 434.71 ms | 345.64 ms | 445.83 ms |

Notes:

- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
- These are local measurements from the currently configured machine and infrastructure.
