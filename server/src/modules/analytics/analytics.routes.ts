import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { portfolioIdParamsSchema } from "../../utils/validation.js";
import { analyticsController } from "./analytics.controller.js";

export const analyticsRoutes = Router();

analyticsRoutes.use(requireAuth);

analyticsRoutes.get(
  "/portfolios/:portfolioId/summary",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(analyticsController.summary)
);
analyticsRoutes.get(
  "/portfolios/:portfolioId/holdings",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(analyticsController.holdings)
);
analyticsRoutes.get(
  "/portfolios/:portfolioId/risk",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(analyticsController.risk)
);
analyticsRoutes.get(
  "/portfolios/:portfolioId/returns",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(analyticsController.returns)
);
analyticsRoutes.get(
  "/portfolios/:portfolioId/pnl",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(analyticsController.pnl)
);
