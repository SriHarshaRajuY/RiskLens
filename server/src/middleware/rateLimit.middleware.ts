import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { metricsService } from "../modules/metrics/metrics.service.js";

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
}) as unknown as RequestHandler;

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    metricsService.increment("authFailures");
    res.status(429).json({
      success: false,
      code: "AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Please try again later."
    });
  }
}) as unknown as RequestHandler;
