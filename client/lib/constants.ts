function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const defaultApiUrl = process.env.NODE_ENV === "production" ? "https://risklens-api-qn0e.onrender.com/api/v1" : "http://localhost:5000/api/v1";
const defaultSocketUrl = process.env.NODE_ENV === "production" ? "https://risklens-api-qn0e.onrender.com" : "http://localhost:5000";

function isLocalDevelopmentUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(value);
}

function publicUrl(value: string | undefined, fallback: string): string {
  const normalized = withoutTrailingSlash(value?.trim() || fallback);

  if (process.env.NODE_ENV === "production" && (normalized.startsWith("/") || isLocalDevelopmentUrl(normalized))) {
    return fallback;
  }

  return normalized;
}

export const API_URL = publicUrl(process.env.NEXT_PUBLIC_API_URL, defaultApiUrl);
export const SOCKET_URL = publicUrl(process.env.NEXT_PUBLIC_SOCKET_URL, defaultSocketUrl);
export const CSRF_COOKIE_NAME = "risklens_csrf";