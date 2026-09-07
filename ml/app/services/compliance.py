"""
NIRIKSHAN — Compliance Rule Engine
====================================
Deterministic rules for compliance indicators.
These are NOT ML models — they are domain-specific hard rules
based on MPLADS guidelines and good governance practices.

Per AI-SPEC Section 8:
  "Only rules supported by available data and authoritative norms
   should be presented as actual compliance violations.
   Otherwise use 'Compliance Indicator' or 'Needs Review'."
"""

import pandas as pd


class ComplianceEngine:
    """
    Deterministic compliance rule engine.

    Each rule returns a flag dict if triggered, or None if not applicable.
    Rules are conservative — they flag for human review, not automatic action.
    """

    MODEL_VERSION = "compliance-rules-v1.0"

    def check(self, work: pd.Series) -> list[dict]:
        """
        Run all compliance rules against a single work.
        Returns a list of triggered compliance flags.
        """
        flags = []

        result = self._rule_overspend(work)
        if result:
            flags.append(result)

        result = self._rule_stalled_work(work)
        if result:
            flags.append(result)

        result = self._rule_completed_pending_payments(work)
        if result:
            flags.append(result)

        result = self._rule_missing_critical_data(work)
        if result:
            flags.append(result)

        result = self._rule_excessive_cost_ratio(work)
        if result:
            flags.append(result)

        result = self._rule_sanction_delay(work)
        if result:
            flags.append(result)

        return flags

    def batch_check(self, df: pd.DataFrame) -> list[list[dict]]:
        """Run all compliance rules against all works."""
        results = []
        for _, row in df.iterrows():
            results.append(self.check(row))
        return results

    # ── Individual Rules ───────────────────────────────────────────────

    def _rule_overspend(self, work: pd.Series) -> dict | None:
        """
        Rule: Expenditure significantly exceeds approved/final amount.
        Trigger: totalExpenditure > finalAmount * 1.2 (20% overrun)
        """
        total_exp = work.get('totalExpenditure', 0)
        final_amt = work.get('finalAmount', 0)

        if not pd.notna(total_exp) or not pd.notna(final_amt):
            return None
        if float(total_exp) == 0 or float(final_amt) == 0:
            return None

        ratio = float(total_exp) / float(final_amt)
        if ratio > 1.2:
            return {
                "rule": "OVERSPEND",
                "severity": "HIGH" if ratio > 1.5 else "MEDIUM",
                "title": "Expenditure Exceeds Approved Amount",
                "description": (
                    f"Total expenditure (₹{float(total_exp):,.0f}) is "
                    f"{ratio:.1f}× the final approved amount (₹{float(final_amt):,.0f})."
                ),
                "metrics": {
                    "totalExpenditure": float(total_exp),
                    "finalAmount": float(final_amt),
                    "overrunRatio": round(ratio, 2),
                }
            }
        return None

    def _rule_stalled_work(self, work: pd.Series) -> dict | None:
        """
        Rule: In-progress work that has been active for >2 years.
        Trigger: workStatus = IN_PROGRESS AND daysSinceRecommendation > 730
        """
        status = work.get('workStatus', '')
        days = work.get('daysSinceRecommendation', 0)

        if status != 'IN_PROGRESS' or not pd.notna(days):
            return None

        days = float(days)
        if days > 730:
            return {
                "rule": "STALLED_WORK",
                "severity": "HIGH",
                "title": "Work Stalled Beyond 2 Years",
                "description": (
                    f"Work has been in progress for {int(days)} days "
                    f"({days/365:.1f} years) without completion."
                ),
                "metrics": {
                    "daysSinceRecommendation": int(days),
                    "yearsElapsed": round(days / 365, 1),
                }
            }
        return None

    def _rule_completed_pending_payments(self, work: pd.Series) -> dict | None:
        """
        Rule: Work marked completed but has pending payments.
        Trigger: workStatus = COMPLETED AND pendingPaymentCount > 0
        """
        status = work.get('workStatus', '')
        pending = work.get('pendingPaymentCount', 0)

        if status != 'COMPLETED' or not pd.notna(pending):
            return None

        if float(pending) > 0:
            return {
                "rule": "FINANCIAL_INCONSISTENCY",
                "severity": "MEDIUM",
                "title": "Completed Work Has Pending Payments",
                "description": (
                    f"Work is marked as completed but has "
                    f"{int(pending)} pending payment(s)."
                ),
                "metrics": {
                    "pendingPaymentCount": int(pending),
                    "workStatus": status,
                }
            }
        return None

    def _rule_missing_critical_data(self, work: pd.Series) -> dict | None:
        """
        Rule: Critical data fields are missing.
        Trigger: Missing state, district, recommendedAmount, or recommendationDate.
        Note: This is a data quality warning, NOT a risk signal (per AI-SPEC §14).
        """
        missing_fields = []

        if not work.get('state') or str(work.get('state', '')).strip() == '':
            missing_fields.append('state')
        if not work.get('district') or str(work.get('district', '')).strip() == '':
            missing_fields.append('district')
        rec_amt = work.get('recommendedAmount', 0)
        if not pd.notna(rec_amt) or float(rec_amt) == 0:
            missing_fields.append('recommendedAmount')
        if not work.get('recommendationDate') or str(work.get('recommendationDate', '')).strip() == '':
            missing_fields.append('recommendationDate')

        if missing_fields:
            return {
                "rule": "DATA_QUALITY_WARNING",
                "severity": "LOW",
                "title": "Missing Critical Data Fields",
                "description": (
                    f"The following fields are missing: {', '.join(missing_fields)}. "
                    f"This may affect risk scoring accuracy."
                ),
                "metrics": {
                    "missingFields": missing_fields,
                    "missingCount": len(missing_fields),
                }
            }
        return None

    def _rule_excessive_cost_ratio(self, work: pd.Series) -> dict | None:
        """
        Rule: Final amount is extremely different from recommended.
        Trigger: finalToRecommendedRatio > 3.0 (3× the original recommendation)
        """
        ratio = work.get('finalToRecommendedRatio', 0)
        if not pd.notna(ratio) or float(ratio) == 0:
            return None

        ratio = float(ratio)
        if ratio > 3.0:
            rec_amt = work.get('recommendedAmount', 0)
            fin_amt = work.get('finalAmount', 0)
            return {
                "rule": "EXCESSIVE_COST_ESCALATION",
                "severity": "HIGH",
                "title": "Extreme Cost Escalation",
                "description": (
                    f"Final amount is {ratio:.1f}× the originally recommended amount "
                    f"(₹{float(rec_amt):,.0f} → ₹{float(fin_amt):,.0f})."
                ),
                "metrics": {
                    "recommendedAmount": float(rec_amt) if pd.notna(rec_amt) else 0,
                    "finalAmount": float(fin_amt) if pd.notna(fin_amt) else 0,
                    "escalationRatio": round(ratio, 2),
                }
            }
        return None

    def _rule_sanction_delay(self, work: pd.Series) -> dict | None:
        """
        Rule: Sanction took too long (based on real data, not synthetic).
        Note: Currently all sanction dates are synthetic, so this rule
        only fires as a demonstration. When real sanction dates are available,
        this becomes meaningful.
        """
        is_synthetic = work.get('sanctionDate_synthetic', 'true')
        if str(is_synthetic).lower() == 'true':
            return None  # Don't flag synthetic dates

        lag = work.get('sanctionLagDays', 0)
        if not pd.notna(lag):
            return None

        lag = float(lag)
        if lag > 90:  # MPLADS guideline: sanction within 30-60 days
            return {
                "rule": "SANCTION_DELAY",
                "severity": "MEDIUM",
                "title": "Excessive Sanction Delay",
                "description": (
                    f"Sanction took {int(lag)} days after recommendation. "
                    f"MPLADS guidelines specify 30-60 day window."
                ),
                "metrics": {
                    "sanctionLagDays": int(lag),
                    "guideline": "30-60 days",
                }
            }
        return None
