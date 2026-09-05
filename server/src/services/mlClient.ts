import { env } from '../config/env';

/**
 * HTTP client for communicating with the Python ML service.
 * TODO: Member 5 — Update request/response schemas as models evolve.
 */

interface AnomalyScoreRequest {
  workId: string;
  features: Record<string, number>;
}

interface AnomalySignal {
  type: string;
  score: number;
}

interface AnomalyScoreResponse {
  success: boolean;
  data: {
    signals: AnomalySignal[];
    modelVersion: string;
  };
}

interface SimilarityRequest {
  workId: string;
  description: string;
  category: string;
  state: string;
  district: string;
}

export interface SimilarityMatch {
  workId: string;
  description: string;
  score: number;
  state?: string;
  district?: string;
  sameState?: boolean;
  sameDistrict?: boolean;
}

export interface SimilarityResponse {
  success: boolean;
  data: {
    matches: SimilarityMatch[];
    modelVersion: string;
  };
}

export async function getAnomalyScores(request: AnomalyScoreRequest): Promise<AnomalyScoreResponse> {
  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/internal/ml/anomaly-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return (await response.json()) as AnomalyScoreResponse;
  } catch (error) {
    console.error('ML service anomaly-score call failed:', error);
    return {
      success: false,
      data: { signals: [], modelVersion: 'unavailable' },
    };
  }
}

export async function getSimilarWorks(request: SimilarityRequest): Promise<SimilarityResponse> {
  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/internal/ml/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = (await response.json()) as any;

    if (!json?.success || !Array.isArray(json?.data?.matches)) {
      return {
        success: false,
        data: { matches: [], modelVersion: json?.data?.modelVersion || 'unavailable' },
      };
    }

    // Normalize matches: ML returns 'similarity', backend/public API expects 'score'
    const matches: SimilarityMatch[] = json.data.matches.map((item: any) => ({
      workId: String(item.workId || ''),
      description: String(item.description || ''),
      score: typeof item.score === 'number' ? item.score : (typeof item.similarity === 'number' ? item.similarity : 0),
      ...(item.state ? { state: String(item.state) } : {}),
      ...(item.district ? { district: String(item.district) } : {}),
      ...(typeof item.sameState === 'boolean' ? { sameState: item.sameState } : {}),
      ...(typeof item.sameDistrict === 'boolean' ? { sameDistrict: item.sameDistrict } : {}),
    }));

    return {
      success: true,
      data: {
        matches,
        modelVersion: String(json.data.modelVersion || 'similarity-v1.0'),
      },
    };
  } catch (error) {
    console.error('ML service similarity call failed:', error);
    return {
      success: false,
      data: { matches: [], modelVersion: 'unavailable' },
    };
  }
}
