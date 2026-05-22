import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { requestParam } from "../../utils/request.js";
import { notificationService } from "./notification.service.js";

export const notificationController = {
  async list(req: Request, res: Response): Promise<Response> {
    const notifications = await notificationService.list(req.user!.id, {
      isRead: req.query.isRead ? String(req.query.isRead) === "true" : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      portfolioId: req.query.portfolioId ? String(req.query.portfolioId) : undefined
    });
    return ok(res, notifications);
  },

  async markRead(req: Request, res: Response): Promise<Response> {
    const notification = await notificationService.markRead(req.user!.id, requestParam(req, "notificationId"));
    return ok(res, notification);
  }
};
