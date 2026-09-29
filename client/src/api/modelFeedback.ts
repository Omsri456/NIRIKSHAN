import type { ApiResponse } from '@nirikshan/shared';
import { apiClient } from './client';

export interface PrecisionStats {
  totalVerified: number;
  truePositives: number;
  falsePositives: number;
  precision: number;
  byRiskLevel: Record<string, { verified: number; truePositive: number; precision: number }>;
  recentTrend: Array<{
    period: string;
    verified: number;
    truePositives: number;
    precision: number;
  }>;
  topSignals: Array<{
    signalType: string;
    occurrences: number;
    confirmedIrregularities: number;
    accuracy: number;
  }>;
}

export async function fetchPrecisionStats(): Promise<PrecisionStats> {
  const { data } = await apiClient.get<ApiResponse<PrecisionStats>>('/model-feedback/precision');
  return data.data;
}
