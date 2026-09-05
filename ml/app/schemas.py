"""
NIRIKSHAN — ML Service API Schemas
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Any


# ── Anomaly Score Endpoint ──────────────────────────────────────────────

class AnomalySignal(BaseModel):
    """A single anomaly signal from one of the detection models."""
    type: str = Field(..., description="Signal type: COST_ANOMALY, TIMELINE_ANOMALY, PAYMENT_ANOMALY")
    score: float = Field(..., ge=0.0, le=1.0, description="Anomaly score 0.0 (normal) to 1.0 (highly anomalous)")


class AnomalyScoreRequest(BaseModel):
    """Request body for /internal/ml/anomaly-score."""
    workId: str = Field(..., description="Unique work identifier")
    features: dict[str, Any] = Field(..., description="Work features for scoring")


class AnomalyScoreResponse(BaseModel):
    """Response body for /internal/ml/anomaly-score."""
    success: bool
    data: dict[str, Any] = Field(..., description="Contains 'signals' list and 'modelVersion'")


# ── Similarity Endpoint ────────────────────────────────────────────────

class SimilarityMatch(BaseModel):
    """A single similar work candidate."""
    workId: str
    similarity: float = Field(..., ge=0.0, le=1.0)
    description: str = ""
    state: str = ""
    district: str = ""


class SimilarityRequest(BaseModel):
    """Request body for /internal/ml/similarity."""
    workId: str
    description: str
    state: str = ""
    district: str = ""
    category: str = ""


class SimilarityResponse(BaseModel):
    """Response body for /internal/ml/similarity."""
    success: bool
    data: dict[str, Any] = Field(..., description="Contains 'matches' list and 'modelVersion'")


# ── Risk Report ────────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    """A single piece of evidence explaining why a work was flagged."""
    category: str  # COST, TIMELINE, PAYMENT, DUPLICATE, COMPLIANCE
    severity: str  # LOW, MEDIUM, HIGH
    title: str
    description: str
    metrics: dict[str, Any] = {}


class RiskReport(BaseModel):
    """Complete risk assessment for a single work — matches 08-INTEGRATION-FLOW.md contract."""
    workId: str
    modelVersion: str = "nirikshan-ml-v1.0"
    evaluatedAt: str
    overallRiskScore: int = Field(..., ge=0, le=100)
    riskLevel: str  # LOW, MEDIUM, HIGH, CRITICAL
    flags: list[str] = []
    scores: dict[str, float] = {}
    explainability: dict[str, Any] = {}


# ── Batch Score ────────────────────────────────────────────────────────

class BatchScoreResponse(BaseModel):
    """Response body for batch scoring endpoint."""
    success: bool
    data: dict[str, Any] = Field(
        ...,
        description="Contains 'totalScored', 'riskDistribution', 'outputPath'"
    )
