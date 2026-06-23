import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const envPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "server", ".env")].find((candidate) =>
  existsSync(candidate)
);

dotenv.config(envPath ? { path: envPath } : undefined);

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const optionalTrimmedString = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const legacyMarketFallbackValue = (value: unknown): unknown => value === "demo" ? "fallback" : value;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().trim().min(1),
    REDIS_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().min(10),
    JWT_EXPIRES_IN: z.string().trim().default("15m"),
    JWT_ISSUER: z.string().trim().default("risklens-api"),
    JWT_AUDIENCE: z.string().trim().default("risklens-web"),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_DOMAIN: optionalTrimmedString,
    COOKIE_SAME_SITE: z.preprocess(emptyStringToUndefined, z.enum(["lax", "strict", "none"]).optional()),
    CLIENT_URL: z.string().trim().url().default("http://localhost:3000"),
    CLIENT_URLS: optionalTrimmedString,
    SERVER_URL: z.string().trim().url().default("http://localhost:5000"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    MARKET_DATA_PROVIDER: z.preprocess(legacyMarketFallbackValue, z.enum(["alpha_vantage", "fallback"]).default("fallback")),
    ALPHA_VANTAGE_API_KEY: z.string().trim().optional().default(""),
    MARKET_DATA_FALLBACK: z.preprocess(legacyMarketFallbackValue, z.enum(["fallback", "none"]).default("fallback")),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(45),
    CSV_BATCH_SIZE: z.coerce.number().int().positive().default(500)
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be at least 32 characters in production"
      });
    }
  });

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
