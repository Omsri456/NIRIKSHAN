import type { ApiResponse, PaginatedResponse } from '@nirikshan/shared';
import { apiClient } from './client';

export type RecommendationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface WorkRecommendation {
  _id: string;
  recommendedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
    scope: {
      state: string | null;
      district: string | null;
      constituency: string | null;
    };
  };
  constituency: string;
  district: string;
  state: string;
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecommendationPayload {
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  constituency: string;
  district: string;
  state: string;
}

export interface RecommendationsQuery {
  page?: number;
  limit?: number;
  status?: RecommendationStatus;
}

export async function createRecommendation(
  payload: CreateRecommendationPayload
): Promise<WorkRecommendation> {
  const { data } = await apiClient.post<ApiResponse<WorkRecommendation>>(
    '/recommendations',
    payload
  );
  return data.data;
}

export async function fetchRecommendations(
  params: RecommendationsQuery = {}
): Promise<PaginatedResponse<WorkRecommendation>> {
  const { data } = await apiClient.get<PaginatedResponse<WorkRecommendation>>(
    '/recommendations',
    { params }
  );
  return data;
}

export async function updateRecommendationStatus(
  id: string,
  status: RecommendationStatus
): Promise<WorkRecommendation> {
  const { data } = await apiClient.patch<ApiResponse<WorkRecommendation>>(
    `/recommendations/${id}/status`,
    { status }
  );
  return data.data;
}
