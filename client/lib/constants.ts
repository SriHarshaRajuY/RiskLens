function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const API_URL = withoutTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1");
export const SOCKET_URL = withoutTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000");
export const CSRF_COOKIE_NAME = "risklens_csrf";
