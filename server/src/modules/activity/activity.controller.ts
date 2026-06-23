import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { activityService } from "./activity.service.js";

export const activityController = {
  async list(req: Request, res: Response): Promise<Response> {
    const requestedLimit = Number(req.query.limit ?? 30);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(Math.floor(requestedLimit), 100) : 30;
    const activity = req.query.portfolioId
      ? await activityService.listForPortfolio(req.user!.id, String(req.query.portfolioId), limit)
      : await activityService.listForUser(req.user!.id, limit);

    return ok(res, activity);
  }
};
