# Performance Benchmark

Run the benchmark script to generate latency and throughput metrics for your local machine or deployed environment.

```bash
npm run benchmark:summary
```

The benchmark will output the following metrics:
- Average latency
- p95 latency
- Min and Max latency

Notes:
- Cold-cache measurements clear the summary cache key before every request.
- Warm-cache measurements reuse the Redis cache populated by the first warm request.
