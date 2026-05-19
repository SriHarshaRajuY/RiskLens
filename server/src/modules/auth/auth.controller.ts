import type { Request, Response } from "express";
import { created, ok } from "../../utils/apiResponse.js";
import { authService } from "./auth.service.js";

export const authController = {
  async register(req: Request, res: Response): Promise<Response> {
    const result = await authService.register(req.body, req.requestId);
    return created(res, result);
  },

  async login(req: Request, res: Response): Promise<Response> {
    const result = await authService.login(req.body, req.requestId);
    return ok(res, result);
  },

  async me(req: Request, res: Response): Promise<Response> {
    const user = await authService.me(req.user!.id);
    return ok(res, { user });
  }
};
