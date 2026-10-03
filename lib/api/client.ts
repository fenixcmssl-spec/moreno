/**
 * FenixCMS Unified API Client
 * Centralizes all frontend -> backend API calls with strict error normalization,
 * credentials inclusion, and status verification.
 * 
 * FASE 7: No fake entities or mock data on API failures.
 */

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message || `API Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  [key: string]: any;
}

export async function apiRequest<T = any>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  let payload: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await response.text();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorMsg = 
      (typeof payload === 'object' && payload !== null && (payload.error || payload.message))
        ? (payload.error || payload.message)
        : `Request failed with HTTP ${response.status}`;
    const errorCode = typeof payload === 'object' && payload !== null ? payload.code : undefined;
    throw new ApiError(response.status, errorMsg, errorCode, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T = any>(url: string, headers?: HeadersInit) => 
    apiRequest<T>(url, { method: 'GET', headers }),

  post: <T = any>(url: string, body?: any, headers?: HeadersInit) => 
    apiRequest<T>(url, { 
      method: 'POST', 
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      headers 
    }),

  put: <T = any>(url: string, body?: any, headers?: HeadersInit) => 
    apiRequest<T>(url, { 
      method: 'PUT', 
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers 
    }),

  patch: <T = any>(url: string, body?: any, headers?: HeadersInit) => 
    apiRequest<T>(url, { 
      method: 'PATCH', 
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers 
    }),

  delete: <T = any>(url: string, headers?: HeadersInit) => 
    apiRequest<T>(url, { method: 'DELETE', headers }),
};
