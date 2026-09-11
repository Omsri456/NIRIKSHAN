import type {
  ApiResponse,
  EarlyWarningAlert,
  PaginatedResponse,
} from '@nirikshan/shared';
import { apiClient } from './client';

export interface EarlyWarningsQuery {
  page?: number;
  limit?: number;
}

export async function fetchEarlyWarnings(
  params: EarlyWarningsQuery = {}
): Promise<PaginatedResponse<EarlyWarningAlert>> {
  const { data } = await apiClient.get<PaginatedResponse<EarlyWarningAlert>>(
    '/risk/early-warnings',
    { params }
  );
  return data;
}

export async function acknowledgeEarlyWarning(id: string): Promise<EarlyWarningAlert> {
  const { data } = await apiClient.patch<ApiResponse<EarlyWarningAlert>>(
    `/risk/early-warnings/${id}/acknowledge`
  );
  return data.data;
}
