# RiskLens — Portfolio Analytics & Risk Alert Platform

RiskLens is a production-style full-stack SaaS platform for portfolio tracking, trade ingestion, risk analytics, realtime alerts, and operational monitoring.

> Built as a backend-heavy MERN/Next.js TypeScript project to demonstrate scalable product engineering, async processing, caching, observability, security, and applied quantitative analytics.

<!--
  Banner placeholder:
  docs/assets/risklens-banner.png
-->

---

## Badges

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Open Source](https://img.shields.io/badge/open--source-portfolio-blueviolet)

---

## Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Design](#database-design)
- [Authentication & Security](#authentication--security)
- [Performance Optimizations](#performance-optimizations)
- [Scalability Features](#scalability-features)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Future Improvements](#future-improvements)
- [Contributing Guide](#contributing-guide)
- [License](#license)
- [Contact Information](#contact-information)
- [Acknowledgements](#acknowledgements)

---

## About The Project

Investors and analysts often track trades in spreadsheets, then manually calculate holdings, P&L, allocation, drawdowns, and portfolio risk. RiskLens turns that workflow into a live analytics workspace.

Users can create portfolios, add trades manually, upload CSV trade history, monitor holdings and risk metrics, configure alerts, receive realtime notifications, and inspect activity history. The product is intentionally **not** a trading bot, HFT simulator, or profit-prediction system. It is a software engineering project with a credible quantitative analytics layer.

RiskLens is designed for:

| User | Use Case |
| --- | --- |
| Individual investors | Track trades, holdings, P&L, and risk exposure |
| Analysts | Inspect allocation, drawdown, volatility, and historical snapshots |
| Portfolio managers | Configure risk thresholds and operational alerts |
| Engineering reviewers | Evaluate backend architecture, async jobs, caching, security, and observability |

The architecture matters because portfolio analytics is read-heavy, compute-sensitive, and workflow-driven. RiskLens uses a modular monolith, Redis-backed queues, cache-aside analytics, websocket notifications, and structured logging to resemble a real SaaS analytics platform rather than a simple CRUD dashboard.

---

## Key Features

### Authentication

- Secure register, login, logout, refresh, and current-user flows
- HttpOnly cookie-based access and refresh tokens
- Refresh-token session records with rotation and revocation
- Password hashing with bcrypt
- Protected APIs and role-based admin gates
- CSRF protection for unsafe cookie-authenticated requests

### Portfolio Dashboard

- Multi-portfolio workspace
- Portfolio value, realized P&L, unrealized P&L, daily P&L, and allocation
- Holdings table with average cost, current price, market value, and total P&L
- Risk score panel with volatility, Sharpe ratio, drawdown, VaR, and concentration risk
- Professional activity feed and realtime notification panel

### Trade System

- Manual trade CRUD
- Oversell prevention using ledger validation
- Portfolio write locks for safer concurrent mutations
- Paginated trade history
- CSV trade ingestion with row-level validation and partial failure handling

### Async Processing

- BullMQ-powered CSV processing jobs
- Worker-driven alert evaluation
- Daily portfolio snapshot jobs
- Analytics cache warmup jobs
- Retries, exponential backoff, job progress, and worker logs

### Analytics & Quant Layer

- Holdings reconstruction from trade ledger
- Average buy price
- Realized and unrealized P&L
- Daily returns
- Volatility and annualized volatility
- Sharpe ratio
- Max drawdown
- Historical VaR 95
- Concentration risk
- Custom 0-100 risk score
- Buy-and-hold and moving-average crossover backtesting

### Performance

- Redis cache-aside strategy for summary, holdings, risk, returns, and market data
- Cache invalidation after trade writes and CSV imports
- Cache stampede protection for hot analytics keys
- MongoDB compound indexes for ownership-scoped queries
- Background cache warmup after expensive writes

### Security

- Helmet security headers
- CORS allowlist with credential support
- HttpOnly cookies
- CSRF double-submit token
- Zod validation
- Upload size/type validation
- Rate limiting for API and auth routes
- Admin-only metrics endpoint

### Realtime

- Socket.IO authenticated realtime channel
- User-scoped websocket rooms
- Upload progress events
- Alert and notification delivery
- Query invalidation on realtime events

### Admin & Observability

- Request IDs propagated through API logs and worker jobs
- Pino structured logging
- API latency metrics
- Cache hit/miss counters
- Queue job counts
- Upload failure counters
- Websocket connection counts
- Admin metrics endpoint

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, Radix UI primitives, Lucide React |
| Forms | React Hook Form, Zod |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT access tokens, refresh-token sessions, bcrypt, HttpOnly cookies |
| Caching | Redis / Upstash Redis |
| Queues | BullMQ |
| Realtime | Socket.IO |
| Monitoring | Pino logs, request IDs, in-app metrics |
| DevOps | Docker, Docker Compose, Render config, Vercel config |
| Deployment | Vercel frontend, Render/Koyeb/Railway backend, MongoDB Atlas, Upstash Redis |
| Testing | Vitest, Supertest foundation |

---

## System Architecture

RiskLens uses a modular monolith. This keeps deployment simple while preserving clean module boundaries for auth, portfolios, trades, uploads, analytics, alerts, notifications, snapshots, activity, backtests, workers, and metrics.

### High-Level Architecture

```mermaid
flowchart LR
  Client["Next.js Client"] --> API["Express API"]
  Client <-->|"Socket.IO"| Socket["Realtime Gateway"]
  API --> Mongo["MongoDB Atlas"]
  API --> Redis["Redis / Upstash"]
  API --> Queues["BullMQ Queues"]
  Queues --> Workers["Worker Processes"]
  Workers --> Mongo
  Workers --> Redis
  Workers --> Socket
  API --> Market["Market Data Provider"]
```

### Request Lifecycle

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Middleware
  participant R as Route
  participant S as Service
  participant DB as MongoDB
  participant Cache as Redis

  C->>M: HTTP request + cookies + CSRF header
  M->>M: request id, CORS, rate limit, auth, validation
  M->>R: validated request
  R->>S: controller delegates to service
  S->>Cache: cache lookup
  alt cache hit
    Cache-->>S: cached analytics
  else cache miss
    S->>DB: query portfolio data
    S->>Cache: set TTL cache
  end
  S-->>R: typed result
  R-->>C: standard JSON response
```

### Queue Processing Pipeline

```mermaid
sequenceDiagram
  participant UI as Client
  participant API as API
  participant DB as MongoDB
  participant Q as BullMQ
  participant W as CSV Worker
  participant S as Socket.IO

  UI->>API: Upload CSV
  API->>DB: Create UploadJob
  API->>Q: Enqueue file metadata
  API-->>UI: 202 Accepted
  Q->>W: Process CSV
  W->>DB: Validate and batch insert trades
  W->>S: Emit upload.progress
  W->>Q: Enqueue snapshot, warmup, alert jobs
  S-->>UI: Realtime progress update
```

### Realtime Flow

```mermaid
flowchart TD
  Login["Authenticated client"] --> Socket["Socket.IO server"]
  Socket --> Room["user:{userId} room"]
  Worker["Workers"] --> Emit["emitToUser"]
  API["API services"] --> Emit
  Emit --> Room
  Room --> UI["Toasts + TanStack Query invalidation"]
```

### Caching Flow

```mermaid
flowchart LR
  Read["Analytics read"] --> Lookup["Redis lookup"]
  Lookup -->|Hit| Return["Return cached payload"]
  Lookup -->|Miss| Lock["Single-flight compute guard"]
  Lock --> Compute["Mongo + analytics service"]
  Compute --> Store["Set TTL cache"]
  Store --> Return
  Write["Trade write / CSV import"] --> Invalidate["Invalidate portfolio cache"]
```

---

## Folder Structure

```text
risklens-portfolio-analytics/
├── client/
│   ├── app/                    # Next.js App Router routes
│   ├── components/
│   │   ├── activity/           # Activity feed components
│   │   ├── charts/             # Recharts visualizations
│   │   ├── dashboard/          # Dashboard widgets and panels
│   │   ├── forms/              # RHF/Zod form components
│   │   ├── layout/             # App providers and shell
│   │   ├── notifications/      # Notification UI
│   │   ├── portfolio/          # Portfolio detail components
│   │   ├── tables/             # Data-table surfaces
│   │   └── ui/                 # Reusable UI primitives
│   ├── hooks/                  # TanStack Query and realtime hooks
│   ├── lib/                    # API client, auth, socket, utilities
│   └── types/                  # Shared frontend DTO types
│
├── server/
│   ├── src/
│   │   ├── config/             # Environment, database, Redis, logging
│   │   ├── middleware/         # Auth, CSRF, validation, errors, logging
│   │   ├── modules/            # Domain modules
│   │   │   ├── auth/
│   │   │   ├── portfolio/
│   │   │   ├── trades/
│   │   │   ├── uploads/
│   │   │   ├── analytics/
│   │   │   ├── alerts/
│   │   │   ├── notifications/
│   │   │   ├── snapshots/
│   │   │   ├── backtests/
│   │   │   ├── activity/
│   │   │   └── admin/
│   │   ├── queues/             # BullMQ queue producers
│   │   ├── workers/            # BullMQ worker processes
│   │   ├── sockets/            # Socket.IO gateway
│   │   ├── scripts/            # Seed and benchmark scripts
│   │   ├── utils/              # Cache, CSV, locks, risk math, pagination
│   │   └── tests/              # Unit/integration test foundation
│   └── Dockerfile
│
├── docs/
│   └── performance.md          # Real benchmark output
├── .github/workflows/ci.yml    # Build pipeline
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## Installation & Setup

### Prerequisites

| Tool | Recommended Version |
| --- | --- |
| Node.js | 22.x |
| npm | 10.x |
| MongoDB | Atlas or local MongoDB |
| Redis | Upstash Redis or local Redis |
| Git | Latest stable |

### Clone The Repository

```bash
git clone https://github.com/SriHarshaRajuY/RiskLens.git
cd RiskLens
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create server and client environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Fill in MongoDB, Redis, JWT, and market-data configuration values. Never commit real secrets.

### Run Backend API

```bash
npm run dev:server
```

API runs on:

```text
http://localhost:5000
```

### Run Workers

```bash
npm run dev:workers
```

Workers process CSV uploads, alert evaluation, snapshots, and analytics cache warmup.

### Run Frontend

```bash
npm run dev:client
```

Frontend runs on:

```text
http://localhost:3000
```

### Seed Demo Data

```bash
npm run seed
```

### Docker Setup

```bash
docker compose up --build
```

The compose setup starts:

| Service | Port |
| --- | --- |
| Client | 3000 |
| API | 5000 |
| Workers | background process |

### Production Build

```bash
npm run build
```

---

## Environment Variables

### Server `.env.example`

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/risklens?retryWrites=true&w=majority
REDIS_URL=rediss://default:PASSWORD@HOST:6379

JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=15m
JWT_ISSUER=risklens-api
JWT_AUDIENCE=risklens-web
REFRESH_TOKEN_EXPIRES_DAYS=7
COOKIE_SAME_SITE=lax
# COOKIE_DOMAIN=.yourdomain.com

CLIENT_URL=http://localhost:3000
CLIENT_URLS=
SERVER_URL=http://localhost:5000

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=20

MARKET_DATA_PROVIDER=alpha_vantage
ALPHA_VANTAGE_API_KEY=
MARKET_DATA_FALLBACK=demo

CACHE_TTL_SECONDS=45
CSV_BATCH_SIZE=500
```

### Client `.env.example`

```env
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

For production, point `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` at the deployed backend.

---

## API Documentation

All API routes are versioned under:

```text
/api/v1
```

### Standard Response Shape

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": "Optional message"
}
```

### Standard Error Shape

```json
{
  "success": false,
  "code": "INVALID_TRADE_QUANTITY",
  "message": "Quantity must be greater than zero",
  "details": {}
}
```

### Authentication Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create account and set auth cookies |
| POST | `/auth/login` | Authenticate user and create refresh session |
| POST | `/auth/refresh` | Rotate refresh token and issue new access token |
| POST | `/auth/logout` | Revoke session and clear cookies |
| GET | `/auth/me` | Return authenticated user |

Example login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "demo@risklens.dev",
  "password": "risklens123"
}
```

### Portfolio Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/portfolios` | Create portfolio |
| GET | `/portfolios` | List portfolios with pagination/filtering |
| GET | `/portfolios/:portfolioId` | Get portfolio |
| PUT | `/portfolios/:portfolioId` | Update portfolio |
| DELETE | `/portfolios/:portfolioId` | Delete portfolio |

### Trade Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/portfolios/:portfolioId/trades` | Add trade |
| GET | `/portfolios/:portfolioId/trades` | List trades |
| PUT | `/trades/:tradeId` | Update trade |
| DELETE | `/trades/:tradeId` | Delete trade |
| POST | `/portfolios/:portfolioId/trades/upload` | Queue CSV upload |
| GET | `/uploads/:uploadJobId` | Poll upload status |

### Analytics Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/portfolios/:portfolioId/summary` | Portfolio summary |
| GET | `/portfolios/:portfolioId/holdings` | Holdings |
| GET | `/portfolios/:portfolioId/risk` | Risk metrics |
| GET | `/portfolios/:portfolioId/returns` | Return series |
| GET | `/portfolios/:portfolioId/pnl` | P&L series |

### Alert & Notification Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/portfolios/:portfolioId/alerts` | Create alert |
| GET | `/portfolios/:portfolioId/alerts` | List alerts |
| PUT | `/alerts/:alertId` | Update alert |
| DELETE | `/alerts/:alertId` | Delete alert |
| GET | `/notifications` | List notifications |
| PUT | `/notifications/:notificationId/read` | Mark notification read |

### Backtest Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/backtests` | Run backtest |
| GET | `/backtests` | List backtests |
| GET | `/backtests/:backtestId` | Get backtest result |

### Admin Routes

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| GET | `/admin/metrics` | Admin only | API, cache, queue, upload, alert, and websocket metrics |

### Status Codes

| Code | Meaning |
| --- | --- |
| 200 | Successful request |
| 201 | Resource created |
| 202 | Async job accepted |
| 400 | Validation or input error |
| 401 | Authentication required |
| 403 | Authorization or CSRF failure |
| 404 | Resource not found |
| 409 | Conflict, duplicate, or lock timeout |
| 429 | Rate limited |
| 500 | Unexpected server error |

---

## Database Design

RiskLens uses MongoDB with Mongoose schemas, timestamps, ownership relationships, and compound indexes.

| Collection | Purpose | Important Fields |
| --- | --- | --- |
| `users` | Account identity and role | name, email, passwordHash, role |
| `sessions` | Refresh-token sessions | userId, tokenHash, expiresAt, revokedAt |
| `portfolios` | User-owned workspaces | userId, name, baseCurrency, isArchived |
| `trades` | Trade ledger | userId, portfolioId, symbol, side, quantity, price, tradeDate |
| `portfolioSnapshots` | Historical values | portfolioId, totalValue, investedValue, dailyReturn |
| `alerts` | Risk rules | type, threshold, isActive, lastTriggeredAt |
| `notifications` | User notifications | title, message, severity, isRead |
| `activityLogs` | Audit timeline | type, portfolioId, message, metadata |
| `uploadJobs` | CSV ingestion jobs | status, row counts, rowErrors, checksum |
| `cachedAnalyticsMetadata` | Cache observability | cacheKey, metricType, hitCount, missCount |
| `backtestResults` | Strategy results | strategy, metrics, equityCurve |

### Indexing Strategy

| Model | Index |
| --- | --- |
| User | unique email |
| Session | tokenHash unique, userId + expiresAt, TTL on expiresAt |
| Portfolio | userId, userId + createdAt |
| Trade | userId + portfolioId + tradeDate, portfolioId + symbol, portfolioId + idempotencyKey |
| Snapshot | portfolioId + date unique |
| Alert | userId + portfolioId + isActive |
| UploadJob | userId + status + createdAt, portfolioId + createdAt |

---

## Authentication & Security

RiskLens uses a cookie-based authentication model designed for real browser applications.

### Auth Flow

1. User logs in with email and password.
2. Server validates credentials and bcrypt hash.
3. Server issues a short-lived JWT access token in an HttpOnly cookie.
4. Server creates a refresh-token session record and stores only the token hash.
5. Client uses credentialed requests; JavaScript never reads the access token.
6. Expired access tokens are refreshed through `/auth/refresh`.
7. Logout revokes the refresh session and clears cookies.

### Security Controls

| Control | Implementation |
| --- | --- |
| Password security | bcrypt hashing |
| Token storage | HttpOnly cookies |
| Session revocation | refresh-token session model |
| CSRF | double-submit CSRF cookie/header |
| XSS reduction | no localStorage auth token |
| Rate limiting | API and auth-specific limiters |
| Headers | Helmet |
| CORS | explicit allowlist with credentials |
| Validation | Zod request schemas |
| Upload safety | file size, MIME/type, CSV row validation |
| Authorization | ownership checks and admin role gates |

---

## Performance Optimizations

### Backend

- Redis cache-aside strategy for expensive analytics reads
- Cache TTLs for summary, holdings, returns, risk, and market data
- Single-flight guard to reduce cache stampedes
- Cache invalidation after trade mutations and CSV imports
- MongoDB compound indexes for portfolio-scoped queries
- BullMQ workers for long-running ingestion and analytics tasks
- Batch writes for CSV trade imports
- Request compression
- API latency metrics

### Frontend

- Route-based Next.js App Router pages
- TanStack Query cache for server state
- Query invalidation from realtime events
- Loading skeletons and route-level error boundaries
- Responsive dashboard shell with mobile navigation
- Professional chart composition using Recharts

### Benchmark Results

Real local benchmark output is stored in [`docs/performance.md`](docs/performance.md).

| Scenario | Average latency | p95 latency | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Cold cache | 2083.74 ms | 2181.2 ms | 936.46 ms | 20802.94 ms |
| Warm Redis cache | 523.29 ms | 558.53 ms | 484.76 ms | 562.23 ms |

These numbers are from the currently configured local machine and infrastructure. They are not synthetic marketing claims.

---

## Scalability Features

RiskLens is intentionally built as a modular monolith, not premature microservices.

### Why Modular Monolith

- One product domain with tightly related workflows
- Lower operational complexity
- Shared database transactions and ownership checks are simpler
- Modules can be split later if scaling pressure justifies it

### Scale-Ready Design

| Capability | Scalability Benefit |
| --- | --- |
| BullMQ workers | Move long-running work out of request path |
| Redis cache | Reduce repeated analytics computation |
| Worker concurrency | Scale job processors independently |
| Websocket rooms | User-scoped realtime delivery |
| Service boundaries | Easier future extraction into services |
| Request IDs | Easier debugging across API and workers |
| Portfolio write locks | Safer concurrent trade mutation |
| Batch imports | Efficient CSV ingestion |

---

## Screenshots

Screenshots are intentionally left as placeholders until the deployed UI is finalized.

| Screen | Placeholder |
| --- | --- |
| Landing Page | `docs/assets/screenshots/landing.png` |
| Dashboard | `docs/assets/screenshots/dashboard.png` |
| Portfolio Detail | `docs/assets/screenshots/portfolio-detail.png` |
| Alerts | `docs/assets/screenshots/alerts.png` |
| Analytics | `docs/assets/screenshots/analytics.png` |
| Mobile UI | `docs/assets/screenshots/mobile.png` |

---

## Deployment

### Vercel Frontend

1. Set project root to `client` or use the provided Vercel config.
2. Configure environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://your-api.example.com
```

3. Deploy with:

```bash
npm run build --workspace client
```

### Render Backend

Use `render.yaml` for API and worker services.

Required environment variables:

```env
NODE_ENV=production
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
CLIENT_URL=https://your-frontend.vercel.app
CLIENT_URLS=https://preview-one.vercel.app,https://preview-two.vercel.app
MARKET_DATA_PROVIDER=alpha_vantage
ALPHA_VANTAGE_API_KEY=
COOKIE_SAME_SITE=none
```

### Railway / Koyeb

Deploy API and workers as separate services:

| Service | Command |
| --- | --- |
| API | `npm run start --workspace server` |
| Workers | `npm run start:workers --workspace server` |

### AWS Reference Architecture

- CloudFront + S3 or Amplify for frontend
- ECS/Fargate or Elastic Beanstalk for API
- Separate ECS worker service
- MongoDB Atlas for database
- ElastiCache Redis or Upstash Redis
- CloudWatch logs and alarms

### Docker

```bash
docker build -f server/Dockerfile -t risklens-api .
docker build -f client/Dockerfile -t risklens-client .
```

### Nginx

Use Nginx as a reverse proxy for:

- TLS termination
- `/api` proxying
- websocket upgrade headers
- gzip/brotli compression
- static asset caching

---

## CI/CD Pipeline

The repository includes a GitHub Actions workflow at:

```text
.github/workflows/ci.yml
```

Pipeline stages:

1. Checkout repository
2. Setup Node.js 22
3. Install dependencies with `npm ci`
4. Build server workspace
5. Build client workspace

Recommended production additions:

- TypeScript linting
- Docker image build validation
- Dependency vulnerability scan
- Preview deployments for pull requests
- Protected main branch
- Required build checks

---

## Testing

RiskLens includes a foundational test setup using Vitest and Supertest.

```bash
npm test
```

Current coverage focuses on:

- Risk calculations
- Math utilities
- Holdings logic
- Health endpoint integration

Recommended production test expansion:

| Test Type | Target |
| --- | --- |
| Unit tests | risk math, holdings replay, cache utilities, validators |
| Integration tests | auth, ownership checks, trade oversell prevention |
| API tests | portfolio CRUD, trade CRUD, upload polling, alerts |
| Worker tests | CSV partial failures, retries, idempotency |
| E2E tests | login, dashboard, portfolio upload, alert creation |
| Performance tests | summary endpoint cache and cold/warm latency |

---

## Future Improvements

- Cursor pagination for large trade ledgers
- Materialized portfolio positions for faster holdings reads
- OpenTelemetry tracing across API, Redis, MongoDB, queues, and websocket events
- Prometheus/Grafana metrics export
- Sentry error monitoring
- Object storage for large CSV uploads
- CSV import preview and confirmation flow
- Per-user API usage quotas
- Organization/workspace support
- Audit-log export
- Email notification delivery
- More market-data providers with provider failover
- Advanced portfolio attribution
- Playwright E2E suite
- Docker image publishing through GitHub Container Registry

---

## Contributing Guide

Contributions are welcome for architecture, frontend polish, backend performance, observability, documentation, and deployment workflows.

### Local Contribution Workflow

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Install dependencies.

```bash
npm install
```

4. Run the application locally.

```bash
npm run dev:server
npm run dev:workers
npm run dev:client
```

5. Build before opening a pull request.

```bash
npm run build
```

### Pull Request Standards

- Keep changes focused and reviewable.
- Include clear screenshots for UI changes.
- Explain architecture changes in the PR description.
- Do not commit secrets, `.env` files, build output, or generated local data.
- Preserve TypeScript strictness.

---

## License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for details.

---

## Contact Information

**Maintainer:** Sri Harsha Raju Y  
**GitHub:** [SriHarshaRajuY](https://github.com/SriHarshaRajuY)  
**Repository:** [RiskLens](https://github.com/SriHarshaRajuY/RiskLens)

---

## Acknowledgements

- MongoDB, Express, React, Node.js, and Next.js communities
- BullMQ and Redis ecosystem
- Recharts and TanStack Query maintainers
- Open-source maintainers who make production-grade portfolio projects possible

---

## Engineering Positioning

RiskLens is designed to demonstrate the kind of engineering depth expected in strong SDE internship projects:

- scalable backend architecture
- secure authentication
- async job processing
- database modeling and indexing
- Redis caching
- realtime systems
- frontend product polish
- quant-flavored analytics
- performance benchmarking
- deployment readiness

It is intentionally built as a serious SaaS analytics product, not a beginner CRUD app and not a trading bot.
