import { env } from "../config/env.js";

const LOCAL_CLIENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function isString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

export function normalizeOrigin(origin?: string | null): string | null {
  const trimmed = origin?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function allowedClientOrigins(): string[] {
  const configuredOrigins = env.CLIENT_URLS?.split(",") ?? [];
  const localOrigins = env.NODE_ENV === "production" ? [] : LOCAL_CLIENT_ORIGINS;

  return Array.from(
    new Set([env.CLIENT_URL, ...configuredOrigins, ...localOrigins].map((origin) => normalizeOrigin(origin)).filter(isString))
  );
}

export function isAllowedClientOrigin(origin?: string): boolean {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && allowedClientOrigins().includes(normalizedOrigin));
}
