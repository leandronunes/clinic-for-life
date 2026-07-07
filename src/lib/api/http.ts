/**
 * Central HTTP client for the Rails backend.
 *
 * Responsibilities:
 * - Resolve the base URL from `VITE_API_BASE_URL`.
 * - Attach the `Authorization: Bearer <token>` header when a token is available.
 * - Unwrap the standard `{ data, meta }` response envelope.
 * - Normalize errors into `{ status, message }` (same shape the UI already handles).
 * - When `VITE_OFFLINE=true`, bypass the network entirely and serve requests
 *   from the in-memory mock dataset in `@/lib/api/mock` (see `isOfflineMode`).
 */

import { isOfflineMode } from "./offline-mode";

const DEFAULT_BASE_URL = "http://127.0.0.1:3002";

export interface ApiError {
  status: number;
  message: string;
}

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

type TokenGetter = () => string | null;

let tokenGetter: TokenGetter = () => null;

/**
 * Registers the function used to retrieve the current auth token.
 * The auth context calls this so the client stays decoupled from storage.
 */
export function setAuthTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

function baseUrl(): string {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL as string | undefined;
  return (fromEnv && fromEnv.trim()) || DEFAULT_BASE_URL;
}

function buildUrl(path: string): string {
  const base = baseUrl().replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (Array.isArray(error)) return error.join(", ");
  }
  return fallback;
}

interface RequestOptions {
  /** Extra headers to merge into the request. */
  headers?: Record<string, string>;
  /** Query params appended to the URL. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** When true, returns the full envelope instead of just `data`. */
  withEnvelope?: boolean;
  /** When true, resolves with `null` for empty (204) responses. */
  allowEmpty?: boolean;
}

function appendParams(url: string, params?: RequestOptions["params"]): string {
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const token = tokenGetter();

  if (isOfflineMode()) {
    const { resolveMockRequest } = await import("./mock/router");
    return resolveMockRequest<T>({ method, path, body, params: options.params, token });
  }

  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // Let the browser set the multipart boundary.
    payload = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = appendParams(buildUrl(path), options.params);

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch {
    const err: ApiError = { status: 0, message: "Falha de conexão com o servidor" };
    throw err;
  }

  if (response.status === 204) {
    return (options.allowEmpty ? null : undefined) as T;
  }

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const err: ApiError = {
      status: response.status,
      message: extractMessage(parsed, response.statusText || "Erro inesperado"),
    };
    throw err;
  }

  if (options.withEnvelope) return parsed as T;

  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return (parsed as Envelope<T>).data;
  }
  return parsed as T;
}

export const http = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, body, options);
  },
  del<T>(path: string, options?: RequestOptions & { body?: unknown }): Promise<T> {
    const { body, ...rest } = options ?? {};
    return request<T>("DELETE", path, body, rest);
  },
};
