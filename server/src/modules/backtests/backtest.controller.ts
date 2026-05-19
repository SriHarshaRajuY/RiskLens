import type { Request, Response } from "express";
import { created, ok } from "../../utils/apiResponse.js";
import { requestParam } from "../../utils/request.js";
import { backtestService } from "./backtest.service.js";

export const backtestController = {
  async run(req: Request, res: Response): Promise<Response> {
    const result = await backtestService.run(req.user!.id, req.body, req.requestId);
    return created(res, result);
  },

  async list(req: Request, res: Response): Promise<Response> {
    const results = await backtestService.list(req.user!.id);
    return ok(res, results);
  },

  async get(req: Request, res: Response): Promise<Response> {
    const result = await backtestService.get(req.user!.id, requestParam(req, "backtestId"));
    return ok(res, result);
  }
};
