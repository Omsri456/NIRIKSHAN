"""
NIRIKSHAN — Feature Engineering Pipeline
=========================================
Reads unified_works.csv (from ETL) and adds ML-ready features:

  1. subCategory — keyword-based classifier (Roads, Water, Education, etc.)
  2. Peer group statistics (median, mean, std) per (state, subCategory)
  3. Cost deviation z-scores
  4. Timeline peer comparison features
  5. Normalised numerical features for model input

Can be used standalone (outputs ml_features.csv) or imported by batch_score.py.
"""

import pandas as pd
import numpy as np
import re
import os


# ── Sub-category Classification ────────────────────────────────────────
# The original 'category' column is 97.5% "Normal/Others" — too coarse.
# We derive meaningful sub-categories from work descriptions using keywords.

SUBCATEGORY_RULES = [
    # (subCategory, list of regex patterns) — order matters, first match wins
    ("Roads",       [r'\broad\b', r'\bcc road\b', r'\bpcc\b', r'\binterlocking\b',
                     r'\bpathway\b', r'\bfootpath\b', r'\bbridge\b', r'\bculvert\b',
                     r'\bpaver\b', r'\bbituminous\b', r'\basphalt\b']),
    ("Water",       [r'\bwater\b', r'\bborewell\b', r'\bhandpump\b', r'\bdrinking\b',
                     r'\bpipeline\b', r'\btubewell\b', r'\boverhead tank\b',
                     r'\bwater tank\b', r'\bwater supply\b']),
    ("Lighting",    [r'\blight\b', r'\bsolar\b', r'\bhigh mast\b', r'\bsemi high mast\b',
                     r'\bled\b', r'\bstreet light\b', r'\bms pole\b']),
    ("Education",   [r'\bschool\b', r'\bvidhyalay\b', r'\bcollege\b', r'\blibrary\b',
                     r'\banganwadi\b', r'\banganvadi\b', r'\bhostel\b', r'\bprathmik\b',
                     r'\bvidyalaya\b']),
    ("Health",      [r'\bhospital\b', r'\bhealth\b', r'\bdispensary\b', r'\bambulance\b',
                     r'\bmedical\b', r'\bmaternity\b', r'\bphc\b', r'\bchc\b']),
    ("Community",   [r'\bcommunity\b', r'\bhall\b', r'\bbhawan\b', r'\bstadium\b',
                     r'\bpark\b', r'\bplayground\b', r'\bgym\b', r'\bsports\b',
                     r'\bmultipurpose\b', r'\bsamudayik\b', r'\brungmanch\b']),
    ("Sanitation",  [r'\btoilet\b', r'\bdrain\b', r'\bsewage\b', r'\bsanitation\b',
                     r'\bsewerage\b', r'\bdustbin\b', r'\bsoakpit\b']),
    ("Religious",   [r'\btemple\b', r'\bmandir\b', r'\bchurch\b', r'\bmosque\b',
                     r'\bmasjid\b', r'\bgurudwara\b', r'\bgurdwara\b']),
    ("Cremation",   [r'\bcremation\b', r'\bshamshan\b', r'\bcrematorium\b',
                     r'\blast rites\b', r'\bfuneral\b']),
    ("Building",    [r'\bbuilding\b', r'\bboundary\b', r'\bwall\b', r'\bfencing\b',
                     r'\bcompound\b', r'\brenovation\b', r'\brepair\b']),
]


def classify_subcategory(description: str) -> str:
    """
    Classify a work description into a sub-category using keyword matching.
    First match wins (rules are ordered by specificity).
    """
    if not description or not isinstance(description, str):
        return "Other"
    desc_lower = description.lower()
    for sub_cat, patterns in SUBCATEGORY_RULES:
        for pattern in patterns:
            if re.search(pattern, desc_lower):
                return sub_cat
    return "Other"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main feature engineering function.
    Takes the raw unified_works DataFrame, adds all derived features,
    and returns the enriched DataFrame.

    Added columns:
      - subCategory
      - peerMedianCost, peerMeanCost, peerStdCost
      - costZScore
      - peerMedianDuration, peerMeanDuration
      - timelineZScore, delayRatio
      - amountLog (log-transformed recommended amount)
    """
    print("  [FE] Classifying sub-categories from descriptions...")
    df = df.copy()

    # ── 1. Sub-category classification ──────────────────────────────────
    df['subCategory'] = df['workDescription'].apply(classify_subcategory)
    sub_counts = df['subCategory'].value_counts()
    for cat, count in sub_counts.items():
        print(f"       {cat}: {count:,} ({count/len(df)*100:.1f}%)")

    # ── 2. Numeric conversions (ensure float types) ─────────────────────
    num_cols = ['recommendedAmount', 'finalAmount', 'totalExpenditure',
                'implementationDays', 'daysSinceRecommendation',
                'sanctionLagDays', 'startLagDays', 'paymentCount',
                'averagePayment', 'maxPayment', 'uniqueVendorCount',
                'pendingPaymentCount', 'successPaymentCount',
                'finalToRecommendedRatio', 'expenditureToFinalRatio']
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # ── 3. Log-transform amounts (reduces skew) ────────────────────────
    df['amountLog'] = np.log1p(df['recommendedAmount'].fillna(0))

    # ── 4. Peer group statistics (state × subCategory) ──────────────────
    print("  [FE] Computing peer group cost statistics...")
    peer_cost_stats = (
        df.groupby(['state', 'subCategory'])['recommendedAmount']
        .agg(peerMedianCost='median', peerMeanCost='mean', peerStdCost='std', peerCount='count')
        .reset_index()
    )
    # Replace NaN std (groups with 1 item) with global std
    global_std = df['recommendedAmount'].std()
    peer_cost_stats['peerStdCost'] = peer_cost_stats['peerStdCost'].fillna(global_std)
    # Avoid division by zero
    peer_cost_stats.loc[peer_cost_stats['peerStdCost'] == 0, 'peerStdCost'] = global_std

    df = df.merge(peer_cost_stats, on=['state', 'subCategory'], how='left')

    # Cost Z-score: how many std deviations from peer mean?
    df['costZScore'] = (
        (df['recommendedAmount'] - df['peerMeanCost']) / df['peerStdCost']
    ).fillna(0)

    # ── 5. Peer group timeline statistics ───────────────────────────────
    print("  [FE] Computing peer group timeline statistics...")
    # For completed works: implementation duration peer stats
    completed_mask = df['workStatus'] == 'COMPLETED'
    if completed_mask.any():
        peer_duration = (
            df[completed_mask]
            .groupby(['state', 'subCategory'])['implementationDays']
            .agg(peerMedianDuration='median', peerMeanDuration='mean', peerStdDuration='std')
            .reset_index()
        )
        global_dur_std = df.loc[completed_mask, 'implementationDays'].std()
        peer_duration['peerStdDuration'] = peer_duration['peerStdDuration'].fillna(global_dur_std)
        peer_duration.loc[peer_duration['peerStdDuration'] == 0, 'peerStdDuration'] = global_dur_std

        df = df.merge(peer_duration, on=['state', 'subCategory'], how='left')
    else:
        df['peerMedianDuration'] = np.nan
        df['peerMeanDuration'] = np.nan
        df['peerStdDuration'] = np.nan

    # For in-progress works: compute delay ratio
    # (daysSinceRecommendation / peerMedianDuration)
    df['delayRatio'] = np.where(
        (df['peerMedianDuration'].notna()) & (df['peerMedianDuration'] > 0),
        df['daysSinceRecommendation'] / df['peerMedianDuration'],
        np.nan
    )

    # Timeline Z-score for completed works
    df['timelineZScore'] = np.where(
        completed_mask & df['peerStdDuration'].notna() & (df['peerStdDuration'] > 0),
        (df['implementationDays'] - df['peerMeanDuration']) / df['peerStdDuration'],
        np.nan
    )

    # ── 6. State / sub-category encoding (for Isolation Forest) ────────
    print("  [FE] Encoding categorical features...")
    df['state_encoded'] = df['state'].astype('category').cat.codes
    df['subCategory_encoded'] = df['subCategory'].astype('category').cat.codes

    # ── 7. Payment velocity (spending rate) ─────────────────────────────
    df['paymentVelocity'] = np.where(
        (df['paymentCount'] > 0) & (df['daysSinceRecommendation'] > 0),
        df['totalExpenditure'] / df['daysSinceRecommendation'],
        0
    )

    print(f"  [FE] Feature engineering complete. Shape: {df.shape}")
    return df


def save_features(df: pd.DataFrame, output_path: str):
    """Save the feature-enriched DataFrame to CSV."""
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"  [FE] Saved to {output_path}")


# ── CLI entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    data_path = os.path.join(
        os.path.dirname(__file__), '..', '..', 'data', 'processed', 'unified_works.csv'
    )
    output_path = os.path.join(
        os.path.dirname(__file__), '..', '..', 'data', 'processed', 'ml_features.csv'
    )

    print("NIRIKSHAN — Feature Engineering")
    print("=" * 50)
    print(f"Input:  {data_path}")
    print(f"Output: {output_path}")

    df = pd.read_csv(data_path)
    print(f"Loaded {len(df):,} works\n")

    df = engineer_features(df)
    save_features(df, output_path)

    print(f"\n✅ Done. {len(df):,} works enriched with {len(df.columns)} columns.")
