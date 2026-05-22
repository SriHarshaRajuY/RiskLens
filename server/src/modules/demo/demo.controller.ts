import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { demoService } from "./demo.service.js";

export const demoController = {
  async loadSamplePortfolio(req: Request, res: Response): Promise<Response> {
    const result = await demoService.loadSamplePortfolio(req.user!.id, req.requestId);
    return ok(res, result);
  }
};
