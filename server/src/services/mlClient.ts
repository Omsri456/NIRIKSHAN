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

interface SimilarityMatch {
  workId: string;
  description: string;
  score: number;
}

interface SimilarityResponse {
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
    return await response.json();
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
    return await response.json();
  } catch (error) {
    console.error('ML service similarity call failed:', error);
    return {
      success: false,
      data: { matches: [], modelVersion: 'unavailable' },
    };
  }
}
