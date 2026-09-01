# 05 — API
## MPLADS Platform API Contract

**Base URL:** `/api`

### Authentication
```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

The backend determines the user's role and scope. Users do not choose their role on login.

### Dashboard
```text
GET /api/dashboard/overview
GET /api/dashboard/trends
GET /api/dashboard/risk-distribution
GET /api/dashboard/states
```

### Works
```text
GET /api/works
GET /api/works/:workId
GET /api/works/:workId/expenditures
GET /api/works/:workId/risk
GET /api/works/:workId/risk-history
GET /api/works/:workId/similar
```

### Risk
```text
GET /api/risk/high-risk
GET /api/risk/alerts
GET /api/risk/signals
```

### Investigations
```text
POST  /api/investigations
GET   /api/investigations
GET   /api/investigations/:id
PATCH /api/investigations/:id
POST  /api/investigations/:id/notes
```

### Data Import
```text
POST /api/data-imports
GET  /api/data-imports
GET  /api/data-imports/:id
```

Admin-only unless explicitly permitted.

### Standard Success Response
```json
{
  "success": true,
  "data": {}
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "WORK_NOT_FOUND",
    "message": "Work could not be found."
  }
}
```

### Pagination
List endpoints should support:
- page
- limit
- sort
- filters

Example:
`GET /api/works?page=1&limit=20&state=Maharashtra`

### ML Internal API
The ML service is internal and not publicly exposed.

Example:
```text
POST /internal/ml/anomaly-score
POST /internal/ml/similarity
```

The exact request/response schema must be shared and versioned.

### API Rules
- Never invent endpoint names independently.
- Never change response structures silently.
- Validate request parameters.
- Enforce role + geographic scope.
- Keep ML endpoints internal.
