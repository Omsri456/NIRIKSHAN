import axios from 'axios';
import type { ApiErrorResponse } from '@nirikshan/shared';

/**
 * Base API client.
 * In dev, Vite proxies /api → the backend (see vite.config.ts).
 * In production, set VITE_API_BASE_URL to the deployed API origin.
 */
export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'nirikshan_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Normalizes any Axios/API failure into a readable message. */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.error?.message;
    if (apiMessage) return apiMessage;
    if (error.code === 'ERR_NETWORK') {
      return 'Could not reach the server. Confirm the backend is running.';
    }
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
