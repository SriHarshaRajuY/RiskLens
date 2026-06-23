import type { Request, Response } from "express";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "RiskLens API",
    version: "0.1.0",
    description:
      "REST API for portfolio workspaces, trade ingestion, analytics, risk alerts, notifications, backtests, and operational metrics."
  },
  servers: [
    { url: "http://localhost:5000/api/v1", description: "Local API" },
    { url: "https://risklens-api-qn0e.onrender.com/api/v1", description: "Deployed Render API" }
  ],
  tags: [
    { name: "Auth" },
    { name: "Portfolios" },
    { name: "Trades" },
    { name: "Uploads" },
    { name: "Analytics" },
    { name: "Alerts" },
    { name: "Notifications" },
    { name: "Backtests" },
    { name: "Admin" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "risklens_access_token" }
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Request validation failed" },
          code: { type: "string", example: "VALIDATION_ERROR" },
          requestId: { type: "string", example: "0f6f9d8e-7a6b-4d21-9dc2-3c6a9a1e4c11" }
        }
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Sri Harsha" },
          email: { type: "string", example: "user@example.com" },
          role: { type: "string", enum: ["USER", "ADMIN"] }
        }
      },
      Portfolio: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Long-Term Portfolio" },
          description: { type: "string", example: "Core holdings and risk alerts" },
          baseCurrency: { type: "string", enum: ["USD", "INR"] }
        }
      },
      Trade: {
        type: "object",
        properties: {
          _id: { type: "string" },
          symbol: { type: "string", example: "AAPL" },
          side: { type: "string", enum: ["BUY", "SELL"] },
          quantity: { type: "number", example: 10 },
          price: { type: "number", example: 180.5 },
          fees: { type: "number", example: 1 },
          tradeDate: { type: "string", format: "date-time" }
        }
      },
      Alert: {
        type: "object",
        properties: {
          _id: { type: "string" },
          type: { type: "string", enum: ["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"] },
          threshold: { type: "number", example: 25 },
          isActive: { type: "boolean", example: true }
        }
      },
      BacktestRequest: {
        type: "object",
        required: ["symbol", "strategy", "startDate", "endDate", "initialCapital"],
        properties: {
          symbol: { type: "string", example: "AAPL" },
          strategy: { type: "string", enum: ["BUY_AND_HOLD", "MOVING_AVERAGE_CROSSOVER"] },
          startDate: { type: "string", format: "date", example: "2024-01-01" },
          endDate: { type: "string", format: "date", example: "2025-01-01" },
          initialCapital: { type: "number", example: 10000 },
          shortWindow: { type: "integer", example: 20 },
          longWindow: { type: "integer", example: 50 }
        }
      }
    },
    responses: {
      Unauthorized: { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      Forbidden: { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      ValidationError: { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } }
    }
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string", example: "Sri Harsha" }, email: { type: "string", example: "user@example.com" }, password: { type: "string", example: "StrongPassword123!" } } } } } },
        responses: { "201": { description: "User registered" }, "400": { $ref: "#/components/responses/ValidationError" } }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email and password",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", example: "user@example.com" }, password: { type: "string", example: "StrongPassword123!" } } } } } },
        responses: { "200": { description: "Login successful" }, "401": { $ref: "#/components/responses/Unauthorized" } }
      }
    },
    "/auth/me": { get: { tags: ["Auth"], summary: "Get current user", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Current user" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Log out current session", responses: { "200": { description: "Logged out" } } } },
    "/portfolios": {
      get: { tags: ["Portfolios"], summary: "List portfolios", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Portfolio list" } } },
      post: { tags: ["Portfolios"], summary: "Create portfolio", security: [{ bearerAuth: [] }, { cookieAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "baseCurrency"], properties: { name: { type: "string", example: "Long-Term Portfolio" }, description: { type: "string" }, baseCurrency: { type: "string", enum: ["USD", "INR"] } } } } } }, responses: { "201": { description: "Portfolio created" } } }
    },
    "/portfolios/{portfolioId}": {
      get: { tags: ["Portfolios"], summary: "Get portfolio", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Portfolio" } } },
      put: { tags: ["Portfolios"], summary: "Update portfolio", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Portfolio updated" } } },
      delete: { tags: ["Portfolios"], summary: "Delete portfolio", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Portfolio deleted" } } }
    },
    "/portfolios/{portfolioId}/trades": {
      get: { tags: ["Trades"], summary: "List portfolio trades", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", default: 20 } }], responses: { "200": { description: "Trade list" } } },
      post: { tags: ["Trades"], summary: "Create trade", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["symbol", "side", "quantity", "price", "tradeDate"], properties: { symbol: { type: "string", example: "AAPL" }, side: { type: "string", enum: ["BUY", "SELL"] }, quantity: { type: "number", example: 10 }, price: { type: "number", example: 180 }, fees: { type: "number", example: 0 }, tradeDate: { type: "string", format: "date", example: "2025-01-01" } } } } } }, responses: { "201": { description: "Trade created" } } }
    },
    "/trades/{tradeId}": {
      put: { tags: ["Trades"], summary: "Update trade", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "tradeId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Trade updated" } } },
      delete: { tags: ["Trades"], summary: "Delete trade", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "tradeId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Trade deleted" } } }
    },
    "/portfolios/{portfolioId}/trades/upload": { post: { tags: ["Uploads"], summary: "Upload trades CSV", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary", description: "CSV with date,symbol,side,quantity,price,fees columns" } } } } } }, responses: { "202": { description: "Upload job queued" } } } },
    "/uploads": { get: { tags: ["Uploads"], summary: "List upload jobs", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Upload jobs" } } } },
    "/uploads/{uploadJobId}": { get: { tags: ["Uploads"], summary: "Get upload job status", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "uploadJobId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Upload job" } } } },
    "/portfolios/{portfolioId}/summary": { get: { tags: ["Analytics"], summary: "Get portfolio summary", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Portfolio summary" } } } },
    "/portfolios/{portfolioId}/holdings": { get: { tags: ["Analytics"], summary: "Get holdings", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Holdings" } } } },
    "/portfolios/{portfolioId}/risk": { get: { tags: ["Analytics"], summary: "Get risk metrics", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Risk metrics" } } } },
    "/portfolios/{portfolioId}/returns": { get: { tags: ["Analytics"], summary: "Get return series", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Returns" } } } },
    "/portfolios/{portfolioId}/alerts": {
      get: { tags: ["Alerts"], summary: "List alerts", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Alerts" } } },
      post: { tags: ["Alerts"], summary: "Create alert", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "portfolioId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "threshold"], properties: { type: { type: "string", enum: ["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"] }, threshold: { type: "number", example: 25 } } } } } }, responses: { "201": { description: "Alert created" } } }
    },
    "/alerts/{alertId}": { put: { tags: ["Alerts"], summary: "Update alert", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "alertId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Alert updated" } } }, delete: { tags: ["Alerts"], summary: "Delete alert", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "alertId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Alert deleted" } } } },
    "/notifications": { get: { tags: ["Notifications"], summary: "List notifications", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Notifications" } } } },
    "/notifications/{notificationId}/read": { put: { tags: ["Notifications"], summary: "Mark notification as read", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ name: "notificationId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Notification updated" } } } },
    "/backtests": { get: { tags: ["Backtests"], summary: "List backtests", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Backtests" } } }, post: { tags: ["Backtests"], summary: "Run backtest", security: [{ bearerAuth: [] }, { cookieAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BacktestRequest" } } } }, responses: { "201": { description: "Backtest result" } } } },
    "/admin/metrics": { get: { tags: ["Admin"], summary: "Runtime API and domain metrics", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Metrics" }, "403": { $ref: "#/components/responses/Forbidden" } } } },
    "/admin/queues": { get: { tags: ["Admin"], summary: "BullMQ queue counts and recent failures", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { "200": { description: "Queue metrics" }, "403": { $ref: "#/components/responses/Forbidden" } } } }
  }
} as const;

export function openApiJson(_req: Request, res: Response): Response {
  return res.status(200).json(openApiDocument);
}

export function apiDocsHtml(_req: Request, res: Response): Response {
  return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RiskLens API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`);
}
