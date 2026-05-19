import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { activityService } from "./activity.service.js";

export const activityController = {
  async list(req: Request, res: Response): Promise<Response> {
    const limit = Math.min(Number(req.query.limit ?? 30), 100);
    const activity = req.query.portfolioId
      ? await activityService.listForPortfolio(req.user!.id, String(req.query.portfolioId), limit)
      : await activityService.listForUser(req.user!.id, limit);

    return ok(res, activity);
  }
};
