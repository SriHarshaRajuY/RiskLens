import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { requestParam } from "../../utils/request.js";
import { analyticsService } from "./analytics.service.js";

export const analyticsController = {
  async summary(req: Request, res: Response): Promise<Response> {
    const data = await analyticsService.summary(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return ok(res, data);
  },

  async holdings(req: Request, res: Response): Promise<Response> {
    const data = await analyticsService.holdings(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return ok(res, data);
  },

  async risk(req: Request, res: Response): Promise<Response> {
    const data = await analyticsService.risk(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return ok(res, data);
  },

  async returns(req: Request, res: Response): Promise<Response> {
    const data = await analyticsService.returns(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return ok(res, data);
  },

  async pnl(req: Request, res: Response): Promise<Response> {
    const data = await analyticsService.pnl(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return ok(res, data);
  }
};
