import type {
  ApiResponse,
  Expenditure,
  PaginatedResponse,
  RiskAssessment,
  Work,
} from '@nirikshan/shared';
import { apiClient } from './client';

export interface WorksQuery {
  page?: number;
  limit?: number;
  sort?: string;
  state?: string;
  district?: string;
  constituency?: string;
  status?: string;
  search?: string;
}

export async function fetchWorks(params: WorksQuery = {}): Promise<PaginatedResponse<Work>> {
  const { data } = await apiClient.get<PaginatedResponse<Work>>('/works', { params });
  return data;
}

export async function fetchWork(workId: string): Promise<Work> {
  const { data } = await apiClient.get<ApiResponse<Work>>(`/works/${workId}`);
  return data.data;
}

export async function fetchWorkExpenditures(workId: string): Promise<Expenditure[]> {
  const { data } = await apiClient.get<ApiResponse<Expenditure[]>>(
    `/works/${workId}/expenditures`
  );
  return data.data;
}

export async function fetchWorkRisk(workId: string): Promise<RiskAssessment | null> {
  const { data } = await apiClient.get<ApiResponse<RiskAssessment | null>>(
    `/works/${workId}/risk`
  );
  return data.data;
}

export async function fetchWorkRiskHistory(workId: string): Promise<RiskAssessment[]> {
  const { data } = await apiClient.get<ApiResponse<RiskAssessment[]>>(
    `/works/${workId}/risk-history`
  );
  return data.data;
}

export async function fetchSimilarWorks(workId: string): Promise<Work[]> {
  const { data } = await apiClient.get<ApiResponse<Work[]>>(`/works/${workId}/similar`);
  return data.data;
}
