import type {
  ApiResponse,
  DashboardOverview,
  DistrictRiskMapResponse,
  RiskDistributionItem,
  StateOverview,
  TrendDataPoint,
} from '@nirikshan/shared';
import { apiClient } from './client';

export async function fetchOverview(): Promise<DashboardOverview> {
  const { data } = await apiClient.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
  return data.data;
}

export async function fetchTrends(timeframe?: string): Promise<TrendDataPoint[]> {
  const { data } = await apiClient.get<ApiResponse<TrendDataPoint[]>>('/dashboard/trends', {
    params: timeframe ? { timeframe } : undefined,
  });
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

export async function fetchDistrictsRiskMap(): Promise<DistrictRiskMapResponse> {
  const { data } = await apiClient.get<ApiResponse<DistrictRiskMapResponse>>(
    '/dashboard/risk-map'
  );
  return data.data;
}

