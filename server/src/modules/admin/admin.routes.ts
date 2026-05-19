import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { adminController } from "./admin.controller.js";

export const adminRoutes = Router();

adminRoutes.get("/metrics", requireAuth, asyncHandler(adminController.metrics));
