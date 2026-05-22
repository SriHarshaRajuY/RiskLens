function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const defaultApiUrl = process.env.NODE_ENV === "production" ? "https://risklens-api-qn0e.onrender.com/api/v1" : "http://localhost:5000/api/v1";
const defaultSocketUrl = process.env.NODE_ENV === "production" ? "https://risklens-api-qn0e.onrender.com" : "http://localhost:5000";

export const API_URL = withoutTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl);
export const SOCKET_URL = withoutTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL ?? defaultSocketUrl);
export const CSRF_COOKIE_NAME = "risklens_csrf";
