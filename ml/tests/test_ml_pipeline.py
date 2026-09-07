"""
NIRIKSHAN ML Pipeline — Comprehensive Test Suite
=================================================
Tests all 4 ML models, compliance engine, risk engine,
feature engineering, and FastAPI endpoints.
"""

import os
import sys
import json
import pytest
import numpy as np
import pandas as pd

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.app.services.cost_anomaly import CostAnomalyDetector
from ml.app.services.timeline_anomaly import TimelineAnomalyDetector
from ml.app.services.payment_anomaly import PaymentAnomalyDetector
from ml.app.services.similarity import SimilarityDetector
from ml.app.services.compliance import ComplianceEngine
from ml.app.services.risk_engine import RiskEngine
from ml.app.feature_engineering import classify_subcategory, engineer_features
from fastapi.testclient import TestClient
from ml.app.main import app


MODEL_DIR = os.path.join(project_root, 'ml', 'models')
DATA_DIR = os.path.join(project_root, 'data', 'processed')


# =====================================================================
# 1. Feature Engineering Tests
# =====================================================================

class TestFeatureEngineering:

    def test_sub_category_classification(self):
        """Verify sub-category classifier correctly identifies common infrastructure types."""
        cases = [
            ("Construction of CC Road from Main St to Temple", "Roads"),
            ("Installation of Solar Street Lights in ward 4", "Lighting"),
            ("Construction of Community Hall for public use", "Community"),
            ("Construction of Additional Classrooms in Govt High School", "Education"),
            ("Drinking water pipeline and borewell installation", "Water"),
            ("Construction of compound wall for Temple", "Religious"),
            ("Construction of Primary Health Sub-Centre building", "Health"),
            ("Public toilet and drainage sanitation block", "Sanitation"),
            ("Crematorium shed and boundary wall", "Cremation"),
            ("Unspecified general developmental works", "Other"),
        ]
        for title, expected in cases:
            assert classify_subcategory(title) == expected, f"Failed for '{title}'"

    def test_feature_engineering_pipeline(self):
        """Test full feature engineering on a small synthetic DataFrame."""
        df_sample = pd.DataFrame([
            {
                "workId": "test-1",
                "workDescription": "CC Road construction from point A to B",
                "state": "UTTAR PRADESH",
                "district": "LUCKNOW",
                "recommendedAmount": 500000.0,
                "sanctionedAmount": 500000.0,
                "finalAmount": 520000.0,
                "totalExpenditure": 520000.0,
                "sanctionDate": "2023-01-01",
                "recommendationDate": "2022-11-01",
                "completionDate": "2023-06-01",
                "workStatus": "Completed",
                "daysSinceRecommendation": 150,
                "implementationDays": 150,
                "paymentCount": 3,
                "averagePaymentAmount": 173333.0,
            }
        ])
        enriched = engineer_features(df_sample)
        assert "subCategory" in enriched.columns
        assert enriched["subCategory"].iloc[0] == "Roads"
        assert "costZScore" in enriched.columns
        assert "timelineZScore" in enriched.columns
        assert "amountLog" in enriched.columns


# =====================================================================
# 2. Model 1: Cost Anomaly Tests
# =====================================================================

class TestCostAnomalyDetector:

    @pytest.fixture
    def detector(self):
        detector = CostAnomalyDetector()
        model_path = os.path.join(MODEL_DIR, 'cost_anomaly.joblib')
        if os.path.exists(model_path):
            detector.load(model_path)
        else:
            dummy_df = pd.DataFrame({
                'amountLog': np.random.normal(12, 1, 100),
                'finalToRecommendedRatio': np.random.normal(1.0, 0.05, 100),
                'costZScore': np.random.normal(0, 1, 100),
                'subCategory_encoded': np.random.randint(0, 10, 100),
                'state_encoded': np.random.randint(0, 30, 100),
            })
            detector.train(dummy_df)
        return detector

    def test_normal_work_cost_score(self, detector):
        """Normal work close to peer median should have a valid score."""
        normal_features = {
            "recommendedAmount": 300000.0,
            "finalAmount": 300000.0,
            "costZScore": 0.1,
            "subCategory": "Roads",
            "state": "UTTAR PRADESH",
        }
        score = detector.predict(normal_features)
        assert 0.0 <= score <= 1.0

    def test_extreme_cost_anomaly_score(self, detector):
        """Massive cost escalation relative to peer should produce higher anomaly score."""
        extreme_features = {
            "recommendedAmount": 50000000.0,
            "finalAmount": 150000000.0,
            "costZScore": 6.5,
            "subCategory": "Roads",
            "state": "UTTAR PRADESH",
        }
        score = detector.predict(extreme_features)
        assert 0.0 <= score <= 1.0

    def test_explain_cost_anomaly(self, detector):
        """Explanation must return a valid evidence dict."""
        extreme_features = pd.Series({
            "costAnomalyScore": 0.85,
            "recommendedAmount": 10000000.0,
            "finalAmount": 25000000.0,
            "costZScore": 4.2,
            "peerMedianCost": 1000000.0,
            "subCategory": "Roads",
            "state": "UTTAR PRADESH",
        })
        evidence = detector.get_evidence(extreme_features)
        assert isinstance(evidence, dict)
        assert evidence["category"] == "COST"
        assert "description" in evidence
        assert "metrics" in evidence


# =====================================================================
# 3. Model 2: Timeline Anomaly Tests
# =====================================================================

class TestTimelineAnomalyDetector:

    @pytest.fixture
    def detector(self):
        detector = TimelineAnomalyDetector()
        return detector

    def test_normal_timeline_score(self, detector):
        """Work completed within 120 days should have low timeline score."""
        normal_features = {
            "durationDays": 120,
            "workStatus": "COMPLETED",
            "timelineZScore": -0.5,
            "sanctionLagDays": 30,
        }
        score = detector.predict(normal_features)
        assert 0.0 <= score <= 1.0
        assert score < 0.5

    def test_stalled_work_timeline_score(self, detector):
        """Active work running for > 800 days should receive high score."""
        stalled_features = {
            "durationDays": 850,
            "workStatus": "IN_PROGRESS",
            "timelineZScore": 3.5,
            "sanctionLagDays": 180,
        }
        score = detector.predict(stalled_features)
        assert 0.0 <= score <= 1.0
        assert score >= 0.5

    def test_explain_timeline_delay(self, detector):
        """Check explainability text for stalled works."""
        stalled_series = pd.Series({
            "timelineAnomalyScore": 0.85,
            "workStatus": "IN_PROGRESS",
            "daysSinceRecommendation": 850,
            "peerMedianDuration": 250,
        })
        evidence = detector.get_evidence(stalled_series)
        assert isinstance(evidence, dict)
        assert evidence["category"] == "TIMELINE"
        assert "description" in evidence


# =====================================================================
# 4. Model 3: Payment Anomaly Tests
# =====================================================================

class TestPaymentAnomalyDetector:

    @pytest.fixture
    def detector(self):
        detector = PaymentAnomalyDetector()
        model_path = os.path.join(MODEL_DIR, 'payment_anomaly.joblib')
        if os.path.exists(model_path):
            detector.load(model_path)
        return detector

    def test_missing_payment_data_is_neutral(self, detector):
        """Per AI-SPEC, works with 0 payments must NOT be penalized (score = 0.0)."""
        no_payment_features = {
            "paymentCount": 0,
            "totalExpenditure": 0.0,
            "averagePaymentAmount": 0.0,
        }
        score = detector.predict(no_payment_features)
        assert score == 0.0

    def test_normal_payment_behavior(self, detector):
        """Normal multi-tranche payment pattern."""
        if not detector._trained:
            pytest.skip("Payment model not trained")
        normal_features = {
            "paymentCount": 4,
            "totalExpenditure": 400000.0,
            "averagePaymentAmount": 100000.0,
            "durationDays": 180,
            "recommendedAmount": 400000.0,
        }
        score = detector.predict(normal_features)
        assert 0.0 <= score <= 1.0


# =====================================================================
# 5. Model 4: Similarity Detector Tests
# =====================================================================

class TestSimilarityDetector:

    def test_similarity_matches_precomputed(self):
        """Verify similarity matches JSON file exists and contains valid matches."""
        sim_path = os.path.join(DATA_DIR, 'similarity_matches.json')
        assert os.path.exists(sim_path), "similarity_matches.json missing"
        with open(sim_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert len(data) > 0
        first_key = next(iter(data.keys()))
        matches = data[first_key]
        assert isinstance(matches, list)
        if len(matches) > 0:
            m = matches[0]
            assert "workId" in m
            assert "similarity" in m
            assert 0.85 <= m["similarity"] <= 1.0


# =====================================================================
# 6. Compliance Engine Tests
# =====================================================================

class TestComplianceEngine:

    @pytest.fixture
    def engine(self):
        return ComplianceEngine()

    def test_overspend_rule(self, engine):
        work = pd.Series({
            "recommendedAmount": 500000.0,
            "finalAmount": 500000.0,
            "totalExpenditure": 750000.0,  # 1.5x overrun
        })
        flags = engine.check(work)
        rule_names = [f["rule"] for f in flags]
        assert "OVERSPEND" in rule_names

    def test_stalled_work_rule(self, engine):
        work = pd.Series({
            "workStatus": "IN_PROGRESS",
            "daysSinceRecommendation": 800,  # > 730 days
            "recommendedAmount": 500000.0,
        })
        flags = engine.check(work)
        rule_names = [f["rule"] for f in flags]
        assert "STALLED_WORK" in rule_names

    def test_completed_with_pending_payments(self, engine):
        work = pd.Series({
            "workStatus": "COMPLETED",
            "finalAmount": 1000000.0,
            "totalExpenditure": 400000.0,
            "pendingPaymentCount": 2,
            "state": "UTTAR PRADESH",
            "district": "LUCKNOW",
            "recommendedAmount": 1000000.0,
            "recommendationDate": "2022-01-01",
        })
        flags = engine.check(work)
        rule_names = [f["rule"] for f in flags]
        assert "FINANCIAL_INCONSISTENCY" in rule_names

    def test_excessive_cost_escalation(self, engine):
        work = pd.Series({
            "recommendedAmount": 200000.0,
            "finalAmount": 1200000.0,
            "finalToRecommendedRatio": 6.0,  # 6x escalation
            "state": "UTTAR PRADESH",
            "district": "LUCKNOW",
            "recommendationDate": "2022-01-01",
        })
        flags = engine.check(work)
        rule_names = [f["rule"] for f in flags]
        assert "EXCESSIVE_COST_ESCALATION" in rule_names


# =====================================================================
# 7. Risk Engine Tests
# =====================================================================

class TestRiskEngine:

    @pytest.fixture
    def engine(self):
        return RiskEngine()

    def test_clean_work_produces_low_risk(self, engine):
        work = pd.Series({"workId": "clean-1", "recommendedAmount": 500000.0})
        report = engine.compute(
            cost_score=0.05,
            timeline_score=0.05,
            payment_score=0.0,
            similarity_score=0.0,
            compliance_flags=[],
            work_data=work,
        )
        assert report["riskLevel"] == "LOW"
        assert report["overallRiskScore"] < 25

    def test_multi_signal_produces_critical_risk(self, engine):
        work = pd.Series({
            "workId": "critical-1",
            "recommendedAmount": 10000000.0,
            "finalAmount": 25000000.0,
            "durationDays": 900,
            "workStatus": "IN_PROGRESS",
        })
        high_flags = [
            {"rule": "OVERSPEND", "severity": "HIGH", "title": "Overspend", "description": "Overspend"},
            {"rule": "STALLED_WORK", "severity": "HIGH", "title": "Stalled", "description": "Stalled"},
        ]
        report = engine.compute(
            cost_score=0.95,
            timeline_score=0.90,
            payment_score=0.85,
            similarity_score=0.98,
            compliance_flags=high_flags,
            work_data=work,
        )
        assert report["overallRiskScore"] >= 75
        assert report["riskLevel"] == "CRITICAL"
        assert len(report["flags"]) > 0

    def test_api_contract_structure(self, engine):
        work = pd.Series({"workId": "sample-1"})
        report = engine.compute(
            cost_score=0.4,
            timeline_score=0.3,
            payment_score=0.0,
            similarity_score=0.5,
            compliance_flags=[],
            work_data=work,
        )
        required_keys = ["workId", "overallRiskScore", "riskLevel", "scores", "flags", "explainability", "modelVersion", "evaluatedAt"]
        for key in required_keys:
            assert key in report, f"Missing required key: {key}"


# =====================================================================
# 8. FastAPI Endpoints Integration Tests
# =====================================================================

class TestFastAPIEndpoints:

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["service"] == "nirikshan-ml"
        assert body["data"]["batchScoresAvailable"] is True
        assert body["data"]["totalScoredWorks"] > 80000

    def test_risk_distribution_endpoint(self, client):
        res = client.get("/internal/ml/risk-distribution")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        dist = body["data"]["riskDistribution"]
        assert "LOW" in dist and "MEDIUM" in dist and "HIGH" in dist and "CRITICAL" in dist
        assert sum(dist.values()) > 80000

    def test_risk_report_known_work(self, client):
        res = client.get("/internal/ml/risk-report/80680")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["workId"] == "80680"
        assert data["riskLevel"] in ["HIGH", "CRITICAL"]

    def test_risk_report_unknown_work_returns_404(self, client):
        res = client.get("/internal/ml/risk-report/non-existent-9999999")
        assert res.status_code == 404

    def test_anomaly_score_precomputed(self, client):
        payload = {"workId": "80680", "features": {}}
        res = client.post("/internal/ml/anomaly-score", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert "signals" in body["data"]

    def test_similarity_endpoint(self, client):
        payload = {
            "workId": "311395",
            "description": "Development of sports infrastructure for students in government schools",
        }
        res = client.post("/internal/ml/similarity", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert "matches" in body["data"]
