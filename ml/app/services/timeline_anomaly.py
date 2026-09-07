"""
NIRIKSHAN — Model 2: Timeline / Delay Detection
=================================================
Identifies works with unusual implementation timelines compared to peers.

Approach: Statistical peer comparison + threshold rules
  - Z-score of implementation duration vs peer group
  - Delay ratio for in-progress works (actual elapsed / expected duration)
  - Hard rules for extreme delays (>2 years stalled)

Per AI-SPEC Section 5:
  "Identify works showing unusual implementation duration or delay."
"""

import numpy as np
import pandas as pd


class TimelineAnomalyDetector:
    """
    Timeline anomaly detection using statistical peer comparison.

    Unlike the cost model, this doesn't use Isolation Forest because:
    1. Timeline anomalies are well-captured by simple peer comparison
    2. Z-scores are more interpretable for time-based deviations
    3. Hard rules (>1 year stalled) are domain-meaningful

    Outputs score 0.0 (normal) to 1.0 (severely delayed) per work.
    """

    MODEL_VERSION = "timeline-anomaly-v1.0"

    # Thresholds (configurable)
    SEVERE_DELAY_DAYS = 730    # 2 years — strong delay signal
    STALLED_DAYS = 365         # 1 year without completion
    SANCTION_LAG_THRESHOLD = 60  # MPLADS says 30-60 days for sanction

    def __init__(self):
        self._trained = False
        self._global_median_duration = None
        self._global_std_duration = None

    def train(self, df: pd.DataFrame):
        """
        Compute global statistics needed for scoring.
        Timeline model doesn't use ML — it's purely statistical.
        """
        # Global stats for completed works
        completed = df[df['workStatus'] == 'COMPLETED']
        if len(completed) > 0 and 'implementationDays' in completed.columns:
            valid_durations = completed['implementationDays'].dropna()
            if len(valid_durations) > 0:
                self._global_median_duration = valid_durations.median()
                self._global_std_duration = valid_durations.std()
            else:
                self._global_median_duration = 300  # reasonable default
                self._global_std_duration = 150
        else:
            self._global_median_duration = 300
            self._global_std_duration = 150

        # Stats for in-progress works
        in_progress = df[df['workStatus'] == 'IN_PROGRESS']
        active_days = in_progress['daysSinceRecommendation'].dropna()
        if len(active_days) > 0:
            self._active_median = active_days.median()
            self._active_p90 = active_days.quantile(0.90)
        else:
            self._active_median = 200
            self._active_p90 = 500

        self._trained = True
        print(f"  [Timeline] Stats computed. Global median duration: "
              f"{self._global_median_duration:.0f} days, "
              f"Active median: {self._active_median:.0f} days")

    def predict(self, features: dict) -> float:
        """Score a single work. Returns 0.0–1.0."""
        return self._compute_score(
            work_status=features.get('workStatus', 'IN_PROGRESS'),
            implementation_days=features.get('implementationDays'),
            days_since_rec=features.get('daysSinceRecommendation'),
            sanction_lag=features.get('sanctionLagDays'),
            timeline_z=features.get('timelineZScore'),
            delay_ratio=features.get('delayRatio'),
            peer_median_dur=features.get('peerMedianDuration'),
        )

    def batch_predict(self, df: pd.DataFrame) -> np.ndarray:
        """Score all works. Returns array of 0.0–1.0 scores."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        scores = []
        for _, row in df.iterrows():
            score = self._compute_score(
                work_status=row.get('workStatus', 'IN_PROGRESS'),
                implementation_days=row.get('implementationDays'),
                days_since_rec=row.get('daysSinceRecommendation'),
                sanction_lag=row.get('sanctionLagDays'),
                timeline_z=row.get('timelineZScore'),
                delay_ratio=row.get('delayRatio'),
                peer_median_dur=row.get('peerMedianDuration'),
            )
            scores.append(score)

        return np.array(scores)

    def _compute_score(self, work_status, implementation_days,
                       days_since_rec, sanction_lag,
                       timeline_z, delay_ratio, peer_median_dur) -> float:
        """
        Compute timeline anomaly score for a single work.

        Scoring components (each 0–1, then blended):
          1. Duration deviation (z-score or delay ratio)
          2. Sanction lag score
          3. Stalled/severe delay rules
        """
        component_scores = []
        weights = []

        # ── Component 1: Duration / Delay Score ────────────────────────
        if work_status == 'COMPLETED' and pd.notna(implementation_days):
            # For completed works: z-score vs peers
            if pd.notna(timeline_z):
                # Map z-score to 0–1: z=0 → 0, z=2 → 0.6, z=3 → 0.8, z>4 → 1.0
                dur_score = min(abs(float(timeline_z)) / 4.0, 1.0)
            else:
                # Fall back to global comparison
                if self._global_std_duration and self._global_std_duration > 0:
                    z = abs(float(implementation_days) - self._global_median_duration) / self._global_std_duration
                    dur_score = min(z / 4.0, 1.0)
                else:
                    dur_score = 0.0
            component_scores.append(dur_score)
            weights.append(0.6)

        elif work_status == 'IN_PROGRESS' and pd.notna(days_since_rec):
            days = float(days_since_rec)
            # Hard rules
            if days >= self.SEVERE_DELAY_DAYS:
                dur_score = 1.0
            elif days >= self.STALLED_DAYS:
                # Linear interpolation from 0.5 to 1.0
                dur_score = 0.5 + 0.5 * (days - self.STALLED_DAYS) / (self.SEVERE_DELAY_DAYS - self.STALLED_DAYS)
            elif pd.notna(delay_ratio) and float(delay_ratio) > 1.0:
                # Taking longer than peer median expected
                dr = float(delay_ratio)
                dur_score = min((dr - 1.0) / 2.0, 0.8)  # cap at 0.8 for delay ratio
            else:
                # Normal progress
                dur_score = min(days / (self.STALLED_DAYS * 1.5), 0.3)
            component_scores.append(dur_score)
            weights.append(0.6)

        # ── Component 2: Sanction Lag Score ────────────────────────────
        if pd.notna(sanction_lag):
            lag = float(sanction_lag)
            if lag > self.SANCTION_LAG_THRESHOLD:
                # Over 60 days = increasingly anomalous
                lag_score = min((lag - self.SANCTION_LAG_THRESHOLD) / 120.0, 1.0)
            else:
                lag_score = 0.0
            component_scores.append(lag_score)
            weights.append(0.4)

        # ── Blend ──────────────────────────────────────────────────────
        if not component_scores:
            return 0.0

        total_weight = sum(weights)
        blended = sum(s * w for s, w in zip(component_scores, weights)) / total_weight
        return float(np.clip(blended, 0.0, 1.0))

    def get_evidence(self, work: pd.Series) -> dict | None:
        """Generate human-readable evidence for timeline anomalies."""
        score = work.get('timelineAnomalyScore', 0)
        if score < 0.3:
            return None

        severity = 'LOW' if score < 0.5 else 'MEDIUM' if score < 0.7 else 'HIGH'
        status = work.get('workStatus', 'IN_PROGRESS')

        if status == 'IN_PROGRESS':
            days = work.get('daysSinceRecommendation', 0)
            peer_med = work.get('peerMedianDuration', 0)

            if pd.notna(days) and float(days) >= self.SEVERE_DELAY_DAYS:
                title = "Severely Stalled Work"
                description = (
                    f"Work has been in progress for {int(days)} days "
                    f"({int(days)//365} years) without completion."
                )
            elif pd.notna(days) and float(days) >= self.STALLED_DAYS:
                title = "Extended Implementation Delay"
                description = (
                    f"Work has been in progress for {int(days)} days "
                    f"(>{self.STALLED_DAYS} day threshold)."
                )
            else:
                title = "Timeline Deviation Detected"
                description = (
                    f"Work elapsed {int(days) if pd.notna(days) else '?'} days. "
                    f"Peer median: {int(peer_med) if pd.notna(peer_med) else '?'} days."
                )

            metrics = {
                "daysSinceRecommendation": int(days) if pd.notna(days) else 0,
                "peerMedianDuration": int(peer_med) if pd.notna(peer_med) else 0,
            }
        else:
            impl_days = work.get('implementationDays', 0)
            peer_med = work.get('peerMedianDuration', 0)
            title = "Unusual Implementation Duration"
            description = (
                f"Completed in {int(impl_days) if pd.notna(impl_days) else '?'} days "
                f"(peer median: {int(peer_med) if pd.notna(peer_med) else '?'} days)."
            )
            metrics = {
                "implementationDays": int(impl_days) if pd.notna(impl_days) else 0,
                "peerMedianDuration": int(peer_med) if pd.notna(peer_med) else 0,
            }

        sanction_lag = work.get('sanctionLagDays', 0)
        if pd.notna(sanction_lag):
            metrics["sanctionLagDays"] = int(sanction_lag)

        return {
            "category": "TIMELINE",
            "severity": severity,
            "title": title,
            "description": description,
            "metrics": metrics,
        }
