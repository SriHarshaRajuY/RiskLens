import type { Request, Response } from "express";
import { created, ok } from "../../utils/apiResponse.js";
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, cookieValue, ensureCsrfCookie, setAuthCookies } from "../../utils/cookies.js";
import { authService } from "./auth.service.js";

function requestMeta(req: Request): { userAgent?: string; ipAddress?: string } {
  return {
    userAgent: req.header("user-agent"),
    ipAddress: req.ip
  };
}

function authResponse(res: Response, payload: Awaited<ReturnType<typeof authService.login>>) {
  const csrfToken = setAuthCookies(res, payload.accessToken, payload.refreshToken);
  return { user: payload.user, csrfToken };
}

export const authController = {
  async register(req: Request, res: Response): Promise<Response> {
    const result = await authService.register(req.body, req.requestId, requestMeta(req));
    return created(res, authResponse(res, result));
  },

  async login(req: Request, res: Response): Promise<Response> {
    const result = await authService.login(req.body, req.requestId, requestMeta(req));
    return ok(res, authResponse(res, result));
  },

  async refresh(req: Request, res: Response): Promise<Response> {
    const result = await authService.refresh(cookieValue(req, REFRESH_TOKEN_COOKIE), req.requestId, requestMeta(req));
    return ok(res, authResponse(res, result));
  },

  async logout(req: Request, res: Response): Promise<Response> {
    await authService.logout(cookieValue(req, REFRESH_TOKEN_COOKIE));
    clearAuthCookies(res);
    return ok(res, { loggedOut: true });
  },

  async me(req: Request, res: Response): Promise<Response> {
    const user = await authService.me(req.user!.id);
    const csrfToken = ensureCsrfCookie(res);
    return ok(res, { user, csrfToken });
  }
};
