# NIRIKSHAN — MPLADS Risk Intelligence Platform

> AI-powered monitoring and analytics for the Members of Parliament Local Area Development Scheme.

**SIH PS-102** | Team of 6

## What is NIRIKSHAN?

NIRIKSHAN identifies MPLADS works that require attention by combining data analytics, anomaly detection, NLP similarity, compliance rules, and explainable risk scoring. A risk score is a **decision-support indicator**, not a determination of fraud or wrongdoing.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB 7 |
| ML Service | Python + FastAPI |
| AI/ML | scikit-learn, sentence-transformers, pandas, NumPy |

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd NIRIKSHAN

# 2. Copy environment file
cp .env.example .env

# 3. Start MongoDB
docker-compose up -d

# 4. Install dependencies
npm install

# 5. Seed the database
npm run seed

# 6. Start backend
npm run dev:server

# 7. Start frontend (new terminal)
npm run dev:client

# 8. Start ML service (new terminal)
cd ml
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Core Flow

```
Data → ETL → MongoDB → AI/Rules → Risk Engine → API → Dashboard → Investigation
```

## Project Structure

```
NIRIKSHAN/
├── client/          # React + TypeScript frontend
├── server/          # Express + TypeScript backend
├── ml/              # Python FastAPI ML service
├── shared/          # Shared TypeScript contracts
├── data/            # Raw & processed datasets
├── docs/            # Project documentation
├── scripts/         # Dev utilities
└── docker-compose.yml
```

## Documentation

See the `docs/` folder for detailed specifications:

1. [Product](docs/01-PRODUCT.md)
2. [Requirements](docs/02-REQUIREMENTS.md)
3. [PS Traceability](docs/02.5-PS-TRACEABILITY.md)
4. [Architecture](docs/03-ARCHITECTURE.md)
5. [Database](docs/04-DATABASE.md)
6. [API](docs/05-API.md)
7. [AI Spec](docs/06-AI-SPEC.md)
8. [Team Tasks](docs/07-TEAM-TASKS.md)

## Git Workflow

```
main       → stable / demo-ready
develop    → integration branch
feature/*  → individual work
```

## Team

| Member | Role |
|--------|------|
| Member 1 | Tech Lead / Integration |
| Member 2 | Frontend |
| Member 3 | Backend |
| Member 4 | Data / ETL |
| Member 5 | ML / NLP |
| Member 6 | Risk / QA / UX |

## Important

> Risk is a decision-support indicator, not a determination of fraud or wrongdoing.

## License

MIT
