import { z } from "zod";
import { objectIdSchema } from "../../utils/validation.js";

export const runBacktestSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .min(1)
      .max(12)
      .regex(/^[A-Za-z][A-Za-z0-9.-]*$/)
      .transform((value) => value.toUpperCase()),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    strategy: z.enum(["BUY_AND_HOLD", "MOVING_AVERAGE_CROSSOVER"]),
    shortWindow: z.coerce.number().int().positive().default(20),
    longWindow: z.coerce.number().int().positive().default(50),
    initialCapital: z.coerce.number().positive().default(10000)
  })
  .refine((input) => input.endDate > input.startDate, {
    path: ["endDate"],
    message: "End date must be after start date"
  })
  .refine((input) => input.longWindow > input.shortWindow, {
    path: ["longWindow"],
    message: "Long window must be greater than short window"
  });

export const backtestParamsSchema = z.object({
  backtestId: objectIdSchema
});

export type RunBacktestInput = z.infer<typeof runBacktestSchema>;
