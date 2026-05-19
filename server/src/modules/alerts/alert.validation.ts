import { z } from "zod";
import { objectIdSchema } from "../../utils/validation.js";

export const createAlertSchema = z.object({
  type: z.enum(["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"]),
  threshold: z.coerce.number().positive().max(100),
  isActive: z.boolean().default(true)
});

export const updateAlertSchema = createAlertSchema.partial();

export const alertParamsSchema = z.object({
  alertId: objectIdSchema
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
