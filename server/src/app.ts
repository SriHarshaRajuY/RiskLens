import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { alertRoutes } from "./modules/alerts/alert.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { backtestRoutes } from "./modules/backtests/backtest.routes.js";
import { portfolioRoutes } from "./modules/portfolio/portfolio.routes.js";
import { tradeRoutes } from "./modules/trades/trade.routes.js";
import { uploadRoutes } from "./modules/uploads/upload.routes.js";
import { notificationRoutes } from "./modules/notifications/notification.routes.js";
import { activityRoutes } from "./modules/activity/activity.routes.js";
import { apiRateLimiter } from "./middleware/rateLimit.middleware.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware.js";

export const app = express();

app.disable("x-powered-by");

app.use(requestIdMiddleware);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);
app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "risklens-api",
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

const api = express.Router();

api.use("/auth", authRoutes);
api.use("/portfolios", portfolioRoutes);
api.use("/", tradeRoutes);
api.use("/", uploadRoutes);
api.use("/", analyticsRoutes);
api.use("/", alertRoutes);
api.use("/notifications", notificationRoutes);
api.use("/activity", activityRoutes);
api.use("/backtests", backtestRoutes);
api.use("/admin", adminRoutes);

app.use("/api/v1", api);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
