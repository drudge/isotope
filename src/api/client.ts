import type { ApiResponse } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "technitium_token";

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

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    if (token) {
      params.token = token;
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
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
          errorMessage: "Request timed out",
        } as ApiResponse<T>;
      }
      throw error;
    }
  }

  async get<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, params, { method: "GET" });
  }

  async post<T>(
    endpoint: string,
    params: Record<string, string> = {},
    body?: string,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    if (token) {
      params.token = token;
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body ? `config=${encodeURIComponent(body)}` : undefined,
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
          errorMessage: "Request timed out",
        } as ApiResponse<T>;
      }
      throw error;
    }
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    params: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    if (token) {
      params.token = token;
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Longer timeout for uploads

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        signal: controller.signal,
        body: formData,
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
          errorMessage: "Upload timed out",
        } as ApiResponse<T>;
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse } from "@/types/api";
export default apiClient;
