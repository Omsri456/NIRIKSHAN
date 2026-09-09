# NIRIKSHAN - ML Training Datasets & Artifacts Bundle
=====================================================

This archive contains the datasets and ML model artifacts for Project NIRIKSHAN that were not shared on GitHub due to file size constraints (files exceeding GitHub standard limits including large CSVs, embedding matrices, and score exports).

## 1. Directory Structure

### ML_data/ (Raw Source Datasets)
Raw datasets downloaded and formatted from official MPLADS portals and Rajya Sabha / Lok Sabha parliamentary archives:
- `mplads_recommended_works_2026-09-04.csv` (23.0 MB, 88,881 rows): Core recommendations dataset with sanction amounts, MPs, districts, work descriptions.
- `mplads_completed_works_2026-09-04.csv` (11.7 MB, 45,817 rows): Completed works with final cost and completion dates.
- `mplads_expenditures_2026-09-04.csv` (26.4 MB, 108,695 rows): Detailed financial transactions and installment release records.
- `mplads_mp_summary_2026-09-04.csv` (104 KB, 775 rows): MP-level financial allocations, expenditures, and utilization ratios.
- `RajyasabhaMPsfundsavailable.csv` (5.8 KB): Rajya Sabha fund availability dataset.
- `RS-Session-251-AU3002-Annexure-I.csv` (2.4 KB): Parliamentary session 251 annexure data.
- `rs_Session240_as278_1.1.csv` (1.8 KB): Parliamentary session 240 question/answer records.
- `RS_Session_256_AU_2872_2.csv` (18.4 KB): Parliamentary session 256 records.
- `worksunderprogress16thloksabha_0.csv` (4.0 KB): 16th Lok Sabha ongoing works.

### data/processed/ (ETL Enriched Datasets & ML Features)
Outputs produced by `data/etl_enrich.py` and `ml/app/feature_engineering.py`:
- `unified_works.csv` (28.4 MB, 88,881 rows): Cleaned, merged, and cross-referenced master dataset across all works.
- `ml_features.csv` (42.2 MB, 88,881 rows): Feature matrix with peer-group cost z-scores, keyword-derived subCategories, timeline delay ratios, and normalized inputs.
- `mp_enriched.csv` (102 KB, 775 rows): Enriched MP metrics with utilization rates and risk aggregations.
- `risk_scores.json` (96.1 MB): Full inference risk scores matching the API contract (Cost, Timeline, Payment, Similarity, Compliance, Overall Risk).
- `similarity_matches.json` (57.3 MB): NLP duplicate/similarity detection matches.
- `etl_summary.json` & `scoring_summary.json`: Ingestion & scoring pipeline statistics.
- `evaluation_report.txt`, `desc_analysis.txt`, `quality_check.txt`: Model accuracy, category distribution, and data quality reports.

### ml/models/ (Pre-trained ML Models - included in Full Bundle)
Trained weights and embeddings ready for inference without retraining:
- `cost_anomaly.joblib` (2.2 MB): Scikit-learn Isolation Forest model for cost anomaly detection.
- `payment_anomaly.joblib` (578 KB): Isolation Forest model for installment and expenditure anomaly detection.
- `embeddings.npz` (116.0 MB): Pre-computed TF-IDF / sentence embeddings for all 88,881 work descriptions.
- `test_f16.npz` (57.8 MB): Half-precision float16 embeddings.

## 2. How to Restore in the Repository
Extract the contents of this zip directly into the root folder of the repository (`NIRIKSHAN/`):
```
NIRIKSHAN/
|-- ML_data/
|-- data/
|   `-- processed/
`-- ml/
    `-- models/
```

## 3. How to Run Training & Scoring Pipelines

### Step 1: Run ETL Pipeline (creates unified_works.csv & mp_enriched.csv)
```bash
python data/etl_enrich.py
```

### Step 2: Run ML Feature Engineering & Batch Scoring (trains models & exports scores)
```bash
python -m ml.app.batch_score
```

### Step 3: Evaluate Model Performance
```bash
python -m ml.app.evaluate
```
