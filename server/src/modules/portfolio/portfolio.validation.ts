import { z } from "zod";
import { objectIdSchema } from "../../utils/validation.js";

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  baseCurrency: z.enum(["USD", "INR"]).default("USD")
});

export const updatePortfolioSchema = createPortfolioSchema.partial();

export const portfolioParamsSchema = z.object({
  portfolioId: objectIdSchema
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
