import { API_URL, AUTH_TOKEN_KEY } from "@/lib/constants";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
  code?: string;
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null; rawBody?: BodyInit } = {}
): Promise<T> {
  const token = options.token ?? getStoredToken();
  const isForm = options.rawBody instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    body: options.rawBody ?? options.body,
    headers: {
      ...(isForm ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as ApiResponse<T> & { details?: unknown };
  if (!response.ok || payload.success === false) {
    throw new ApiError(response.status, payload.code ?? "API_ERROR", payload.message ?? "Request failed", payload.details);
  }
  return payload.data;
}

export function jsonBody<T>(body: T): string {
  return JSON.stringify(body);
}
