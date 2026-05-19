import type { Request, Response } from "express";
import { ok } from "../../utils/apiResponse.js";
import { adminService } from "./admin.service.js";

export const adminController = {
  async metrics(_req: Request, res: Response): Promise<Response> {
    const metrics = await adminService.metrics();
    return ok(res, metrics);
  }
};
