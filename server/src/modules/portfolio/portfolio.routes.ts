import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { portfolioController } from "./portfolio.controller.js";
import { createPortfolioSchema, portfolioParamsSchema, updatePortfolioSchema } from "./portfolio.validation.js";

export const portfolioRoutes = Router();

portfolioRoutes.use(requireAuth);

portfolioRoutes.post("/", validateBody(createPortfolioSchema), asyncHandler(portfolioController.create));
portfolioRoutes.get("/", asyncHandler(portfolioController.list));
portfolioRoutes.get("/:portfolioId", validateParams(portfolioParamsSchema), asyncHandler(portfolioController.get));
portfolioRoutes.put(
  "/:portfolioId",
  validateParams(portfolioParamsSchema),
  validateBody(updatePortfolioSchema),
  asyncHandler(portfolioController.update)
);
portfolioRoutes.delete("/:portfolioId", validateParams(portfolioParamsSchema), asyncHandler(portfolioController.remove));
