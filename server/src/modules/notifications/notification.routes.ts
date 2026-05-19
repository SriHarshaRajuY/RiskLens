import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { objectIdSchema } from "../../utils/validation.js";
import { notificationController } from "./notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

notificationRoutes.get("/", asyncHandler(notificationController.list));
notificationRoutes.put(
  "/:notificationId/read",
  validateParams(z.object({ notificationId: objectIdSchema })),
  asyncHandler(notificationController.markRead)
);
