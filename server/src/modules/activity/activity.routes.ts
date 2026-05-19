import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { activityController } from "./activity.controller.js";

export const activityRoutes = Router();

activityRoutes.get("/", requireAuth, asyncHandler(activityController.list));
