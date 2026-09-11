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

export interface BatchIngestResponse {
  success: boolean;
  data?: {
    updated: number;
    inserted: number;
    updatedWorkIds?: string[];
    insertedWorkIds?: string[];
    totalWorksScored: number;
    riskDistribution: Record<string, number>;
    elapsedSeconds: number;
  };
  error?: string;
}

/**
 * Trigger batch ingestion on the ML service and poll until it completes.
 *
 * Internally uses a two-phase approach:
 *   1. POST CSV → ML starts background job, returns jobId immediately
 *   2. Poll GET /status/{jobId} every few seconds until COMPLETED or FAILED
 *
 * The jobId is purely internal — never exposed outside this module.
 * Returns the same BatchIngestResponse shape as before so callers
 * (dataImport.service.ts) are completely unaffected.
 */
export async function triggerBatchIngest(csvContent: string): Promise<BatchIngestResponse> {
  const ML_URL = env.ML_SERVICE_URL;
  const POLL_INTERVAL_MS = 3000;     // Check every 3 seconds
  const MAX_POLL_TIME_MS = 600_000;  // 10-minute overall timeout

  // ── Phase 1: Submit CSV, get jobId ──────────────────────────────────
  let jobId: string;
  try {
    const controller = new AbortController();
    const submitTimeout = setTimeout(() => controller.abort(), 30_000); // 30s for the POST

    const response = await fetch(`${ML_URL}/internal/ml/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: csvContent,
      signal: controller.signal,
    });

    clearTimeout(submitTimeout);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `ML service returned ${response.status}: ${errorText}`,
      };
    }

    const json = (await response.json()) as any;
    jobId = json.jobId;

    if (!jobId) {
      // Shouldn't happen, but handle gracefully
      return {
        success: false,
        error: 'ML service did not return a jobId.',
      };
    }

    console.log(`[mlClient] Ingestion job started: ${jobId}`);
  } catch (error: any) {
    console.error('ML service batch ingest submit failed:', error);
    return {
      success: false,
      error: error.message || 'ML service connection failed',
    };
  }

  // ── Phase 2: Poll for completion ────────────────────────────────────
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const statusResponse = await fetch(`${ML_URL}/internal/ml/ingest/status/${jobId}`);
      const statusJson = (await statusResponse.json()) as any;

      if (statusJson.status === 'COMPLETED') {
        console.log(`[mlClient] Ingestion job completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        return {
          success: true,
          data: statusJson.data,
        };
      }

      if (statusJson.status === 'FAILED') {
        console.error(`[mlClient] Ingestion job failed: ${statusJson.error}`);
        return {
          success: false,
          error: statusJson.error || 'ML scoring pipeline failed.',
        };
      }

      // Still PROCESSING — continue polling
    } catch (pollError: any) {
      // Transient network error during poll — keep retrying
      console.warn(`[mlClient] Poll error (will retry): ${pollError.message}`);
    }
  }

  // Timeout
  return {
    success: false,
    error: `ML ingestion job timed out after ${MAX_POLL_TIME_MS / 1000}s (jobId: ${jobId}).`,
  };
}

/** Simple sleep utility. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

