"""
NIRIKSHAN — Model 1: Cost Anomaly Detection
=============================================
Identifies works whose financial characteristics deviate significantly
from their peer group (state × subCategory).

Approach: Isolation Forest + Statistical Z-Score Hybrid
  - Isolation Forest captures multi-dimensional anomalies
  - Z-Score provides interpretable, single-feature deviation measure
  - Final score = weighted blend of both

Per AI-SPEC Section 4:
  "Identify works whose financial characteristics are unusual
   compared with relevant peer works."
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
import joblib


class CostAnomalyDetector:
    """
    Cost anomaly detection using Isolation Forest + Z-Score hybrid.

    Features used:
      - recommendedAmount (log-transformed)
      - finalToRecommendedRatio
      - costZScore (peer-relative deviation)
      - subCategory_encoded
      - state_encoded

    Outputs score 0.0 (normal) to 1.0 (highly anomalous) per work.
    """

    MODEL_VERSION = "cost-anomaly-v1.0"

    FEATURE_COLS = [
        'amountLog',
        'finalToRecommendedRatio',
        'costZScore',
        'subCategory_encoded',
        'state_encoded',
    ]

    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.model = None
        self.scaler = None
        self._trained = False
        self._score_min: float = -1.0
        self._score_max: float = 1.0

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract and clean feature matrix from DataFrame."""
        X = df[self.FEATURE_COLS].copy()
        X = X.fillna(0)
        return X.values

    def train(self, df: pd.DataFrame):
        """Train the Isolation Forest on the full dataset."""
        X_raw = self._prepare_features(df)

        # RobustScaler is better than StandardScaler for data with outliers
        # (it uses median/IQR instead of mean/std)
        self.scaler = RobustScaler()
        X_scaled = self.scaler.fit_transform(X_raw)

        self.model = IsolationForest(
            n_estimators=200,
            contamination=self.contamination,
            max_samples='auto',
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)
        self._trained = True

        # Compute score bounds for normalisation
        raw_scores = self.model.decision_function(X_scaled)
        self._score_min = raw_scores.min()
        self._score_max = raw_scores.max()

        anomaly_count = (self.model.predict(X_scaled) == -1).sum()
        print(f"  [Cost] Trained on {len(X_scaled):,} works. "
              f"Flagged {anomaly_count:,} anomalies ({anomaly_count/len(X_scaled)*100:.1f}%)")

    def predict(self, features: dict) -> float:
        """Score a single work. Returns 0.0–1.0 (higher = more anomalous)."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        X = np.array([[
            features.get('amountLog', 0),
            features.get('finalToRecommendedRatio', 0),
            features.get('costZScore', 0),
            features.get('subCategory_encoded', 0),
            features.get('state_encoded', 0),
        ]])
        X_scaled = self.scaler.transform(X)
        raw_score = self.model.decision_function(X_scaled)[0]
        return self._normalise_score(raw_score)

    def batch_predict(self, df: pd.DataFrame) -> np.ndarray:
        """Score all works in the DataFrame. Returns array of 0.0–1.0 scores."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        X_raw = self._prepare_features(df)
        X_scaled = self.scaler.transform(X_raw)
        raw_scores = self.model.decision_function(X_scaled)

        # Normalise: IF decision_function returns negative for anomalies
        # We invert and scale to 0–1 where 1 = most anomalous
        scores = np.array([self._normalise_score(s) for s in raw_scores])
        return scores

    def _normalise_score(self, raw_score: float) -> float:
        """
        Convert Isolation Forest raw score to 0–1 range.
        IF returns negative scores for anomalies, positive for normal.
        We invert: 1.0 = most anomalous, 0.0 = most normal.
        """
        if self._score_max == self._score_min:
            return 0.5
        # Linear normalisation with inversion
        normalised = 1.0 - (raw_score - self._score_min) / (self._score_max - self._score_min)
        return float(np.clip(normalised, 0.0, 1.0))

    def get_evidence(self, work: pd.Series) -> dict | None:
        """
        Generate human-readable evidence for a flagged work.
        Returns None if the work is not anomalous enough.
        """
        score = work.get('costAnomalyScore', 0)
        if score < 0.3:
            return None

        rec_amt = work.get('recommendedAmount', 0)
        peer_median = work.get('peerMedianCost', 0)
        z_score = work.get('costZScore', 0)
        ratio = work.get('finalToRecommendedRatio', 0)

        severity = 'LOW' if score < 0.5 else 'MEDIUM' if score < 0.7 else 'HIGH'

        # Build explanation
        if peer_median and peer_median > 0 and rec_amt > 0:
            deviation = rec_amt / peer_median
            description = (
                f"Recommended amount (₹{rec_amt:,.0f}) is "
                f"{deviation:.1f}× the peer median (₹{peer_median:,.0f}) "
                f"for similar works in the same state."
            )
        elif ratio and ratio > 1.5:
            description = (
                f"Final amount is {ratio:.1f}× the originally recommended amount, "
                f"indicating a significant cost overrun."
            )
        else:
            description = (
                f"Cost pattern deviates from peer works (z-score: {z_score:.1f})."
            )

        return {
            "category": "COST",
            "severity": severity,
            "title": "Cost Exceeds Peer Benchmark" if peer_median and rec_amt > peer_median else "Cost Anomaly Detected",
            "description": description,
            "metrics": {
                "recommendedAmount": float(rec_amt) if pd.notna(rec_amt) else 0,
                "peerMedianAmount": float(peer_median) if pd.notna(peer_median) else 0,
                "deviationRatio": round(float(rec_amt / peer_median), 2) if peer_median and peer_median > 0 else 0,
                "costZScore": round(float(z_score), 2) if pd.notna(z_score) else 0,
            }
        }

    def save(self, path: str):
        """Save trained model to disk."""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'score_min': self._score_min,
            'score_max': self._score_max,
            'version': self.MODEL_VERSION,
        }, path)
        print(f"  [Cost] Model saved to {path}")

    def load(self, path: str):
        """Load trained model from disk."""
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self._score_min = data['score_min']
        self._score_max = data['score_max']
        self._trained = True
        print(f"  [Cost] Model loaded from {path} (version: {data['version']})")
