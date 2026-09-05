# 02 — REQUIREMENTS
## MPLADS AI Monitoring Platform

### Functional Requirements
- Ingest MPLADS datasets.
- Validate, normalize and deduplicate records.
- Preserve source work identifiers.
- Maintain unified work records.
- Analyze expenditures, payments, costs and execution timelines.
- Detect cost anomalies.
- Detect unusual payment patterns.
- Detect delayed works.
- Detect potentially similar/duplicate works.
- Generate compliance indicators.
- Generate explainable risk scores.
- Display risk-based alerts.
- Provide national, state, district and MP-oriented dashboards.
- Support investigation creation, notes, status and outcomes.
- Maintain risk-assessment history.
- Support future data refresh/re-ingestion.

### Non-Functional Requirements
- Modular architecture.
- Consistent API contracts.
- Explainable AI outputs.
- Role-based access control.
- Geographic/data scope control.
- Reproducible data processing.
- Secure secret management.
- Scalable batch processing.
- Maintainable code suitable for a six-person team.

### ML Constraints
- Do not claim supervised fraud prediction without reliable labels.
- Prefer anomaly detection, statistical methods and NLP similarity for the MVP.
- Every AI result should expose supporting signals/evidence.
