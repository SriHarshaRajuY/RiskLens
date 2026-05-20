import type { CookieOptions, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { env, isProduction } from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "risklens_access";
export const REFRESH_TOKEN_COOKIE = "risklens_refresh";
export const CSRF_COOKIE = "risklens_csrf";

export function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function cookieValue(req: Request, name: string): string | undefined {
  return parseCookieHeader(req.headers.cookie)[name];
}

function sameSite(): CookieOptions["sameSite"] {
  if (env.COOKIE_SAME_SITE) return env.COOKIE_SAME_SITE;
  return isProduction ? "none" : "lax";
}

function baseCookieOptions(): CookieOptions {
  return {
    secure: isProduction,
    sameSite: sameSite(),
    domain: env.COOKIE_DOMAIN,
    path: "/"
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): string {
  const csrfToken = randomBytes(32).toString("base64url");

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: 1000 * 60 * 15
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    path: "/api/v1/auth",
    maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_EXPIRES_DAYS
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_EXPIRES_DAYS
  });

  return csrfToken;
}

export function ensureCsrfCookie(res: Response): string {
  const csrfToken = randomBytes(32).toString("base64url");
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_EXPIRES_DAYS
  });
  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  const options = baseCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, path: "/api/v1/auth" });
  res.clearCookie(CSRF_COOKIE, options);
}
