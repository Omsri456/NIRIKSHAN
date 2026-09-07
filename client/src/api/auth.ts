import type { ApiResponse, SafeUser } from '@nirikshan/shared';
import { apiClient } from './client';

export interface LoginResponse {
  token: string;
  user: SafeUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  scope?: {
    state?: string | null;
    district?: string | null;
    constituency?: string | null;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
    email,
    password,
  });
  return data.data;
}

export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/register', payload);
  return data.data;
}

export async function fetchMe(): Promise<SafeUser> {
  const { data } = await apiClient.get<ApiResponse<SafeUser>>('/auth/me');
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
