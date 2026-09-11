import type {
  ApiResponse,
  PaginatedResponse,
  RecommendationStatus,
  WorkRecommendation,
  CreateRecommendationPayload,
  RecommendationsQuery,
} from '@nirikshan/shared';
import { apiClient } from './client';

export type {
  RecommendationStatus,
  WorkRecommendation,
  CreateRecommendationPayload,
  RecommendationsQuery,
};

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
