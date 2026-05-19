import type { Request, Response } from "express";
import { created, noContent, ok } from "../../utils/apiResponse.js";
import { getPagination } from "../../utils/pagination.js";
import { requestParam } from "../../utils/request.js";
import { portfolioService } from "./portfolio.service.js";

export const portfolioController = {
  async create(req: Request, res: Response): Promise<Response> {
    const portfolio = await portfolioService.create(req.user!.id, req.body);
    return created(res, portfolio);
  },

  async list(req: Request, res: Response): Promise<Response> {
    const pagination = getPagination(req);
    const result = await portfolioService.list(req.user!.id, pagination, {
      search: req.query.search ? String(req.query.search) : undefined,
      isArchived: req.query.isArchived ? String(req.query.isArchived) === "true" : undefined
    });
    return ok(res, result.items, result.meta);
  },

  async get(req: Request, res: Response): Promise<Response> {
    const portfolio = await portfolioService.getOwned(req.user!.id, requestParam(req, "portfolioId"));
    return ok(res, portfolio);
  },

  async update(req: Request, res: Response): Promise<Response> {
    const portfolio = await portfolioService.update(req.user!.id, requestParam(req, "portfolioId"), req.body, req.requestId);
    return ok(res, portfolio);
  },

  async remove(req: Request, res: Response): Promise<Response> {
    await portfolioService.remove(req.user!.id, requestParam(req, "portfolioId"), req.requestId);
    return noContent(res);
  }
};
