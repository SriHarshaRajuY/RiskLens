import { z } from "zod";
import { objectIdSchema } from "../../utils/validation.js";

const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(12)
  .regex(/^[A-Za-z][A-Za-z0-9.-]*$/, "Symbol must start with a letter and contain only letters, numbers, dots, or dashes")
  .transform((value) => value.toUpperCase());

export const createTradeSchema = z.object({
  symbol: symbolSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  fees: z.coerce.number().min(0).default(0),
  tradeDate: z.coerce.date()
});

export const updateTradeSchema = createTradeSchema.partial();

export const tradeParamsSchema = z.object({
  tradeId: objectIdSchema
});

export const portfolioTradeParamsSchema = z.object({
  portfolioId: objectIdSchema
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
