import type { ApiResponse, AppNotification } from '@nirikshan/shared';
import { apiClient } from './client';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications');
  return data.data;
}
