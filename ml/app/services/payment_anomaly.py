"""
NIRIKSHAN — Model 3: Payment Anomaly Detection
================================================
Identifies unusual payment/expenditure patterns.

Approach: Isolation Forest on payment features
  - paymentCount, totalExpenditure, averagePayment, maxPayment
  - uniqueVendorCount, pendingPaymentCount, paymentVelocity

IMPORTANT: Only 327/87,272 works (0.4%) have payment data.
Works without payment records receive a neutral score (0.0).
Per AI-SPEC: "Missing data must not automatically become a risk signal."

Per AI-SPEC Section 6:
  "Identify unusual payment/expenditure patterns."
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
import joblib


class PaymentAnomalyDetector:
    """
    Payment anomaly detection using Isolation Forest.

    Only scores works that have payment records (paymentCount > 0).
    Works without payments get score = 0.0 (not anomalous, just no data).
    """

    MODEL_VERSION = "payment-anomaly-v1.0"

    FEATURE_COLS = [
        'paymentCount',
        'totalExpenditure',
        'averagePayment',
        'maxPayment',
        'uniqueVendorCount',
        'pendingPaymentCount',
        'paymentVelocity',
    ]

    def __init__(self, contamination: float = 0.10):
        self.contamination = contamination
        self.model = None
        self.scaler = None
        self._trained = False
        self._score_min: float = -1.0
        self._score_max: float = 1.0

    def _get_payment_mask(self, df: pd.DataFrame) -> pd.Series:
        """Return boolean mask for works that have payment data."""
        return df['paymentCount'].fillna(0).astype(float) > 0

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract and clean feature matrix for works WITH payments."""
        X = df[self.FEATURE_COLS].copy()
        X = X.fillna(0)
        return X.values

    def train(self, df: pd.DataFrame):
        """Train on works that have payment data."""
        mask = self._get_payment_mask(df)
        df_payments = df[mask].copy()

        if len(df_payments) < 10:
            print(f"  [Payment] Too few works with payment data ({len(df_payments)}). "
                  f"Model will return neutral scores.")
            self._trained = True
            self._too_few = True
            return

        self._too_few = False
        X_raw = self._prepare_features(df_payments)

        self.scaler = RobustScaler()
        X_scaled = self.scaler.fit_transform(X_raw)

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            max_samples='auto',
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)
        self._trained = True

        raw_scores = self.model.decision_function(X_scaled)
        self._score_min = raw_scores.min()
        self._score_max = raw_scores.max()

        anomaly_count = (self.model.predict(X_scaled) == -1).sum()
        print(f"  [Payment] Trained on {len(df_payments):,} works with payments. "
              f"Flagged {anomaly_count:,} anomalies ({anomaly_count/len(df_payments)*100:.1f}%)")
        print(f"  [Payment] {(~mask).sum():,} works have no payment data -> scored as 0.0 (neutral)")

    def predict(self, features: dict) -> float:
        """Score a single work. Returns 0.0–1.0."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        pay_count = features.get('paymentCount', 0)
        if not pay_count or float(pay_count) == 0:
            return 0.0  # No payment data → neutral

        if self._too_few:
            return 0.0

        X = np.array([[
            features.get(col, 0) for col in self.FEATURE_COLS
        ]])
        X_scaled = self.scaler.transform(X)
        raw_score = self.model.decision_function(X_scaled)[0]
        return self._normalise_score(raw_score)

    def batch_predict(self, df: pd.DataFrame) -> np.ndarray:
        """Score all works. Works without payment data get 0.0."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        scores = np.zeros(len(df))

        if self._too_few:
            return scores

        mask = self._get_payment_mask(df)
        if mask.any():
            df_payments = df[mask]
            X_raw = self._prepare_features(df_payments)
            X_scaled = self.scaler.transform(X_raw)
            raw_scores = self.model.decision_function(X_scaled)
            normalised = np.array([self._normalise_score(s) for s in raw_scores])
            scores[mask.values] = normalised

        return scores

    def _normalise_score(self, raw_score: float) -> float:
        """Convert IF raw score to 0–1 (1 = most anomalous)."""
        if self._score_max == self._score_min:
            return 0.5
        normalised = 1.0 - (raw_score - self._score_min) / (self._score_max - self._score_min)
        return float(np.clip(normalised, 0.0, 1.0))

    def get_evidence(self, work: pd.Series) -> dict | None:
        """Generate human-readable evidence for payment anomalies."""
        score = work.get('paymentAnomalyScore', 0)
        if score < 0.3:
            return None

        pay_count = work.get('paymentCount', 0)
        if not pd.notna(pay_count) or float(pay_count) == 0:
            return None

        severity = 'LOW' if score < 0.5 else 'MEDIUM' if score < 0.7 else 'HIGH'
        total_exp = work.get('totalExpenditure', 0)
        vendor_count = work.get('uniqueVendorCount', 0)
        pending = work.get('pendingPaymentCount', 0)
        velocity = work.get('paymentVelocity', 0)

        # Build contextual description
        reasons = []
        if pd.notna(vendor_count) and float(vendor_count) > 10:
            reasons.append(f"unusually high vendor count ({int(vendor_count)})")
        if pd.notna(pending) and float(pending) > 5:
            reasons.append(f"many pending payments ({int(pending)})")
        if pd.notna(velocity) and float(velocity) > 50000:
            reasons.append(f"high payment velocity (₹{float(velocity):,.0f}/day)")

        if reasons:
            description = f"Payment pattern flagged: {', '.join(reasons)}."
        else:
            description = (
                f"Payment pattern deviates from comparable works. "
                f"Total expenditure: ₹{float(total_exp):,.0f} across "
                f"{int(pay_count)} transactions."
            )

        return {
            "category": "PAYMENT",
            "severity": severity,
            "title": "Unusual Payment Pattern Detected",
            "description": description,
            "metrics": {
                "paymentCount": int(pay_count) if pd.notna(pay_count) else 0,
                "totalExpenditure": float(total_exp) if pd.notna(total_exp) else 0,
                "uniqueVendorCount": int(vendor_count) if pd.notna(vendor_count) else 0,
                "pendingPayments": int(pending) if pd.notna(pending) else 0,
            }
        }

    def save(self, path: str):
        """Save trained model to disk."""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'score_min': getattr(self, '_score_min', 0),
            'score_max': getattr(self, '_score_max', 1),
            'too_few': self._too_few,
            'version': self.MODEL_VERSION,
        }, path)

    def load(self, path: str):
        """Load trained model from disk."""
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self._score_min = data['score_min']
        self._score_max = data['score_max']
        self._too_few = data['too_few']
        self._trained = True
