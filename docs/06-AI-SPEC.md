# 06 — AI-SPEC
## MPLADS AI Risk Intelligence Engine

**Version:** 1.0  
**Status:** MVP AI Specification

## 1. AI Objective

The AI layer exists to help the platform:
- identify unusual expenditure patterns
- identify cost anomalies
- identify unusual payment patterns
- identify delayed works
- identify potentially similar/duplicate works
- identify deviations requiring compliance review
- generate early-warning indicators
- prioritize works for human attention

The system should provide explainable risk intelligence, not automatically declare fraud.

## 2. Core AI Architecture

```text
                    WORK DATA
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
       Financial     Timeline        Text
          │             │             │
          ↓             ↓             ↓
     Cost Model    Delay Model    NLP Model
          │             │             │
          └─────────────┼─────────────┘
                        ↓
                 Compliance Rules
                        ↓
                  Risk Engine
                        ↓
               Risk Score 0–100
                        ↓
              Explainable Signals
```

## 3. AI Components

1. Cost Anomaly Detection
2. Timeline / Delay Detection
3. Payment Anomaly Detection
4. Similar Work Detection
5. Compliance Rule Engine
6. Early Warning / Risk Trend Analysis

These feed the central Risk Engine.

## 4. Cost Anomaly Detection

### Objective
Identify works whose financial characteristics are unusual compared with relevant peer works.

### Candidate Features
- recommendedAmount
- finalAmount
- totalExpenditure
- category
- state
- district
- constituency
- year
- workStatus

Derived:
- expenditureToRecommendation
- expenditureToFinalAmount
- finalToRecommendedRatio
- peerMedianCost
- peerMeanCost
- costDeviation

### Peer Grouping
A work should be compared with relevant peers rather than every work in the country.

```text
Work
 ↓
Find relevant peers
 ↓
Calculate benchmark
 ↓
Measure deviation
 ↓
Anomaly score
```

### Example Output

```json
{
  "type": "COST_ANOMALY",
  "score": 0.92,
  "severity": "HIGH",
  "explanation": "Expenditure is substantially above the relevant peer benchmark.",
  "evidence": {
    "observedAmount": 2500000,
    "benchmarkAmount": 1000000,
    "deviationRatio": 2.5
  }
}
```

## 5. Timeline / Delay Detection

### Objective
Identify works showing unusual implementation duration or delay.

Candidate inputs:
- recommendationDate
- sanctionDate
- startDate
- firstPaymentDate
- completionDate
- currentStatus

Derived:
- implementationDuration
- daysSinceRecommendation
- daysSinceLastPayment
- daysToExpectedCompletion

Conceptually:

```text
Recommendation
      ↓
Sanction
      ↓
Implementation
      ↓
Payments
      ↓
Completion
```

Output should contain a timeline anomaly score, severity, explanation and evidence.

## 6. Payment Anomaly Detection

### Objective
Identify unusual payment/expenditure patterns.

Candidate features:
- paymentCount
- totalPayment
- averagePayment
- paymentInterval
- paymentFrequency
- largestPayment
- paymentVelocity
- vendorCount

Potential patterns:
- unusual payment frequency
- unusual payment concentration
- rapid expenditure acceleration
- payment/activity inconsistency

Patterns must be validated against the available dataset.

## 7. Similar Work Detection

### Objective
Identify potentially duplicate or highly similar works.

Pipeline:

```text
Work Description
       ↓
Text Cleaning
       ↓
Normalization
       ↓
Embedding Model
       ↓
Vector Similarity
       ↓
Candidate Matches
       ↓
Additional Metadata Check
       ↓
Potential Similarity
```

Use:
- description similarity
- location similarity
- category similarity
- implementing agency similarity
- time proximity

The UI should say “Potentially similar work detected”, not “Confirmed duplicate” unless independently verified.

## 8. Compliance Engine

Compliance monitoring should use deterministic rules where appropriate.

```text
Work
 ↓
Compliance Rules
 ↓
PASS / REVIEW / INDICATOR
```

Potential MVP rules:
- expenditure significantly exceeds relevant approved/final amount
- work duration exceeds defined/derived threshold
- work marked completed but financial activity is inconsistent
- required data fields are missing
- potentially duplicate/similar work detected
- expenditure progression is inconsistent with work status

Only rules supported by available data and authoritative norms should be presented as actual compliance violations. Otherwise use “Compliance Indicator” or “Needs Review”.

## 9. Early Warning

The purpose is to identify emerging problems before they become obvious failures.

```text
Current expenditure
       +
Current timeline
       +
Historical peers
       +
Risk trajectory
       ↓
Early Warning
```

Example:
“Work W12345 shows elevated delay risk based on its current implementation trajectory.”

## 10. Risk Trajectory

Because risk assessments are stored historically:

```text
01 Aug → 42
15 Aug → 61
01 Sep → 81
```

the system can identify rapidly increasing risk.

This can become an early-warning signal.

## 11. Risk Engine

The Risk Engine combines all available signals.

```text
Cost anomaly
Timeline anomaly
Payment anomaly
Similarity
Compliance indicators
Early warning
        │
        ↓
   Risk Engine
        ↓
  Risk Score 0–100
```

The initial design is a weighted combination of validated signals. Weights must remain configurable and should be finalized only after experimentation.

## 12. Risk Levels

Initial thresholds:

```text
0–24    LOW
25–49   MEDIUM
50–74   HIGH
75–100  CRITICAL
```

These are configurable.

## 13. Explainability Requirement

Every risk assessment should answer:

**Why was this work flagged?**

Expose:
- Risk Score
- Risk Level
- Top Signals
- Explanation
- Evidence
- Benchmark where available
- Model Version
- Timestamp

Bad:
```text
IsolationForest = 0.87
```

Good:
```text
CRITICAL — Risk Score 86

Why flagged:
- Cost anomaly: expenditure is 2.5× the peer benchmark.
- Timeline anomaly: duration is significantly above comparable works.
- Payment anomaly: payment pattern differs from comparable works.
```

## 14. Missing Data Rule

Missing data must not automatically become a risk signal.

Example:
`completionDate = missing`

should not automatically mean fraud. Where appropriate, create a data-quality warning instead.

## 15. False Positive Principle

```text
Anomaly
   ↓
Risk Signal
   ↓
Human Review
```

Never:

```text
Anomaly
   ↓
Fraud
```

## 16. Model Selection

### Numerical anomalies
- Isolation Forest
- robust statistics
- peer-based deviation

### Timeline
- statistical comparison
- peer-based analysis
- anomaly detection

### Payments
- statistical features
- Isolation Forest
- rule-based detection

### Similarity
- sentence embeddings
- cosine similarity

### Compliance
- deterministic rules

## 17. Why Hybrid AI?

Different data types require different approaches.

```text
Numerical → ML / Statistics
Text      → NLP
Known rules → Rule Engine
```

Do not use one model for everything merely to increase complexity.

## 18. ML Service Boundary

Python owns:
- feature transformation where required
- model inference
- anomaly scores
- embeddings
- similarity
- model version

Node.js owns:
- authentication
- authorization
- database
- business logic
- risk aggregation
- risk persistence
- API

ML must not:
- create users
- modify investigations
- change permissions
- write directly to the frontend

## 19. ML API Contract

```http
POST /internal/ml/anomaly-score
```

Example request:

```json
{
  "workId": "MPLADS-W-12345",
  "features": {
    "recommendedAmount": 1000000,
    "finalAmount": 1500000,
    "totalExpenditure": 2300000,
    "durationDays": 400
  }
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "type": "COST_ANOMALY",
        "score": 0.92
      },
      {
        "type": "TIMELINE_ANOMALY",
        "score": 0.71
      }
    ],
    "modelVersion": "anomaly-v1"
  }
}
```

## 20. Similarity API

```http
POST /internal/ml/similarity
```

The backend sends normalized work text and relevant metadata. The ML service returns candidate matches and similarity scores.

## 21. Batch Processing

```text
Dataset
   ↓
Feature generation
   ↓
Batch ML inference
   ↓
Risk Engine
   ↓
risk_assessments
```

This is preferable to calling ML once from the browser for every work.

## 22. New Data Handling

```text
New Data
   ↓
Identify affected work
   ↓
Update normalized data
   ↓
Regenerate features
   ↓
Run relevant detectors
   ↓
Risk Engine
   ↓
Store new assessment
   ↓
Generate alert if threshold crossed
```

Example:

```text
Previous Risk = 61
       ↓
New expenditure arrives
       ↓
New Risk = 83
       ↓
HIGH → CRITICAL
       ↓
Alert generated
```

## 23. Model Versioning

Every AI-generated result must contain:
- modelVersion
- generatedAt

Example:
`modelVersion = "risk-engine-v1"`

## 24. AI Evaluation

Evaluate:
- anomaly stability
- meaningfulness of detected outliers
- false-positive behavior
- similarity quality
- risk ranking usefulness
- consistency across groups
- interpretability

For similarity, create manually reviewed same/similar vs different examples.

## 25. No Fraud Accuracy Claim

Unless reliable historical labels exist, do not claim:

> “Our model detects fraud with 95% accuracy.”

Instead:

> “The system identifies anomalous and potentially irregular works for further review.”

## 26. AI Development Order

```text
1. Data profiling
        ↓
2. Feature engineering
        ↓
3. Cost anomaly
        ↓
4. Timeline anomaly
        ↓
5. Payment anomaly
        ↓
6. Similar-work NLP
        ↓
7. Compliance rules
        ↓
8. Risk engine
        ↓
9. Early warning
        ↓
10. Evaluation
```

## 27. MVP Completion Criteria

The AI MVP is complete when it can:

- analyze real MPLADS data
- generate meaningful numerical features
- detect cost anomalies
- detect timeline anomalies
- detect payment anomalies
- detect potentially similar works
- apply compliance rules
- combine signals
- produce 0–100 risk scores
- explain why a work was flagged
- store model version and timestamp
- recalculate risk when data changes
- generate risk-based alerts

## 28. Final AI Architecture

```text
                       WORK DATA
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
      FINANCIAL         TIMELINE           TEXT
          │                │                │
          ↓                ↓                ↓
     COST MODEL       DELAY MODEL       NLP MODEL
          │                │                │
          ↓                ↓                ↓
     PAYMENT MODEL    EARLY WARNING    SIMILARITY
          │                │                │
          └────────────────┼────────────────┘
                           ↓
                    COMPLIANCE ENGINE
                           ↓
                      RISK ENGINE
                           ↓
                    SCORE 0–100
                           ↓
               ┌───────────┴───────────┐
               ↓                       ↓
            ALERTS                 EVIDENCE
               ↓                       ↓
         ROLE DASHBOARD          HUMAN REVIEW
                                       ↓
                                INVESTIGATION
```

## 29. Final AI Principle

```text
DATA
 ↓
SIGNAL
 ↓
EVIDENCE
 ↓
RISK
 ↓
ALERT
 ↓
HUMAN DECISION
```
