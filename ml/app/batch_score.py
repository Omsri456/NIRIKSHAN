"""
NIRIKSHAN — Batch Scoring Pipeline
====================================
End-to-end CLI script that:
  1. Loads unified_works.csv
  2. Runs feature engineering
  3. Trains all 4 ML models
  4. Scores every work
  5. Runs compliance rules
  6. Computes risk engine scores
  7. Exports risk_scores.json

Usage:
  python -m ml.app.batch_score
  OR
  python ml/app/batch_score.py

Output:
  data/processed/risk_scores.json — full batch output matching API contract
  ml/models/ — trained model artifacts (joblib)
"""

import sys
import os
import io
import json
import time

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure the project root is on the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

import pandas as pd
import numpy as np

from ml.app.feature_engineering import engineer_features
from ml.app.services.cost_anomaly import CostAnomalyDetector
from ml.app.services.timeline_anomaly import TimelineAnomalyDetector
from ml.app.services.payment_anomaly import PaymentAnomalyDetector
from ml.app.services.similarity import SimilarityDetector
from ml.app.services.compliance import ComplianceEngine
from ml.app.services.risk_engine import RiskEngine


def main():
    start_time = time.time()

    print("=" * 65)
    print("  NIRIKSHAN — ML Batch Scoring Pipeline")
    print("  Risk Intelligence Engine v1.0")
    print("=" * 65)

    # ── Paths ──────────────────────────────────────────────────────────
    data_dir = os.path.join(project_root, 'data', 'processed')
    model_dir = os.path.join(project_root, 'ml', 'models')
    os.makedirs(model_dir, exist_ok=True)

    input_path = os.path.join(data_dir, 'unified_works.csv')
    output_path = os.path.join(data_dir, 'risk_scores.json')
    features_path = os.path.join(data_dir, 'ml_features.csv')
    similarity_path = os.path.join(data_dir, 'similarity_matches.json')
    embeddings_path = os.path.join(model_dir, 'embeddings.npz')

    # ── Step 1: Load data ──────────────────────────────────────────────
    print(f"\n[1/7] Loading data...")
    print(f"  Source: {input_path}")
    df = pd.read_csv(input_path, low_memory=False)
    print(f"  Loaded {len(df):,} works × {len(df.columns)} columns")

    # ── Step 2: Feature engineering ────────────────────────────────────
    print(f"\n[2/7] Feature engineering...")
    df = engineer_features(df)
    # Save enriched features
    df.to_csv(features_path, index=False, encoding='utf-8')
    print(f"  Saved enriched features to {features_path}")

    # ── Step 3: Cost anomaly model ─────────────────────────────────────
    print(f"\n[3/7] Cost Anomaly Detection...")
    cost_detector = CostAnomalyDetector(contamination=0.05)
    cost_detector.train(df)
    df['costAnomalyScore'] = cost_detector.batch_predict(df)
    cost_detector.save(os.path.join(model_dir, 'cost_anomaly.joblib'))

    flagged_cost = (df['costAnomalyScore'] >= 0.5).sum()
    print(f"  Cost flags (score >= 0.5): {flagged_cost:,}")

    # ── Step 4: Timeline anomaly model ─────────────────────────────────
    print(f"\n[4/7] Timeline / Delay Detection...")
    timeline_detector = TimelineAnomalyDetector()
    timeline_detector.train(df)
    df['timelineAnomalyScore'] = timeline_detector.batch_predict(df)

    flagged_time = (df['timelineAnomalyScore'] >= 0.5).sum()
    print(f"  Timeline flags (score >= 0.5): {flagged_time:,}")

    # ── Step 5: Payment anomaly model ──────────────────────────────────
    print(f"\n[5/7] Payment Anomaly Detection...")
    payment_detector = PaymentAnomalyDetector(contamination=0.10)
    payment_detector.train(df)
    df['paymentAnomalyScore'] = payment_detector.batch_predict(df)
    payment_detector.save(os.path.join(model_dir, 'payment_anomaly.joblib'))

    flagged_pay = (df['paymentAnomalyScore'] >= 0.5).sum()
    print(f"  Payment flags (score >= 0.5): {flagged_pay:,}")

    # ── Step 6: Similarity detection ───────────────────────────────────
    print(f"\n[6/7] Similar Work Detection (NLP)...")
    similarity_detector = SimilarityDetector(similarity_threshold=0.85, top_k=5)

    # Check for pre-computed embeddings
    if os.path.exists(embeddings_path):
        print(f"  Found pre-computed embeddings at {embeddings_path}")
        similarity_detector.load_embeddings(embeddings_path, df)
        # Still need to run batch detection for matches
        print(f"  Re-computing similarity matches...")

    similarity_results = similarity_detector.batch_detect(df, save_path=similarity_path)

    # Save embeddings for future runs
    similarity_detector.save_embeddings(embeddings_path)

    # ── Step 7: Risk engine scoring ────────────────────────────────────
    print(f"\n[7/7] Computing unified risk scores...")
    compliance_engine = ComplianceEngine()
    risk_engine = RiskEngine()

    results = []
    for idx, row in df.iterrows():
        work_id = str(row['workId'])

        # Get similarity matches
        sim_matches = similarity_results.get(work_id, [])
        max_sim_score = max([m['similarity'] for m in sim_matches], default=0.0)

        # Get compliance flags
        compliance_flags = compliance_engine.check(row)

        # Get evidence from each model
        cost_evidence = cost_detector.get_evidence(row)
        timeline_evidence = timeline_detector.get_evidence(row)
        payment_evidence = payment_detector.get_evidence(row)
        sim_evidence = similarity_detector.get_evidence(work_id, similarity_results)

        # Compute unified risk
        risk = risk_engine.compute(
            cost_score=row.get('costAnomalyScore', 0),
            timeline_score=row.get('timelineAnomalyScore', 0),
            payment_score=row.get('paymentAnomalyScore', 0),
            similarity_score=max_sim_score,
            compliance_flags=compliance_flags,
            work_data=row,
            similarity_matches=sim_matches,
            cost_evidence=cost_evidence,
            timeline_evidence=timeline_evidence,
            payment_evidence=payment_evidence,
            similarity_evidence=sim_evidence,
        )

        results.append(risk)

        # Progress indicator
        if (idx + 1) % 10000 == 0:
            print(f"  Scored {idx + 1:,} / {len(df):,} works...")

    # ── Export ──────────────────────────────────────────────────────────
    print(f"\n  Writing {len(results):,} risk scores to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)

    # ── Summary ────────────────────────────────────────────────────────
    distribution = risk_engine.get_distribution(results)
    elapsed = time.time() - start_time

    print("\n" + "=" * 65)
    print("  ✅ BATCH SCORING COMPLETE")
    print("=" * 65)
    print(f"\n  Total works scored: {len(results):,}")
    print(f"  Time elapsed:       {elapsed:.1f}s")
    print(f"\n  Risk Distribution:")
    for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
        count = distribution[level]
        pct = count / len(results) * 100
        bar = '█' * int(pct / 2)
        print(f"    {level:>8}: {count:>6,} ({pct:5.1f}%) {bar}")

    print(f"\n  Output files:")
    print(f"    Risk scores:    {output_path}")
    print(f"    ML features:    {features_path}")
    print(f"    Similarity:     {similarity_path}")
    print(f"    Model artefacts: {model_dir}/")

    # Also save a summary JSON
    summary = {
        "completedAt": pd.Timestamp.now().isoformat(),
        "totalWorks": len(results),
        "elapsedSeconds": round(elapsed, 1),
        "modelVersion": risk_engine.MODEL_VERSION,
        "riskDistribution": distribution,
        "flagCounts": {
            "costFlags": int(flagged_cost),
            "timelineFlags": int(flagged_time),
            "paymentFlags": int(flagged_pay),
            "similarityMatches": len(similarity_results),
        },
    }
    summary_path = os.path.join(data_dir, 'scoring_summary.json')
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"    Summary:        {summary_path}")
    print()


if __name__ == "__main__":
    main()
