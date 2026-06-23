import { writeFile } from "node:fs/promises";
import path from "node:path";

const targetUrl = process.env.LOADTEST_URL ?? "http://localhost:5000/health";
const durationSeconds = Number(process.env.LOADTEST_DURATION_SECONDS ?? 20);
const concurrency = Number(process.env.LOADTEST_CONCURRENCY ?? 10);
const headers = process.env.LOADTEST_HEADERS_JSON ? JSON.parse(process.env.LOADTEST_HEADERS_JSON) : {};

if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
  throw new Error("LOADTEST_DURATION_SECONDS must be a positive number");
}

if (!Number.isInteger(concurrency) || concurrency <= 0) {
  throw new Error("LOADTEST_CONCURRENCY must be a positive integer");
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)] ?? sorted.at(-1) ?? 0;
}

function summarize(values) {
  if (values.length === 0) {
    return { average: 0, p50: 0, p95: 0, min: 0, max: 0 };
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    average: Number(average.toFixed(2)),
    p50: Number(percentile(values, 50).toFixed(2)),
    p95: Number(percentile(values, 95).toFixed(2)),
    min: Number(Math.min(...values).toFixed(2)),
    max: Number(Math.max(...values).toFixed(2))
  };
}

async function worker(deadline, latencies, failures) {
  while (performance.now() < deadline) {
    const startedAt = performance.now();
    try {
      const response = await fetch(targetUrl, { headers });
      const elapsed = performance.now() - startedAt;
      latencies.push(elapsed);
      if (!response.ok) {
        failures.count += 1;
      }
      await response.arrayBuffer();
    } catch (error) {
      failures.count += 1;
      latencies.push(performance.now() - startedAt);
    }
  }
}

async function main() {
  const startedAt = new Date();
  const latencies = [];
  const failures = { count: 0 };
  const deadline = performance.now() + durationSeconds * 1000;

  await Promise.all(Array.from({ length: concurrency }, () => worker(deadline, latencies, failures)));

  const stats = summarize(latencies);
  const totalRequests = latencies.length;
  const errorRate = totalRequests === 0 ? 0 : Number((failures.count / totalRequests).toFixed(4));
  const requestsPerSecond = Number((totalRequests / durationSeconds).toFixed(2));

  const markdown = `# Load Testing

Generated: ${startedAt.toISOString()}

Target: \`${targetUrl}\`

Duration: ${durationSeconds}s  
Concurrency: ${concurrency}

| Metric | Value |
| --- | ---: |
| Total requests | ${totalRequests} |
| Requests/sec | ${requestsPerSecond} |
| Average latency | ${stats.average} ms |
| p50 latency | ${stats.p50} ms |
| p95 latency | ${stats.p95} ms |
| Min latency | ${stats.min} ms |
| Max latency | ${stats.max} ms |
| Failed requests | ${failures.count} |
| Error rate | ${(errorRate * 100).toFixed(2)}% |

Notes:

- This is a lightweight Node.js load test intended for local and staging checks.
- Default target is \`/health\` so it can run without authentication.
- To test an authenticated endpoint, set \`LOADTEST_URL\` and pass a cookie or bearer token through \`LOADTEST_HEADERS_JSON\`.
- Results depend on local machine, network, free-tier cold starts, and selected endpoint.
`;

  await writeFile(path.resolve(process.cwd(), "docs", "load-testing.md"), markdown);
  console.log(markdown);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
