import multer from "multer";
import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { objectIdSchema, portfolioIdParamsSchema } from "../../utils/validation.js";
import { uploadController } from "./upload.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter(_req, file, callback) {
    const validName = file.originalname.toLowerCase().endsWith(".csv");
    const validMime = ["text/csv", "application/csv", "application/vnd.ms-excel", "application/octet-stream"].includes(file.mimetype);
    callback(null, validName && validMime);
  }
});

export const uploadRoutes = Router();

uploadRoutes.use(requireAuth);

uploadRoutes.post(
  "/portfolios/:portfolioId/trades/upload",
  validateParams(portfolioIdParamsSchema),
  upload.single("file") as unknown as RequestHandler,
  asyncHandler(uploadController.uploadTrades)
);

uploadRoutes.get(
  "/uploads/:uploadJobId",
  validateParams(z.object({ uploadJobId: objectIdSchema })),
  asyncHandler(uploadController.getUploadJob)
);
