/**
 * Single HTTP entry point for the whole app.
 *
 * Responsibilities kept here so no component repeats them:
 *   - one base URL and one response envelope to unwrap
 *   - `credentials: 'include'` so the httpOnly session cookie is always sent
 *   - normalising every failure into an `ApiError` with a code and field details
 *   - a global 401 hook so an expired session logs the user out once, centrally
 */

import { getStoredToken } from './authToken';

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldIssue[];

  constructor(status: number, code: string, message: string, details: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-name -> message, ready to drop into a form. */
  get fieldErrors(): Record<string, string> {
    return this.details.reduce<Record<string, string>>((acc, issue) => {
      if (!acc[issue.field]) acc[issue.field] = issue.message;
      return acc;
    }, {});
  }
}

/**
 * API base URL.
 *
 * Unset (the default) means same-origin `/api`, which is what local development
 * uses via the Vite proxy, and what a combined deployment would use. When the
 * API is deployed separately, set VITE_API_URL to its origin at build time —
 * e.g. `https://insurance-api.vercel.app/api`.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// Checked for emptiness, not just for undefined: `.env` files carry blank
// placeholders (`VITE_API_URL=`), and Vite surfaces those as an empty string.
// Treating '' as configured would produce request URLs like `/products`.
const BASE_URL = configuredApiUrl ? configuredApiUrl.replace(/\/+$/, '') : '/api';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Suppresses the global logout hook — used by the session bootstrap probe,
   *  where a 401 simply means "not signed in yet". */
  skipUnauthorizedHandler?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: unknown;
  error?: { code: string; message: string; details?: FieldIssue[] };
}

export interface ApiResult<T> {
  data: T;
  meta?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, signal, skipUnauthorizedHandler } = options;

  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';

  // Sent alongside `credentials: 'include'`, not instead of it: the cookie is
  // used when the API is same-origin, the Bearer token when it is not.
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // fetch only rejects on a transport failure, so this is genuinely offline.
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 204) return { data: undefined as T };

  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unreadable response.');
  }

  if (!response.ok || !payload.success) {
    const error = payload.error;

    if (response.status === 401 && !skipUnauthorizedHandler) {
      onUnauthorized?.();
    }

    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details ?? [],
    );
  }

  return { data: payload.data as T, meta: payload.meta };
}

/** Convenience wrapper for the common case of not needing `meta`. */
export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }).then((r) => r.data),
  getWithMeta: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }).then((r) => r.data),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }).then((r) => r.data),
  del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }).then((r) => r.data),
};
