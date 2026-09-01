# 07 — TEAM TASKS
## Six-Member SIH MVP Team

### Team Principle
Work in parallel, but integrate through shared contracts.

### Suggested Ownership

#### Member 1 — Tech Lead / Integration
- Architecture ownership
- Shared contracts
- Integration
- Git/release coordination
- End-to-end vertical slice
- Demo readiness

#### Member 2 — Frontend
- React application
- Dashboard
- Work list
- Work intelligence page
- Risk visualization
- Role-based UI

#### Member 3 — Backend
- Express API
- Database integration
- Authentication
- Authorization
- Work/risk/investigation endpoints

#### Member 4 — Data / ETL
- Source ingestion
- Cleaning
- Normalization
- Deduplication
- Entity resolution
- Feature datasets

#### Member 5 — ML / NLP
- Cost anomaly
- Timeline anomaly
- Payment anomaly
- Similar-work detection
- Model evaluation

#### Member 6 — Risk / QA / UX
- Risk engine
- Compliance rules
- Early-warning logic
- Testing
- UX polish
- Demo scenarios

Ownership can be adjusted based on actual team skills.

### Parallel Development Strategy
All members first read:
- PRODUCT.md
- REQUIREMENTS.md
- PS-TRACEABILITY.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- AI-SPEC.md

Then work against defined interfaces.

### Mock-First Strategy
If a dependency is unfinished, use mock data matching the agreed contract.

### Git Workflow
```text
main       → stable/demo-ready
develop    → integration
feature/* → individual work
```

No unfinished feature should be pushed directly to `main`.

### Integration Order
1. Repository skeleton
2. Database connection
3. Sample work API
4. Frontend work page
5. Risk contract
6. Mock risk flow
7. Real ML service
8. Risk engine
9. Investigation flow
10. Full end-to-end testing

### Definition of Done
A feature is complete only when:
- code works
- contract is respected
- tests exist for critical behavior
- it integrates with the current branch
- no existing feature is unnecessarily broken
