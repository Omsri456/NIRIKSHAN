import type { ApiResponse, AppNotification } from '@nirikshan/shared';
import { apiClient } from './client';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications');
  return data.data;
}

export async function dismissNotifications(notificationIds: string[]): Promise<void> {
  await apiClient.post('/notifications/dismiss', { notificationIds });
}

export async function dismissAllNotifications(): Promise<void> {
  await apiClient.post('/notifications/dismiss-all');
}
