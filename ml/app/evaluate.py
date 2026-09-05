"""
NIRIKSHAN — Model Evaluation Script
=====================================
Evaluates the quality of ML model outputs from the batch scoring pipeline.

Checks:
  1. Risk score distribution (expect ~5% CRITICAL, ~10% HIGH)
  2. Top-20 CRITICAL works sanity table
  3. Per-model score distributions
  4. Anomaly stability (optional re-run)
  5. NLP similarity quality spot-check
  6. Compliance rule hit rates

Usage:
  python ml/app/evaluate.py

Prerequisites:
  Run batch_score.py first to generate risk_scores.json
"""

import sys
import os
import io
import json

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

import pandas as pd
import numpy as np


def main():
    print("=" * 65)
    print("  NIRIKSHAN — Model Evaluation Report")
    print("=" * 65)

    # ── Load data ──────────────────────────────────────────────────────
    data_dir = os.path.join(project_root, 'data', 'processed')

    scores_path = os.path.join(data_dir, 'risk_scores.json')
    features_path = os.path.join(data_dir, 'ml_features.csv')
    similarity_path = os.path.join(data_dir, 'similarity_matches.json')
    output_path = os.path.join(data_dir, 'evaluation_report.txt')

    if not os.path.exists(scores_path):
        print("ERROR: risk_scores.json not found. Run batch_score.py first.")
        sys.exit(1)

    print(f"\n  Loading risk scores from {scores_path}...")
    with open(scores_path, 'r', encoding='utf-8') as f:
        results = json.load(f)
    print(f"  Loaded {len(results):,} scored works.")

    # Load features for cross-reference
    df = None
    if os.path.exists(features_path):
        df = pd.read_csv(features_path, low_memory=False)
        print(f"  Loaded features: {len(df):,} rows × {len(df.columns)} cols")

    # Load similarity matches
    similarity = {}
    if os.path.exists(similarity_path):
        with open(similarity_path, 'r', encoding='utf-8') as f:
            similarity = json.load(f)

    # ── Build report ───────────────────────────────────────────────────
    report_lines = []

    def p(text=""):
        """Print and collect for report file."""
        print(text)
        report_lines.append(text)

    p(f"\n{'='*65}")
    p("NIRIKSHAN — ML MODEL EVALUATION REPORT")
    p(f"{'='*65}")
    p(f"Total works scored: {len(results):,}")
    p(f"Model version: {results[0].get('modelVersion', 'unknown')}")
    p()

    # ── 1. Risk Distribution ──────────────────────────────────────────
    p("=" * 50)
    p("1. RISK DISTRIBUTION")
    p("=" * 50)

    dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in results:
        dist[r['riskLevel']] = dist.get(r['riskLevel'], 0) + 1

    total = len(results)
    for level in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
        count = dist[level]
        pct = count / total * 100
        bar = '█' * int(pct / 2)
        p(f"  {level:>8}: {count:>6,} ({pct:5.1f}%) {bar}")
    p()

    # Sanity check
    crit_pct = dist['CRITICAL'] / total * 100
    if crit_pct > 15:
        p("  ⚠️  WARNING: CRITICAL rate is unusually high (>15%).")
        p("     Consider adjusting model contamination or risk weights.")
    elif crit_pct < 1:
        p("  ⚠️  WARNING: CRITICAL rate is very low (<1%).")
        p("     Model may be too conservative.")
    else:
        p(f"  ✅ CRITICAL rate ({crit_pct:.1f}%) is within expected range (1-15%).")
    p()

    # ── 2. Sub-Score Distributions ────────────────────────────────────
    p("=" * 50)
    p("2. SUB-SCORE DISTRIBUTIONS")
    p("=" * 50)

    score_keys = {
        'costAnomalyScore': 'Cost Anomaly',
        'timelineDelayScore': 'Timeline Delay',
        'paymentAnomalyScore': 'Payment Anomaly',
        'duplicateSimilarityScore': 'Duplicate Similarity',
    }

    for key, name in score_keys.items():
        values = [r['scores'].get(key, 0) for r in results]
        arr = np.array(values)
        flagged = (arr >= 50).sum()
        p(f"  {name}:")
        p(f"    Mean: {arr.mean():.1f}  Median: {np.median(arr):.1f}  "
          f"Max: {arr.max():.1f}  Flagged (>=50): {flagged:,}")
    p()

    # ── 3. Top-20 CRITICAL Works ──────────────────────────────────────
    p("=" * 50)
    p("3. TOP-20 CRITICAL WORKS (Sanity Check)")
    p("=" * 50)
    p("  Review these manually — do they look genuinely suspicious?")
    p()

    sorted_results = sorted(results, key=lambda r: r['overallRiskScore'], reverse=True)[:20]

    for i, r in enumerate(sorted_results, 1):
        work_id = r['workId']
        score = r['overallRiskScore']
        flags = ', '.join(r.get('flags', [])[:3])
        summary = r.get('explainability', {}).get('summary', 'No summary')[:100]

        # Get description from features
        desc = ""
        if df is not None:
            match = df[df['workId'].astype(str) == str(work_id)]
            if len(match) > 0:
                desc = str(match.iloc[0].get('workDescription', ''))[:80]

        p(f"  {i:2d}. [{score:3d}] {work_id}")
        if desc:
            p(f"      Desc: {desc}")
        p(f"      Flags: {flags}")
        p(f"      Why: {summary}")
        p()

    # ── 4. Flag Analysis ──────────────────────────────────────────────
    p("=" * 50)
    p("4. FLAG FREQUENCY ANALYSIS")
    p("=" * 50)

    flag_counts = {}
    for r in results:
        for flag in r.get('flags', []):
            flag_counts[flag] = flag_counts.get(flag, 0) + 1

    for flag, count in sorted(flag_counts.items(), key=lambda x: -x[1]):
        pct = count / total * 100
        p(f"  {flag}: {count:,} ({pct:.1f}%)")
    p()

    # ── 5. Similarity Analysis ────────────────────────────────────────
    p("=" * 50)
    p("5. SIMILARITY / DUPLICATE DETECTION ANALYSIS")
    p("=" * 50)

    total_with_matches = len(similarity)
    total_matches = sum(len(m) for m in similarity.values())
    p(f"  Works with similar matches: {total_with_matches:,}")
    p(f"  Total match pairs: {total_matches:,}")

    if similarity:
        # Show top 5 highest-similarity pairs
        p(f"\n  Top-5 Highest Similarity Pairs:")
        all_pairs = []
        for work_id, matches in similarity.items():
            for m in matches:
                all_pairs.append((work_id, m))
        all_pairs.sort(key=lambda x: x[1]['similarity'], reverse=True)

        for work_id, match in all_pairs[:5]:
            sim = match['similarity']
            matched_id = match['workId']
            desc = match.get('description', '')[:60]
            same_loc = "same district" if match.get('sameDistrict') else (
                "same state" if match.get('sameState') else "different location")
            p(f"    {work_id} ↔ {matched_id} ({sim:.2%}, {same_loc})")
            if desc:
                p(f"      Matched: {desc}")
    p()

    # ── 6. Compliance Rule Hit Rates ──────────────────────────────────
    p("=" * 50)
    p("6. COMPLIANCE RULE HIT RATES")
    p("=" * 50)

    compliance_hits = {}
    for r in results:
        for ev in r.get('explainability', {}).get('evidence', []):
            if ev.get('category') == 'COMPLIANCE':
                title = ev.get('title', 'Unknown')
                compliance_hits[title] = compliance_hits.get(title, 0) + 1

    if compliance_hits:
        for rule, count in sorted(compliance_hits.items(), key=lambda x: -x[1]):
            p(f"  {rule}: {count:,}")
    else:
        p("  No compliance rules triggered.")
    p()

    # ── 7. Score Correlation Check ────────────────────────────────────
    p("=" * 50)
    p("7. SCORE QUALITY CHECKS")
    p("=" * 50)

    overall_scores = [r['overallRiskScore'] for r in results]
    arr = np.array(overall_scores)
    p(f"  Overall Risk Score Stats:")
    p(f"    Mean: {arr.mean():.1f}")
    p(f"    Median: {np.median(arr):.1f}")
    p(f"    Std Dev: {arr.std():.1f}")
    p(f"    Min: {arr.min()}, Max: {arr.max()}")
    p(f"    P10: {np.percentile(arr, 10):.0f}, P90: {np.percentile(arr, 90):.0f}")

    # Check for score clustering
    unique_scores = len(set(overall_scores))
    p(f"    Unique score values: {unique_scores}")
    if unique_scores < 10:
        p("  ⚠️  WARNING: Very few unique scores. Model may not be discriminating well.")
    else:
        p(f"  ✅ Good score spread ({unique_scores} unique values).")
    p()

    # ── Save report ───────────────────────────────────────────────────
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))

    print(f"\n{'='*65}")
    print(f"  📄 Full report saved to: {output_path}")
    print(f"{'='*65}")


if __name__ == "__main__":
    main()
