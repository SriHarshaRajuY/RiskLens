import type { Request, Response } from "express";
import { created, noContent, ok } from "../../utils/apiResponse.js";
import { getPagination } from "../../utils/pagination.js";
import { requestParam } from "../../utils/request.js";
import { alertService } from "./alert.service.js";

export const alertController = {
  async create(req: Request, res: Response): Promise<Response> {
    const alert = await alertService.create(req.user!.id, requestParam(req, "portfolioId"), req.body);
    return created(res, alert);
  },

  async list(req: Request, res: Response): Promise<Response> {
    const pagination = getPagination(req);
    const result = await alertService.list(req.user!.id, requestParam(req, "portfolioId"), pagination);
    return ok(res, result.items, result.meta);
  },

  async update(req: Request, res: Response): Promise<Response> {
    const alert = await alertService.update(req.user!.id, requestParam(req, "alertId"), req.body);
    return ok(res, alert);
  },

  async remove(req: Request, res: Response): Promise<Response> {
    await alertService.remove(req.user!.id, requestParam(req, "alertId"));
    return noContent(res);
  }
};
