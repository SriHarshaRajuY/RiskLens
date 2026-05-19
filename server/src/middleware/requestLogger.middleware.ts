import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { metricsService } from "../modules/metrics/metrics.service.js";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = performance.now();

  res.on("finish", () => {
    const latencyMs = Number((performance.now() - startedAt).toFixed(2));
    const route = req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : req.originalUrl;

    metricsService.recordRequest({
      route,
      method: req.method,
      statusCode: res.statusCode,
      latencyMs,
      timestamp: Date.now()
    });

    logger.info(
      {
        requestId: req.requestId,
        userId: req.user?.id,
        method: req.method,
        route,
        statusCode: res.statusCode,
        latencyMs
      },
      "HTTP request completed"
    );
  });

  next();
}
