import type { Request, Response } from "express";
import { created, noContent, ok } from "../../utils/apiResponse.js";
import { getPagination } from "../../utils/pagination.js";
import { requestParam } from "../../utils/request.js";
import { tradeService } from "./trade.service.js";

export const tradeController = {
  async create(req: Request, res: Response): Promise<Response> {
    const trade = await tradeService.create(req.user!.id, requestParam(req, "portfolioId"), req.body, req.requestId);
    return created(res, trade);
  },

  async list(req: Request, res: Response): Promise<Response> {
    const pagination = getPagination(req, { sortBy: "tradeDate" }, ["tradeDate", "createdAt", "symbol", "side", "quantity", "price"]);
    const result = await tradeService.list(req.user!.id, requestParam(req, "portfolioId"), pagination);
    return ok(res, result.items, result.meta);
  },

  async update(req: Request, res: Response): Promise<Response> {
    const trade = await tradeService.update(req.user!.id, requestParam(req, "tradeId"), req.body, req.requestId);
    return ok(res, trade);
  },

  async remove(req: Request, res: Response): Promise<Response> {
    await tradeService.remove(req.user!.id, requestParam(req, "tradeId"), req.requestId);
    return noContent(res);
  }
};
