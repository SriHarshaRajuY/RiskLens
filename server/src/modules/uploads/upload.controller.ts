import type { Request, Response } from "express";
import { accepted, ok } from "../../utils/apiResponse.js";
import { getPagination } from "../../utils/pagination.js";
import { requestParam } from "../../utils/request.js";
import { uploadService } from "./upload.service.js";

export const uploadController = {
  async uploadTrades(req: Request, res: Response): Promise<Response> {
    const uploadJob = await uploadService.startCsvUpload({
      userId: req.user!.id,
      portfolioId: requestParam(req, "portfolioId"),
      file: req.file,
      requestId: req.requestId
    });
    return accepted(res, uploadJob);
  },

  async getUploadJob(req: Request, res: Response): Promise<Response> {
    const uploadJob = await uploadService.getUploadJob(req.user!.id, requestParam(req, "uploadJobId"));
    return ok(res, uploadJob);
  },

  async listUploadJobs(req: Request, res: Response): Promise<Response> {
    const result = await uploadService.listUploadJobs(req.user!.id, getPagination(req), {
      portfolioId: req.query.portfolioId ? String(req.query.portfolioId) : undefined,
      status: req.query.status ? String(req.query.status) : undefined
    });
    return ok(res, result.items, result.meta);
  }
};
