# 04 — DATABASE
## MongoDB MVP Specification

### MVP Collections
- users
- works
- expenditures
- risk_assessments
- investigations
- data_imports
- optional: mp_summaries

### Relationship
```text
MP / Constituency
      ↓
    WORK
      ↓
EXPENDITURES
      ↓
RISK ASSESSMENTS
      ↓
INVESTIGATION
```

### users
```json
{
  "name": "Example User",
  "email": "user@example.com",
  "passwordHash": "...",
  "role": "STATE_AUTHORITY",
  "scope": {
    "state": "Maharashtra",
    "district": null,
    "constituency": null
  },
  "isActive": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Roles:
- MINISTRY
- STATE_AUTHORITY
- DISTRICT_AUTHORITY
- MP
- ADMIN

### works
```json
{
  "workId": "MPLADS-W-12345",
  "description": "Construction of community hall",
  "category": "Community Infrastructure",
  "mp": {
    "name": "Example MP",
    "house": "Lok Sabha"
  },
  "location": {
    "state": "Maharashtra",
    "district": "Example District",
    "constituency": "Example Constituency"
  },
  "implementingAgency": {
    "name": "Example Agency",
    "type": "Government Agency"
  },
  "recommendation": {
    "date": "Date",
    "amount": 1000000
  },
  "execution": {
    "startDate": "Date",
    "completionDate": "Date",
    "status": "COMPLETED"
  },
  "financial": {
    "finalAmount": 2500000,
    "totalExpenditure": 2300000
  },
  "asset": {
    "description": "Community hall",
    "status": "CREATED"
  },
  "source": {
    "dataset": "mplads_recommended_works",
    "lastUpdated": "Date"
  }
}
```

`workId` is the primary business identifier.

### expenditures
```json
{
  "workId": "MPLADS-W-12345",
  "amount": 500000,
  "date": "Date",
  "paymentStatus": "PAID",
  "vendor": {
    "name": "Example Vendor"
  },
  "implementingAgency": "Example Agency",
  "source": {
    "dataset": "mplads_expenditures",
    "recordId": "source-record-123"
  }
}
```

One work can have many expenditure records.

### risk_assessments
```json
{
  "workId": "MPLADS-W-12345",
  "score": 86,
  "level": "CRITICAL",
  "signals": [
    {
      "type": "COST_ANOMALY",
      "score": 0.92,
      "severity": "HIGH",
      "explanation": "Expenditure is significantly above comparable works.",
      "evidence": {}
    }
  ],
  "modelVersion": "risk-engine-v1",
  "generatedAt": "Date"
}
```

Risk assessments are historical; do not overwrite previous assessments.

### investigations
```json
{
  "workId": "MPLADS-W-12345",
  "status": "UNDER_REVIEW",
  "priority": "HIGH",
  "assignedTo": "ObjectId",
  "notes": [],
  "finding": null,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### data_imports
Tracks dataset ingestion, counts, errors, status and timestamps.

### Important Rules
- Preserve raw source files.
- Preserve source provenance.
- Do not treat missing data as suspicious.
- Do not use description alone as definitive identity.
- Keep risk and investigation separate.
- Validate and deduplicate before transaction-based features.
