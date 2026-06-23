# Load Testing

No load-test results have been generated in this checkout yet.

Run:

```bash
npm run loadtest:summary
```

Default target:

```text
http://localhost:5000/health
```

Useful options:

```bash
LOADTEST_URL=http://localhost:5000/health LOADTEST_DURATION_SECONDS=20 LOADTEST_CONCURRENCY=10 npm run loadtest:summary
```

For authenticated endpoints, provide headers manually:

```bash
LOADTEST_URL=http://localhost:5000/api/v1/portfolios/<portfolioId>/summary LOADTEST_HEADERS_JSON='{"authorization":"Bearer <token>"}' npm run loadtest:summary
```

The script overwrites this file with real request count, latency, p95, throughput, and error-rate metrics when it runs. Do not add manual or estimated numbers here.
