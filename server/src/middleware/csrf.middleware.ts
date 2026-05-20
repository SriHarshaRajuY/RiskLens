import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE, cookieValue } from "../utils/cookies.js";
import { forbidden } from "../utils/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  const cookieToken = cookieValue(req, CSRF_COOKIE);
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(forbidden("CSRF validation failed"));
    return;
  }

  next();
}
