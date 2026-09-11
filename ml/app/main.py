"""
NIRIKSHAN — ML Service
FastAPI application serving internal ML endpoints.

Endpoints:
  POST /internal/ml/anomaly-score  — Returns anomaly signals for a work
  POST /internal/ml/similarity     — Returns similar work matches
  GET  /internal/ml/risk-report/:workId — Returns full risk report for a work
  POST /internal/ml/batch-score    — Triggers batch scoring pipeline
  POST /internal/ml/ingest         — Merge CSV + score (async background job)
  GET  /internal/ml/ingest/status/{job_id} — Poll job status (internal only)

These endpoints are INTERNAL and should not be publicly exposed.
"""

import os
import json
import uuid
import threading
import traceback
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

try:
    from ml.app.schemas import (
        AnomalyScoreRequest,
        AnomalyScoreResponse,
        AnomalySignal,
        SimilarityRequest,
        SimilarityResponse,
        BatchScoreResponse,
    )
except ModuleNotFoundError:
    from app.schemas import (
        AnomalyScoreRequest,
        AnomalyScoreResponse,
        AnomalySignal,
        SimilarityRequest,
        SimilarityResponse,
        BatchScoreResponse,
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


# ── Async Job State (internal only — Node backend polls this) ──────────
# Tracks background ingestion jobs. Never exposed to the frontend.

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


# ── Lazy-loaded model state ────────────────────────────────────────────
# Models are loaded once on first request, not at startup (faster boot)

_models_loaded = False
_cost_detector = None
_timeline_detector = None
_payment_detector = None
_similarity_detector = None
_risk_scores_cache = None


def _get_data_dir():
    """Get path to data/processed directory."""
    return os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'processed')


def _get_model_dir():
    """Get path to ml/models directory."""
    return os.path.join(os.path.dirname(__file__), '..', 'models')


def _load_risk_scores():
    """Load pre-computed risk scores from batch pipeline."""
    global _risk_scores_cache
    if _risk_scores_cache is not None:
        return _risk_scores_cache

    scores_path = os.path.join(_get_data_dir(), 'risk_scores.json')
    if not os.path.exists(scores_path):
        return None

    with open(scores_path, 'r', encoding='utf-8') as f:
        scores_list = json.load(f)

    # Index by workId for fast lookup
    _risk_scores_cache = {s['workId']: s for s in scores_list}
    return _risk_scores_cache


def _load_models():
    """Load trained models from disk (if available)."""
    global _models_loaded, _cost_detector, _timeline_detector, _payment_detector

    if _models_loaded:
        return

    model_dir = _get_model_dir()

    cost_path = os.path.join(model_dir, 'cost_anomaly.joblib')
    if os.path.exists(cost_path):
        try:
            from ml.app.services.cost_anomaly import CostAnomalyDetector
        except ModuleNotFoundError:
            from app.services.cost_anomaly import CostAnomalyDetector
        _cost_detector = CostAnomalyDetector()
        _cost_detector.load(cost_path)

    try:
        from ml.app.services.timeline_anomaly import TimelineAnomalyDetector
    except ModuleNotFoundError:
        from app.services.timeline_anomaly import TimelineAnomalyDetector
    _timeline_detector = TimelineAnomalyDetector()

    payment_path = os.path.join(model_dir, 'payment_anomaly.joblib')
    if os.path.exists(payment_path):
        try:
            from ml.app.services.payment_anomaly import PaymentAnomalyDetector
        except ModuleNotFoundError:
            from app.services.payment_anomaly import PaymentAnomalyDetector
        _payment_detector = PaymentAnomalyDetector()
        _payment_detector.load(payment_path)

    _models_loaded = True


# ── Endpoints ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check endpoint."""
    scores = _load_risk_scores()
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "nirikshan-ml",
            "batchScoresAvailable": scores is not None,
            "totalScoredWorks": len(scores) if scores else 0,
        }
    }


@app.post("/internal/ml/anomaly-score", response_model=AnomalyScoreResponse)
async def anomaly_score(request: AnomalyScoreRequest):
    """
    Compute anomaly signals for a given work's features.

    If batch scores are available, returns pre-computed scores.
    Otherwise, runs real-time inference using loaded models.
    """
    # Try pre-computed scores first
    scores = _load_risk_scores()
    if scores and request.workId in scores:
        cached = scores[request.workId]
        signals = []
        for signal_type, score_key in [
            ("COST_ANOMALY", "costAnomalyScore"),
            ("TIMELINE_ANOMALY", "timelineDelayScore"),
            ("PAYMENT_ANOMALY", "paymentAnomalyScore"),
        ]:
            score_val = cached.get('scores', {}).get(score_key, 0)
            if score_val > 0:
                signals.append(AnomalySignal(
                    type=signal_type,
                    score=round(score_val / 100.0, 4),
                ))
        return AnomalyScoreResponse(
            success=True,
            data={"signals": [s.model_dump() for s in signals],
                  "modelVersion": cached.get('modelVersion', 'nirikshan-ml-v1.0')},
        )

    # Fall back to real-time inference
    _load_models()
    signals: list[AnomalySignal] = []
    features = request.features

    # Cost anomaly
    if _cost_detector:
        cost_score = _cost_detector.predict(features)
        if cost_score > 0.3:
            signals.append(AnomalySignal(type="COST_ANOMALY", score=round(cost_score, 4)))

    # Timeline anomaly
    if _timeline_detector:
        time_score = _timeline_detector.predict(features)
        if time_score > 0.3:
            signals.append(AnomalySignal(type="TIMELINE_ANOMALY", score=round(time_score, 4)))

    # Payment anomaly
    if _payment_detector:
        pay_score = _payment_detector.predict(features)
        if pay_score > 0.3:
            signals.append(AnomalySignal(type="PAYMENT_ANOMALY", score=round(pay_score, 4)))

    # Simple heuristic fallback (if no models loaded)
    if not _cost_detector and not _timeline_detector:
        recommended = features.get("recommendedAmount", 0)
        expenditure = features.get("totalExpenditure", 0)
        if recommended > 0 and expenditure > 0:
            ratio = expenditure / recommended
            if ratio > 1.5:
                signals.append(
                    AnomalySignal(type="COST_ANOMALY", score=min(ratio / 4.0, 1.0))
                )
        duration = features.get("durationDays", 0)
        if duration > 365:
            signals.append(
                AnomalySignal(type="TIMELINE_ANOMALY", score=min(duration / 1000.0, 1.0))
            )

    return AnomalyScoreResponse(
        success=True,
        data={"signals": [s.model_dump() for s in signals],
              "modelVersion": "nirikshan-ml-v1.0"},
    )


@app.post("/internal/ml/similarity", response_model=SimilarityResponse)
async def similarity(request: SimilarityRequest):
    """
    Find potentially similar/duplicate works.

    Uses pre-computed similarity results from batch pipeline.
    Real-time embedding + search available if embeddings are loaded.
    """
    # Try pre-computed similarity results
    sim_path = os.path.join(_get_data_dir(), 'similarity_matches.json')
    if os.path.exists(sim_path):
        with open(sim_path, 'r', encoding='utf-8') as f:
            all_matches = json.load(f)
        matches = all_matches.get(str(request.workId), [])
        return SimilarityResponse(
            success=True,
            data={"matches": matches, "modelVersion": "similarity-v1.0"},
        )

    # No pre-computed data
    return SimilarityResponse(
        success=True,
        data={"matches": [], "modelVersion": "similarity-v1.0",
              "note": "Run batch_score.py to compute similarity matches."},
    )


@app.get("/internal/ml/risk-report/{work_id}")
async def risk_report(work_id: str):
    """
    Get the full risk report for a specific work.

    Returns the complete risk assessment matching the
    08-INTEGRATION-FLOW.md contract.
    """
    scores = _load_risk_scores()
    if not scores:
        raise HTTPException(
            status_code=503,
            detail="Risk scores not yet computed. Run batch_score.py first."
        )

    if work_id not in scores:
        raise HTTPException(
            status_code=404,
            detail=f"Work ID '{work_id}' not found in risk scores."
        )

    return {"success": True, "data": scores[work_id]}


@app.get("/internal/ml/risk-distribution")
async def risk_distribution():
    """
    Get aggregate risk distribution across all scored works.
    Useful for the dashboard overview endpoint.
    """
    scores = _load_risk_scores()
    if not scores:
        raise HTTPException(
            status_code=503,
            detail="Risk scores not yet computed. Run batch_score.py first."
        )

    distribution = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    total_flagged_amount = 0
    total_budget = 0

    for work_id, report in scores.items():
        level = report.get('riskLevel', 'LOW')
        distribution[level] = distribution.get(level, 0) + 1

    return {
        "success": True,
        "data": {
            "totalScoredWorks": len(scores),
            "riskDistribution": distribution,
            "modelVersion": "nirikshan-ml-v1.0",
        }
    }


def _run_refresh_job(job_id: str):
    """
    Background thread: runs full batch scoring pipeline.
    Refreshes peer statistics cache (peer_stats.json), retrains ML models,
    recomputes similarity embeddings, and updates all risk scores.
    """
    global _risk_scores_cache
    try:
        try:
            from ml.app.batch_score import run_batch_scoring
        except ModuleNotFoundError:
            from app.batch_score import run_batch_scoring

        scoring_summary = run_batch_scoring()
        _risk_scores_cache = None

        with _jobs_lock:
            _jobs[job_id] = {
                "status": "COMPLETED",
                "data": {
                    "totalScored": scoring_summary.get("totalWorks", 0),
                    "riskDistribution": scoring_summary.get("riskDistribution", {}),
                    "elapsedSeconds": scoring_summary.get("elapsedSeconds", 0),
                    "modelVersion": scoring_summary.get("modelVersion", "nirikshan-ml-v1.0"),
                    "action": "FULL_REFRESH",
                },
                "error": None,
            }
    except Exception as e:
        traceback.print_exc()
        with _jobs_lock:
            _jobs[job_id] = {
                "status": "FAILED",
                "data": None,
                "error": f"Full refresh failed: {str(e)}",
            }


@app.post("/internal/ml/refresh")
@app.post("/internal/ml/batch-score")
async def trigger_full_refresh():
    """
    Trigger a Full Refresh action:
    Periodically refreshes peer-stats cache (peer_stats.json),
    retrains models, recomputes similarity, and re-scores entire dataset.
    """
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {"status": "PROCESSING", "data": None, "error": None, "type": "FULL_REFRESH"}

    thread = threading.Thread(
        target=_run_refresh_job,
        args=(job_id,),
        daemon=True,
    )
    thread.start()

    return {
        "success": True,
        "jobId": job_id,
        "status": "PROCESSING",
        "action": "FULL_REFRESH",
        "message": "Full batch refresh pipeline started in background.",
    }


@app.post("/internal/ml/ingest")
async def ingest_csv(request: Request):
    """
    Accept raw CSV content, start merge + scoring in a background thread,
    and return immediately with a jobId for polling.

    The Node.js backend polls GET /internal/ml/ingest/status/{job_id}
    until the job completes. This avoids HTTP timeout issues.
    """
    body_bytes = await request.body()
    csv_text = body_bytes.decode('utf-8', errors='replace')
    if not csv_text.strip():
        raise HTTPException(status_code=400, detail="Empty CSV content provided.")

    # Generate a unique job ID (internal only — never exposed to frontend)
    job_id = str(uuid.uuid4())

    # Register the job as PROCESSING
    with _jobs_lock:
        _jobs[job_id] = {"status": "PROCESSING", "data": None, "error": None}

    # Run the heavy work in a background thread
    thread = threading.Thread(
        target=_run_ingest_job,
        args=(job_id, csv_text),
        daemon=True,
    )
    thread.start()

    return {
        "success": True,
        "jobId": job_id,
        "status": "PROCESSING",
    }


def _run_ingest_job(job_id: str, csv_text: str):
    """
    Background thread: merges CSV and runs incremental scoring.
    Updates _jobs[job_id] with result or error when done.
    """
    global _risk_scores_cache

    try:
        from ml.app.csv_merge import merge_unified_works_csv
        from ml.app.batch_score import run_incremental_scoring, run_batch_scoring
    except ModuleNotFoundError:
        from app.csv_merge import merge_unified_works_csv
        from app.batch_score import run_incremental_scoring, run_batch_scoring

    try:
        # Step 1: Merge uploaded CSV into unified_works.csv
        merge_result = merge_unified_works_csv(csv_text)
    except Exception as e:
        with _jobs_lock:
            _jobs[job_id] = {
                "status": "FAILED",
                "data": None,
                "error": f"Failed to parse and merge CSV: {str(e)}",
            }
        return

    try:
        # Step 2: Score ONLY the new/updated works (incremental mode)
        # Falls back to full retrain if no trained models exist yet
        target_ids = set(
            merge_result.get("updatedWorkIds", []) +
            merge_result.get("insertedWorkIds", [])
        )

        if target_ids:
            scoring_summary = run_incremental_scoring(target_work_ids=target_ids)
        else:
            # Edge case: no new/updated IDs → run full batch
            scoring_summary = run_batch_scoring()

        # Invalidate in-memory risk scores cache
        _risk_scores_cache = None

        with _jobs_lock:
            _jobs[job_id] = {
                "status": "COMPLETED",
                "data": {
                    "updated": merge_result.get("updated", 0),
                    "inserted": merge_result.get("inserted", 0),
                    "updatedWorkIds": merge_result.get("updatedWorkIds", []),
                    "insertedWorkIds": merge_result.get("insertedWorkIds", []),
                    "totalWorksScored": scoring_summary.get("totalWorks", 0),
                    "riskDistribution": scoring_summary.get("riskDistribution", {}),
                    "elapsedSeconds": scoring_summary.get("elapsedSeconds", 0),
                },
                "error": None,
            }
    except Exception as e:
        traceback.print_exc()
        with _jobs_lock:
            _jobs[job_id] = {
                "status": "FAILED",
                "data": None,
                "error": f"Batch scoring failed: {str(e)}",
            }


@app.get("/internal/ml/ingest/status/{job_id}")
async def ingest_status(job_id: str):
    """
    Poll endpoint for ingestion job status (internal — called by Node backend only).
    Returns the job's current status, result data, or error message.
    """
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    response = {
        "success": job["status"] == "COMPLETED",
        "jobId": job_id,
        "status": job["status"],
    }

    if job["status"] == "COMPLETED":
        response["data"] = job["data"]
        # Clean up completed job from memory (keep last 20 for debugging)
        _cleanup_old_jobs()
    elif job["status"] == "FAILED":
        response["error"] = job["error"]
        _cleanup_old_jobs()

    return response


def _cleanup_old_jobs():
    """Remove old completed/failed jobs, keeping the most recent 20."""
    with _jobs_lock:
        done_jobs = [
            (jid, j) for jid, j in _jobs.items()
            if j["status"] in ("COMPLETED", "FAILED")
        ]
        if len(done_jobs) > 20:
            # Keep only the last 20 done jobs (simple approach)
            to_remove = done_jobs[:-20]
            for jid, _ in to_remove:
                del _jobs[jid]

