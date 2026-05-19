import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const envPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "server", ".env")].find((candidate) =>
  existsSync(candidate)
);

dotenv.config(envPath ? { path: envPath } : undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  SERVER_URL: z.string().url().default("http://localhost:5000"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  MARKET_DATA_PROVIDER: z.enum(["alpha_vantage", "demo"]).default("demo"),
  ALPHA_VANTAGE_API_KEY: z.string().optional().default(""),
  MARKET_DATA_FALLBACK: z.enum(["demo", "none"]).default("demo"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(45),
  CSV_BATCH_SIZE: z.coerce.number().int().positive().default(500)
});

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
