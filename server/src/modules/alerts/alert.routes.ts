import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { portfolioIdParamsSchema } from "../../utils/validation.js";
import { alertController } from "./alert.controller.js";
import { alertParamsSchema, createAlertSchema, updateAlertSchema } from "./alert.validation.js";

export const alertRoutes = Router();

alertRoutes.use(requireAuth);

alertRoutes.post(
  "/portfolios/:portfolioId/alerts",
  validateParams(portfolioIdParamsSchema),
  validateBody(createAlertSchema),
  asyncHandler(alertController.create)
);
alertRoutes.get(
  "/portfolios/:portfolioId/alerts",
  validateParams(portfolioIdParamsSchema),
  asyncHandler(alertController.list)
);
alertRoutes.put(
  "/alerts/:alertId",
  validateParams(alertParamsSchema),
  validateBody(updateAlertSchema),
  asyncHandler(alertController.update)
);
alertRoutes.delete("/alerts/:alertId", validateParams(alertParamsSchema), asyncHandler(alertController.remove));
