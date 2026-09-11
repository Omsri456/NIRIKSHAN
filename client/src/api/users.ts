import type { ApiResponse, SafeUser } from '@nirikshan/shared';
import { apiClient } from './client';

export async function fetchPendingUsers(): Promise<SafeUser[]> {
  const { data } = await apiClient.get<ApiResponse<SafeUser[]>>('/users/pending');
  return data.data;
}

export async function approveUser(id: string): Promise<SafeUser> {
  const { data } = await apiClient.patch<ApiResponse<SafeUser>>(`/users/${id}/approve`);
  return data.data;
}

export async function rejectUser(id: string): Promise<SafeUser> {
  const { data } = await apiClient.patch<ApiResponse<SafeUser>>(`/users/${id}/reject`);
  return data.data;
}
