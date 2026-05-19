import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const portfolioIdParamsSchema = z.object({
  portfolioId: objectIdSchema
});

export const idParamsSchema = z.object({
  id: objectIdSchema
});
