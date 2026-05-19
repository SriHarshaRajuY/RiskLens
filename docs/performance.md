# Performance Benchmark

Generated: 2026-05-19T10:55:40.345Z

Endpoint: `GET /api/v1/portfolios/6a0c36fd5d52e885690fcd17/summary`

Iterations per run: 20

| Scenario | Average latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Cold cache | 2083.74 ms | 2181.2 ms | 936.46 ms | 20802.94 ms |
| Warm Redis cache | 523.29 ms | 558.53 ms | 484.76 ms | 562.23 ms |

Notes:

- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
- These are local measurements from the currently configured machine and infrastructure.
