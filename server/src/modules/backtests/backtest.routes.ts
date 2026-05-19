import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { backtestController } from "./backtest.controller.js";
import { backtestParamsSchema, runBacktestSchema } from "./backtest.validation.js";

export const backtestRoutes = Router();

backtestRoutes.use(requireAuth);

backtestRoutes.post("/", validateBody(runBacktestSchema), asyncHandler(backtestController.run));
backtestRoutes.get("/", asyncHandler(backtestController.list));
backtestRoutes.get("/:backtestId", validateParams(backtestParamsSchema), asyncHandler(backtestController.get));
