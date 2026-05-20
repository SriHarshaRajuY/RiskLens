import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { authRateLimiter } from "../../middleware/rateLimit.middleware.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimiter, validateBody(registerSchema), asyncHandler(authController.register));
authRoutes.post("/login", authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRoutes.post("/refresh", authRateLimiter, asyncHandler(authController.refresh));
authRoutes.post("/logout", asyncHandler(authController.logout));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
