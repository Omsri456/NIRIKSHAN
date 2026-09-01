"""
NIRIKSHAN — ML Service
FastAPI application serving internal ML endpoints.

Endpoints:
  POST /internal/ml/anomaly-score  — Returns anomaly signals for a work
  POST /internal/ml/similarity     — Returns similar work matches

These endpoints are INTERNAL and should not be publicly exposed.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import (
    AnomalyScoreRequest,
    AnomalyScoreResponse,
    AnomalySignal,
    SimilarityRequest,
    SimilarityResponse,
)

app = FastAPI(
    title="NIRIKSHAN ML Service",
    description="Internal ML service for risk intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok", "service": "nirikshan-ml"}}


@app.post("/internal/ml/anomaly-score", response_model=AnomalyScoreResponse)
async def anomaly_score(request: AnomalyScoreRequest):
    """
    Compute anomaly signals for a given work's features.
    TODO: Member 5 — Replace stub with real Isolation Forest / statistical models.
    """
    # Stub: return mock signals based on simple heuristics
    signals: list[AnomalySignal] = []

    features = request.features

    # Simple cost heuristic (placeholder)
    recommended = features.get("recommendedAmount", 0)
    expenditure = features.get("totalExpenditure", 0)
    if recommended > 0 and expenditure > 0:
        ratio = expenditure / recommended
        if ratio > 1.5:
            signals.append(
                AnomalySignal(type="COST_ANOMALY", score=min(ratio / 4.0, 1.0))
            )

    # Simple timeline heuristic (placeholder)
    duration = features.get("durationDays", 0)
    if duration > 365:
        signals.append(
            AnomalySignal(
                type="TIMELINE_ANOMALY", score=min(duration / 1000.0, 1.0)
            )
        )

    return AnomalyScoreResponse(
        success=True,
        data={"signals": signals, "modelVersion": "anomaly-stub-v1"},
    )


@app.post("/internal/ml/similarity", response_model=SimilarityResponse)
async def similarity(request: SimilarityRequest):
    """
    Find potentially similar/duplicate works.
    TODO: Member 5 — Replace with sentence-transformer embeddings + cosine similarity.
    """
    # Stub: return empty matches
    return SimilarityResponse(
        success=True,
        data={"matches": [], "modelVersion": "similarity-stub-v1"},
    )
