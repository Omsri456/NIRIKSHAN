import type {
  ApiResponse,
  DashboardOverview,
  RiskDistributionItem,
  StateOverview,
  TrendDataPoint,
} from '@nirikshan/shared';
import { apiClient } from './client';

export async function fetchOverview(): Promise<DashboardOverview> {
  const { data } = await apiClient.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
  return data.data;
}

export async function fetchTrends(): Promise<TrendDataPoint[]> {
  const { data } = await apiClient.get<ApiResponse<TrendDataPoint[]>>('/dashboard/trends');
  return data.data;
}

export async function fetchRiskDistribution(): Promise<RiskDistributionItem[]> {
  const { data } = await apiClient.get<ApiResponse<RiskDistributionItem[]>>(
    '/dashboard/risk-distribution'
  );
  return data.data;
}

export async function fetchStates(): Promise<StateOverview[]> {
  const { data } = await apiClient.get<ApiResponse<StateOverview[]>>('/dashboard/states');
  return data.data;
}
