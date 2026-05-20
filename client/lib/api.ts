import { API_URL, CSRF_COOKIE_NAME } from "@/lib/constants";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
  code?: string;
};

type ApiRequestOptions = RequestInit & {
  rawBody?: BodyInit;
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
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

function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : null;
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  refreshPromise ??= apiRequest<unknown>("/auth/refresh", {
    method: "POST",
    skipAuthRefresh: true
  })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function parsePayload<T>(response: Response): Promise<ApiResponse<T> & { details?: unknown }> {
  const text = await response.text();
  if (!text) {
    return { success: response.ok, data: undefined as T };
  }

  try {
    return JSON.parse(text) as ApiResponse<T> & { details?: unknown };
  } catch {
    return {
      success: false,
      data: undefined as T,
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unreadable response"
    };
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const isForm = options.rawBody instanceof FormData;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  const csrfToken = isUnsafeMethod(method) ? cookieValue(CSRF_COOKIE_NAME) : null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      signal: options.signal ?? controller.signal,
      body: options.rawBody ?? options.body,
      headers: {
        ...(isForm ? {} : { "content-type": "application/json" }),
        "x-request-id": requestId(),
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(options.headers ?? {})
      }
    });

    if (response.status === 401 && !options.skipAuthRefresh && !path.startsWith("/auth/")) {
      await refreshSession();
      return apiRequest<T>(path, { ...options, skipAuthRefresh: true });
    }

    if (response.status === 204) return undefined as T;

    const payload = await parsePayload<T>(response);
    if (!response.ok || payload.success === false) {
      throw new ApiError(response.status, payload.code ?? "API_ERROR", payload.message ?? "Request failed", payload.details);
    }
    return payload.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "REQUEST_TIMEOUT", "The request timed out. Please retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function jsonBody<T>(body: T): string {
  return JSON.stringify(body);
}
