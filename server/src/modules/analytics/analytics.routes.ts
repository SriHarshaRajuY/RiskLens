import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { narrativeRateLimiter } from "../../middleware/rateLimit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { portfolioIdParamsSchema } from "../../utils/validation.js";
import { analyticsController } from "./analytics.controller.js";

const riskNarrativeQuerySchema = z.object({
  refresh: z.enum(["true", "false"]).optional()
});

const portfolioQaBodySchema = z.object({
  question: z.string().trim().min(2, "Please enter a question").max(500, "Question must be 500 characters or fewer"),
  history: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        answer: z.string().trim().min(1).max(1600)
      })
    )
    .max(6)
    .optional()
});

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
analyticsRoutes.get(
  "/portfolios/:portfolioId/risk-narrative",
  validateParams(portfolioIdParamsSchema),
  validateQuery(riskNarrativeQuerySchema),
  asyncHandler(analyticsController.riskNarrative)
);
analyticsRoutes.post(
  "/portfolios/:portfolioId/qa",
  narrativeRateLimiter,
  validateParams(portfolioIdParamsSchema),
  validateBody(portfolioQaBodySchema),
  asyncHandler(analyticsController.portfolioQa)
);
