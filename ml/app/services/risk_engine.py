"""
NIRIKSHAN — Risk Engine
========================
Combines all ML model scores and compliance flags into a unified
0–100 risk score with explainable evidence.

Per AI-SPEC Section 11:
  "The Risk Engine combines all available signals."
  "The initial design is a weighted combination of validated signals.
   Weights must remain configurable."

Per AI-SPEC Section 13 (Explainability):
  "Every risk assessment should answer: Why was this work flagged?"
"""

import numpy as np
import pandas as pd
from datetime import datetime, timezone


class RiskEngine:
    """
    Central risk aggregation engine.

    Combines:
      - Cost anomaly score (0–1)
      - Timeline anomaly score (0–1)
      - Payment anomaly score (0–1)
      - Similarity score (0–1)
      - Compliance flags

    Output:
      - overallRiskScore: 0–100
      - riskLevel: LOW / MEDIUM / HIGH / CRITICAL
      - flags: [str]
      - explainability: {summary, evidence: [{category, severity, title, ...}]}
    """

    MODEL_VERSION = "nirikshan-ml-v1.0"

    # Default weights (configurable)
    DEFAULT_WEIGHTS = {
        'cost': 0.35,
        'timeline': 0.30,
        'payment': 0.20,
        'similarity': 0.15,
    }

    # Risk level thresholds (per AI-SPEC §12)
    RISK_THRESHOLDS = {
        'LOW': (0, 24),
        'MEDIUM': (25, 49),
        'HIGH': (50, 74),
        'CRITICAL': (75, 100),
    }

    # Flag name mapping
    FLAG_NAMES = {
        'cost': 'COST_OVERRUN_RISK',
        'timeline': 'TIMELINE_DELAY_RISK',
        'payment': 'PAYMENT_ANOMALY_RISK',
        'similarity': 'POTENTIAL_DUPLICATE_WORK',
    }

    # Score thresholds for generating flags
    FLAG_THRESHOLD = 0.5  # Only flag if sub-score > 0.5

    def __init__(self, weights: dict | None = None):
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()

    def compute(
        self,
        cost_score: float,
        timeline_score: float,
        payment_score: float,
        similarity_score: float,
        compliance_flags: list[dict],
        work_data: pd.Series,
        similarity_matches: list[dict] | None = None,
        cost_evidence: dict | None = None,
        timeline_evidence: dict | None = None,
        payment_evidence: dict | None = None,
        similarity_evidence: dict | None = None,
    ) -> dict:
        """
        Compute the unified risk assessment for a single work.

        Args:
            cost_score: 0–1 from CostAnomalyDetector
            timeline_score: 0–1 from TimelineAnomalyDetector
            payment_score: 0–1 from PaymentAnomalyDetector
            similarity_score: 0–1 max similarity score
            compliance_flags: list of triggered compliance rules
            work_data: full work row (pd.Series)
            *_evidence: pre-computed evidence dicts from each model

        Returns:
            dict matching the 08-INTEGRATION-FLOW.md contract
        """
        # ── 1. Weighted combination → 0–100 ───────────────────────────
        raw_score = (
            self.weights['cost'] * float(cost_score or 0)
            + self.weights['timeline'] * float(timeline_score or 0)
            + self.weights['payment'] * float(payment_score or 0)
            + self.weights['similarity'] * float(similarity_score or 0)
        ) * 100

        # Compliance boost: each HIGH compliance flag adds up to 5 points
        compliance_boost = 0
        for flag in compliance_flags:
            sev = flag.get('severity', 'LOW')
            if sev == 'HIGH':
                compliance_boost += 5
            elif sev == 'MEDIUM':
                compliance_boost += 2

        overall_score = int(np.clip(raw_score + compliance_boost, 0, 100))

        # ── 2. Risk level ─────────────────────────────────────────────
        risk_level = self._score_to_level(overall_score)

        # ── 3. Flags ──────────────────────────────────────────────────
        flags = []
        scores = {
            'cost': float(cost_score or 0),
            'timeline': float(timeline_score or 0),
            'payment': float(payment_score or 0),
            'similarity': float(similarity_score or 0),
        }

        for key, score in scores.items():
            if score >= self.FLAG_THRESHOLD:
                flags.append(self.FLAG_NAMES[key])

        for cflag in compliance_flags:
            rule_name = cflag.get('rule', 'COMPLIANCE_FLAG')
            if rule_name not in flags:
                flags.append(rule_name)

        # ── 4. Explainability ─────────────────────────────────────────
        evidence_items = []

        if cost_evidence:
            evidence_items.append(cost_evidence)
        if timeline_evidence:
            evidence_items.append(timeline_evidence)
        if payment_evidence:
            evidence_items.append(payment_evidence)
        if similarity_evidence:
            evidence_items.append(similarity_evidence)

        # Add compliance flags as evidence
        for cflag in compliance_flags:
            evidence_items.append({
                "category": "COMPLIANCE",
                "severity": cflag.get('severity', 'LOW'),
                "title": cflag.get('title', 'Compliance Flag'),
                "description": cflag.get('description', ''),
                "metrics": cflag.get('metrics', {}),
            })

        # Sort evidence by severity (HIGH first)
        severity_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        evidence_items.sort(key=lambda e: severity_order.get(e.get('severity', 'LOW'), 3))

        # Summary
        summary = self._build_summary(work_data, flags, overall_score, evidence_items)

        # ── 5. Build output ───────────────────────────────────────────
        work_id = str(work_data.get('workId', ''))

        return {
            "workId": work_id,
            "modelVersion": self.MODEL_VERSION,
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "overallRiskScore": overall_score,
            "riskLevel": risk_level,
            "flags": flags,
            "scores": {
                "costAnomalyScore": round(float(cost_score or 0) * 100, 1),
                "timelineDelayScore": round(float(timeline_score or 0) * 100, 1),
                "paymentAnomalyScore": round(float(payment_score or 0) * 100, 1),
                "duplicateSimilarityScore": round(float(similarity_score or 0) * 100, 1),
            },
            "explainability": {
                "summary": summary,
                "evidence": evidence_items,
            }
        }

    def _score_to_level(self, score: int) -> str:
        """Convert 0–100 score to risk level string."""
        if score >= 75:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 25:
            return "MEDIUM"
        else:
            return "LOW"

    def _build_summary(self, work: pd.Series, flags: list[str],
                       score: int, evidence: list[dict]) -> str:
        """Build a human-readable summary of why this work was flagged."""
        if not flags and score < 25:
            return "No significant risk signals detected."

        parts = []

        if score >= 75:
            parts.append("Work flagged as CRITICAL risk")
        elif score >= 50:
            parts.append("Work flagged as HIGH risk")
        elif score >= 25:
            parts.append("Work flagged as MEDIUM risk")
        else:
            parts.append("Minor risk signals detected")

        # Add top reasons
        reasons = []
        for ev in evidence[:3]:  # Top 3 evidence items
            title = ev.get('title', '')
            if title:
                reasons.append(title.lower())

        if reasons:
            parts.append("due to " + ", ".join(reasons))

        return " ".join(parts) + "."

    def get_distribution(self, results: list[dict]) -> dict:
        """Compute risk distribution from batch results."""
        dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for r in results:
            level = r.get('riskLevel', 'LOW')
            dist[level] = dist.get(level, 0) + 1
        return dist
