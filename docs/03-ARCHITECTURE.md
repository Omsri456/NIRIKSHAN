# 03 — ARCHITECTURE
## MPLADS AI-Powered Monitoring & Analytics Platform

### Architecture Goal
Data → ingestion → validation → normalization → entity resolution → database → features → AI/rules → risk engine → APIs → dashboards → investigation.

### Technology
- React + TypeScript
- Node.js + Express + TypeScript
- MongoDB
- Python ML service
- pandas / NumPy / scikit-learn / sentence-transformers as required

### High-Level Architecture
```text
MPLADS Data
   ↓
Ingestion
   ↓
Validation / Normalization / Deduplication
   ↓
MongoDB
   ↓
Feature Engineering
   ↓
Rules + Python ML/NLP
   ↓
Risk Engine
   ↓
Express REST API
   ↓
React Frontend
   ↓
Investigation
```

### Simplified Repository
```text
mplads-risk-intelligence/
├── client/
├── server/
├── ml/
├── data/
│   ├── raw/
│   └── processed/
├── docs/
├── README.md
├── docker-compose.yml
├── .env.example
└── .gitignore
```

### Service Boundaries
Frontend never accesses MongoDB or ML directly.
Backend owns business logic and database access.
ML service owns model inference.
Risk engine combines rules and ML signals.

### Shared Contracts
Frontend/backend/ML must agree on common structures such as:
- Work
- RiskSignal
- RiskAssessment
- Investigation
- APIError

### Docker Strategy
Docker is optional for individual developers. Development may run locally.
A reproducible Compose environment should eventually provide:
- MongoDB
- Backend
- ML service

The frontend may run locally during development and can be containerized later.

### Architecture Invariants
1. Preserve source workId.
2. Never modify raw source data.
3. Frontend cannot access MongoDB directly.
4. Frontend cannot directly access ML.
5. ML cannot directly modify investigations.
6. Shared contracts cannot change silently.
7. Secrets cannot be committed.
8. Risk does not equal fraud.
