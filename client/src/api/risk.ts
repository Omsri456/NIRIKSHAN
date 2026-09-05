import type { ApiResponse, PaginatedResponse, RiskAlert, RiskAssessment, RiskSignalType } from '@nirikshan/shared';
import { apiClient } from './client';

export interface HighRiskQuery {
  page?: number;
  limit?: number;
}

export async function fetchHighRisk(
  params: HighRiskQuery = {}
): Promise<PaginatedResponse<RiskAssessment>> {
  const { data } = await apiClient.get<PaginatedResponse<RiskAssessment>>('/risk/high-risk', {
    params,
  });
  return data;
}

export async function fetchAlerts(): Promise<RiskAlert[]> {
  const { data } = await apiClient.get<ApiResponse<RiskAlert[]>>('/risk/alerts');
  return data.data;
}

export async function fetchSignalSummary(): Promise<Record<RiskSignalType, number>> {
  const { data } =
    await apiClient.get<ApiResponse<Record<RiskSignalType, number>>>('/risk/signals');
  return data.data;
}
