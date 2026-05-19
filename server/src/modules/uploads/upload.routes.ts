import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { objectIdSchema, portfolioIdParamsSchema } from "../../utils/validation.js";
import { uploadController } from "./upload.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

export const uploadRoutes = Router();

uploadRoutes.use(requireAuth);

uploadRoutes.post(
  "/portfolios/:portfolioId/trades/upload",
  validateParams(portfolioIdParamsSchema),
  upload.single("file"),
  asyncHandler(uploadController.uploadTrades)
);

uploadRoutes.get(
  "/uploads/:uploadJobId",
  validateParams(z.object({ uploadJobId: objectIdSchema })),
  asyncHandler(uploadController.getUploadJob)
);
