import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { demoController } from "./demo.controller.js";

export const demoRoutes = Router();

demoRoutes.use(requireAuth);

demoRoutes.post("/sample-portfolio", asyncHandler(demoController.loadSamplePortfolio));
