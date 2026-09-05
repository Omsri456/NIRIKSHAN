import type {
  ApiResponse,
  Investigation,
  InvestigationFinding,
  InvestigationPriority,
  InvestigationStatus,
  PaginatedResponse,
} from '@nirikshan/shared';
import { apiClient } from './client';

export interface InvestigationsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export async function fetchInvestigations(
  params: InvestigationsQuery = {}
): Promise<PaginatedResponse<Investigation>> {
  const { data } = await apiClient.get<PaginatedResponse<Investigation>>('/investigations', {
    params,
  });
  return data;
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  const { data } = await apiClient.get<ApiResponse<Investigation>>(`/investigations/${id}`);
  return data.data;
}

export async function createInvestigation(
  workId: string,
  priority?: InvestigationPriority
): Promise<Investigation> {
  const { data } = await apiClient.post<ApiResponse<Investigation>>('/investigations', {
    workId,
    priority,
  });
  return data.data;
}

export interface InvestigationUpdate {
  status?: InvestigationStatus;
  priority?: InvestigationPriority;
  finding?: InvestigationFinding;
}

export async function updateInvestigation(
  id: string,
  update: InvestigationUpdate
): Promise<Investigation> {
  const { data } = await apiClient.patch<ApiResponse<Investigation>>(
    `/investigations/${id}`,
    update
  );
  return data.data;
}

export async function addInvestigationNote(
  id: string,
  content: string
): Promise<Investigation> {
  const { data } = await apiClient.post<ApiResponse<Investigation>>(
    `/investigations/${id}/notes`,
    { content }
  );
  return data.data;
}
