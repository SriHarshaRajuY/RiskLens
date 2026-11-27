import { API_URL, CSRF_COOKIE_NAME } from "@/lib/constants";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
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

type ValidationDetails = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

let csrfToken: string | null = null;

export function setCsrfToken(token?: string | null): void {
  csrfToken = token ?? null;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function validationDetailMessage(details: unknown): string | null {
  if (!isRecord(details)) return null;

  const validation = details as ValidationDetails;
  const fieldErrors = validation.fieldErrors;
  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0];
      if (message) return `${humanizeFieldName(field)}: ${message}`;
    }
  }

  const formError = validation.formErrors?.[0];
  if (formError) return formError;

  const issue = validation.issues?.find((item) => item.message);
  if (issue?.message) {
    const field = issue.path?.join(".");
    return field ? `${humanizeFieldName(field)}: ${issue.message}` : issue.message;
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    const detail = validationDetailMessage(error.details);
    if (detail) return detail;

    if (error.status === 0 || error.code === "NETWORK_ERROR") {
      return "Unable to reach RiskLens right now. Please check your connection and try again.";
    }
    if (error.status === 408 || error.code === "REQUEST_TIMEOUT") {
      return "That took longer than expected. Please try again in a moment.";
    }
    if (error.code === "INVALID_API_RESPONSE") {
      return "We received an unexpected response. Please try again in a moment.";
    }
    if (error.status === 401) {
      return error.message && !/unauthorized|jwt|token/i.test(error.message)
        ? error.message
        : "Your session has expired. Please sign in again.";
    }
    if (error.status === 403) {
      return "You don't have permission for this action. Refresh the page and try again.";
    }
    if (error.status === 429) {
      return "You're making requests too quickly. Please wait a few seconds and try again.";
    }
    if (error.status >= 500) {
      return "Our service ran into a temporary hiccup. Please try again shortly.";
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    if (/failed to fetch|network|load failed/i.test(error.message)) {
      return "Unable to reach RiskLens right now. Please check your connection and try again.";
    }
    return error.message;
  }
  return fallback;
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
  refreshPromise ??= apiRequest<{ csrfToken?: string }>("/auth/refresh", {
    method: "POST",
    skipAuthRefresh: true
  })
    .then((payload) => {
      setCsrfToken(payload.csrfToken);
    })
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
      message: "We received an unexpected response. Please try again in a moment."
    };
  }
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const method = options.method ?? "GET";
  const isForm = options.rawBody instanceof FormData;
  const hasJsonBody = !isForm && Boolean(options.body);
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  const unsafeRequestCsrfToken = isUnsafeMethod(method) ? csrfToken ?? cookieValue(CSRF_COOKIE_NAME) : null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      signal: options.signal ?? controller.signal,
      body: options.rawBody ?? options.body,
      headers: {
        ...(hasJsonBody ? { "content-type": "application/json" } : {}),
        "x-request-id": requestId(),
        ...(unsafeRequestCsrfToken ? { "x-csrf-token": unsafeRequestCsrfToken } : {}),
        ...(options.headers ?? {})
      }
    });

    if (response.status === 401 && !options.skipAuthRefresh && !path.startsWith("/auth/")) {
      await refreshSession();
      return apiRequestWithMeta<T>(path, { ...options, skipAuthRefresh: true });
    }

    if (response.status === 204) return { data: undefined as T };

    const payload = await parsePayload<T>(response);
    if (!response.ok || payload.success === false) {
      throw new ApiError(
        response.status,
        payload.code ?? "API_ERROR",
        payload.message ?? "Something went wrong. Please try again.",
        payload.details
      );
    }
    return { data: payload.data, meta: payload.meta };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "REQUEST_TIMEOUT", "That took longer than expected. Please try again in a moment.");
    }
    if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Unable to reach RiskLens right now. Please check your connection and try again."
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const result = await apiRequestWithMeta<T>(path, options);
  return result.data;
}

export function jsonBody<T>(body: T): string {
  return JSON.stringify(body);
}
