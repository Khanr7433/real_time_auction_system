const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function isSameApiOrigin(url: string, endpoint: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
    const targetOrigin = new URL(url, window.location.origin).origin;
    return targetOrigin === apiOrigin;
  } catch {
    return !/^https?:\/\//i.test(endpoint) && !endpoint.startsWith('//');
  }
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isAbsolute = /^https?:\/\//i.test(endpoint) || endpoint.startsWith('//');
  const url = isAbsolute ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers);

  // Only default to application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token from localStorage in browser context only for same API origin
  if (typeof window !== 'undefined' && isSameApiOrigin(url, endpoint)) {
    const token = localStorage.getItem('bidnow_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: unknown = undefined;
  if (response.status !== 204 && response.status !== 205) {
    const text = await response.text();
    if (text) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } else {
        data = text;
      }
    }
  }

  if (!response.ok) {
    const jsonObj = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    const errorMessage =
      (typeof jsonObj?.error === 'string' && jsonObj.error) ||
      (typeof jsonObj?.message === 'string' && jsonObj.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: serializeBody(body),
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: serializeBody(body),
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: serializeBody(body),
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

