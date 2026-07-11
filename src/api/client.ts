import type { ApiResponse } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "technitium_token";

interface SendOptions {
  method: "GET" | "POST";
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: BodyInit;
  timeoutMs?: number;
  timeoutMessage?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  private async send<T>(
    endpoint: string,
    options: SendOptions,
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    // Token goes in the Authorization header (required by the v15+ API) so it
    // never appears in URLs, which reverse proxies log.
    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 30000,
    );

    try {
      const response = await fetch(url.toString(), {
        method: options.method,
        signal: controller.signal,
        headers,
        body: options.body,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<T> = await response.json();

      if (data.status === "invalid-token") {
        this.clearToken();
        window.dispatchEvent(new CustomEvent("auth:invalid-token"));
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "error",
          errorMessage: options.timeoutMessage ?? "Request timed out",
        } as ApiResponse<T>;
      }
      throw error;
    }
  }

  async get<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: "GET", query: params });
  }

  // POST with params in the form body. Use for any call that carries
  // credentials or secrets so they never appear in the URL.
  async postForm<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        body.append(key, value);
      }
    });

    return this.send<T>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  async post<T>(
    endpoint: string,
    params: Record<string, string> = {},
    body?: string,
  ): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, {
      method: "POST",
      query: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body ? `config=${encodeURIComponent(body)}` : undefined,
    });
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    params: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, {
      method: "POST",
      query: params,
      body: formData,
      timeoutMs: 60000, // Longer timeout for uploads
      timeoutMessage: "Upload timed out",
    });
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse } from "@/types/api";
export default apiClient;
