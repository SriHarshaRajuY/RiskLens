import { Types } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { authService } from "../modules/auth/auth.service.js";
import { User } from "../modules/auth/user.model.js";
import { metricsService } from "../modules/metrics/metrics.service.js";
import { ACCESS_TOKEN_COOKIE, cookieValue } from "../utils/cookies.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : cookieValue(req, ACCESS_TOKEN_COOKIE);

    if (!token) throw unauthorized();

    const payload = authService.verifyToken(token);
    const exists = await User.exists({ _id: payload.sub });
    if (!exists) throw unauthorized("User no longer exists");

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      mongoId: new Types.ObjectId(payload.sub)
    };

    next();
  } catch (error) {
    metricsService.increment("authFailures");
    logger.warn(
      {
        requestId: req.requestId,
        route: req.originalUrl,
        error
      },
      "Authentication failed"
    );
    next(unauthorized("Authentication required"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") {
    next(forbidden("Admin access required"));
    return;
  }
  next();
}
