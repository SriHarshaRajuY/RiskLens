import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { tradeController } from "./trade.controller.js";
import { createTradeSchema, portfolioTradeParamsSchema, tradeParamsSchema, updateTradeSchema } from "./trade.validation.js";

export const tradeRoutes = Router();

tradeRoutes.use(requireAuth);

tradeRoutes.post(
  "/portfolios/:portfolioId/trades",
  validateParams(portfolioTradeParamsSchema),
  validateBody(createTradeSchema),
  asyncHandler(tradeController.create)
);
tradeRoutes.get(
  "/portfolios/:portfolioId/trades",
  validateParams(portfolioTradeParamsSchema),
  asyncHandler(tradeController.list)
);
tradeRoutes.put(
  "/trades/:tradeId",
  validateParams(tradeParamsSchema),
  validateBody(updateTradeSchema),
  asyncHandler(tradeController.update)
);
tradeRoutes.delete("/trades/:tradeId", validateParams(tradeParamsSchema), asyncHandler(tradeController.remove));
