// Composable wrapping fetch() for all API calls with base URL, auth header, and error handling

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

/** Generic API error with HTTP status code */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // If OAuth is enabled and we get 401, redirect to Google login
    const data = await res.json().catch(() => ({})) as { loginUrl?: string };
    if (data.loginUrl && data.loginUrl.startsWith('/')) {
      window.location.href = data.loginUrl;
      throw new ApiError(401, 'Redirecting to login...');
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, 'Unexpected response from server (not JSON). Is the API running?');
  }
  return res.json() as Promise<T>;
}

/** GET request */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

/** POST request with JSON body */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/** DELETE request */
export async function apiDelete<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  const API_KEY = import.meta.env.VITE_API_KEY;
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse<T>(res);
}

/** Build a full URL for direct download links (reports etc.) */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

/** useApi composable — returns helpers bound to the same base URL */
export function useApi() {
  return { apiGet, apiPost, apiDelete, apiUrl };
}
