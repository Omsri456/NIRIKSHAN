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
import json


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


def save_peer_stats(df: pd.DataFrame, path: str):
    """
    Extract peer statistics and global scalars from the full dataset,
    and persist them to a JSON file (peer_stats.json) for incremental scoring.

    Extracted artifacts:
      1. peer_cost_stats: state x subCategory -> median, mean, std, count (recommendedAmount)
      2. peer_duration: state x subCategory -> median, mean, std (implementationDays of completed works)
      3. global scalars: global_std_cost, global_median_cost, global_mean_cost,
                         global_median_duration, global_mean_duration, global_std_duration,
                         active_median_days, active_p90_days
      4. state_categories and sub_categories for consistent categorical encoding
    """
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    df = df.copy()

    # Ensure subCategory is present
    if 'subCategory' not in df.columns and 'workDescription' in df.columns:
        df['subCategory'] = df['workDescription'].apply(classify_subcategory)
    elif 'subCategory' not in df.columns:
        df['subCategory'] = 'Other'

    # Numeric conversion
    for col in ['recommendedAmount', 'implementationDays', 'daysSinceRecommendation']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # 1. Global cost scalars
    valid_amounts = df['recommendedAmount'].dropna() if 'recommendedAmount' in df.columns else pd.Series(dtype=float)
    global_std_cost = float(valid_amounts.std()) if len(valid_amounts) > 1 else 100000.0
    global_median_cost = float(valid_amounts.median()) if len(valid_amounts) > 0 else 250000.0
    global_mean_cost = float(valid_amounts.mean()) if len(valid_amounts) > 0 else 300000.0

    # 2. Peer cost stats
    peer_cost_stats = (
        df.groupby(['state', 'subCategory'])['recommendedAmount']
        .agg(peerMedianCost='median', peerMeanCost='mean', peerStdCost='std', peerCount='count')
        .reset_index()
    )
    peer_cost_stats['peerStdCost'] = peer_cost_stats['peerStdCost'].fillna(global_std_cost)
    peer_cost_stats.loc[peer_cost_stats['peerStdCost'] == 0, 'peerStdCost'] = global_std_cost

    cost_dict = {}
    for _, row in peer_cost_stats.iterrows():
        key = f"{row['state']}::{row['subCategory']}"
        cost_dict[key] = {
            "peerMedianCost": float(row['peerMedianCost']) if pd.notna(row['peerMedianCost']) else global_median_cost,
            "peerMeanCost": float(row['peerMeanCost']) if pd.notna(row['peerMeanCost']) else global_mean_cost,
            "peerStdCost": float(row['peerStdCost']) if pd.notna(row['peerStdCost']) and row['peerStdCost'] > 0 else global_std_cost,
            "peerCount": int(row['peerCount']) if pd.notna(row['peerCount']) else 0,
        }

    # 3. Duration stats (completed works)
    completed_mask = df['workStatus'] == 'COMPLETED'
    if completed_mask.any() and 'implementationDays' in df.columns:
        completed_df = df[completed_mask]
        valid_durations = completed_df['implementationDays'].dropna()
        global_median_duration = float(valid_durations.median()) if len(valid_durations) > 0 else 300.0
        global_mean_duration = float(valid_durations.mean()) if len(valid_durations) > 0 else 300.0
        global_std_duration = float(valid_durations.std()) if len(valid_durations) > 1 else 150.0

        peer_duration = (
            completed_df.groupby(['state', 'subCategory'])['implementationDays']
            .agg(peerMedianDuration='median', peerMeanDuration='mean', peerStdDuration='std')
            .reset_index()
        )
        peer_duration['peerStdDuration'] = peer_duration['peerStdDuration'].fillna(global_std_duration)
        peer_duration.loc[peer_duration['peerStdDuration'] == 0, 'peerStdDuration'] = global_std_duration
    else:
        peer_duration = pd.DataFrame(columns=['state', 'subCategory', 'peerMedianDuration', 'peerMeanDuration', 'peerStdDuration'])
        global_median_duration = 300.0
        global_mean_duration = 300.0
        global_std_duration = 150.0

    dur_dict = {}
    for _, row in peer_duration.iterrows():
        key = f"{row['state']}::{row['subCategory']}"
        dur_dict[key] = {
            "peerMedianDuration": float(row['peerMedianDuration']) if pd.notna(row['peerMedianDuration']) else global_median_duration,
            "peerMeanDuration": float(row['peerMeanDuration']) if pd.notna(row['peerMeanDuration']) else global_mean_duration,
            "peerStdDuration": float(row['peerStdDuration']) if pd.notna(row['peerStdDuration']) and row['peerStdDuration'] > 0 else global_std_duration,
        }

    # 4. Active works stats (in-progress works)
    in_prog_mask = df['workStatus'] == 'IN_PROGRESS'
    if in_prog_mask.any() and 'daysSinceRecommendation' in df.columns:
        active_days = df.loc[in_prog_mask, 'daysSinceRecommendation'].dropna()
        active_median_days = float(active_days.median()) if len(active_days) > 0 else 200.0
        active_p90_days = float(active_days.quantile(0.90)) if len(active_days) > 0 else 500.0
    else:
        active_median_days = 200.0
        active_p90_days = 500.0

    # 5. Categories for consistent encoding in models
    state_categories = sorted([str(s) for s in df['state'].dropna().unique()]) if 'state' in df.columns else []
    sub_categories = sorted([str(c) for c in df['subCategory'].dropna().unique()]) if 'subCategory' in df.columns else []

    payload = {
        "peer_cost_stats": cost_dict,
        "peer_duration": dur_dict,
        "global_stats": {
            "global_std_cost": global_std_cost,
            "global_median_cost": global_median_cost,
            "global_mean_cost": global_mean_cost,
            "global_median_duration": global_median_duration,
            "global_mean_duration": global_mean_duration,
            "global_std_duration": global_std_duration,
            "active_median_days": active_median_days,
            "active_p90_days": active_p90_days,
        },
        "state_categories": state_categories,
        "sub_categories": sub_categories,
    }

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"  [FE] Persisted peer statistics to {path} ({len(cost_dict)} cost peer groups, {len(dur_dict)} duration peer groups)")


def engineer_features_incremental(new_rows_df: pd.DataFrame, peer_stats_path: str | dict) -> pd.DataFrame:
    """
    Incrementally engineer features for newly uploaded rows using cached peer statistics.
    Does NOT recompute group statistics across the whole population.

    Instead:
      1. Classifies subCategory from description
      2. Looks up peerMedianCost, peerMeanCost, peerStdCost from cache
      3. Looks up peerMedianDuration, peerMeanDuration, peerStdDuration from cache
      4. Falls back to global stats from cache for unseen (state, subCategory) pairs
      5. Computes costZScore, timelineZScore, delayRatio, and normalized amounts
      6. Encodes state and subCategory consistently with trained models
      7. Computes paymentVelocity
    """
    if isinstance(peer_stats_path, dict):
        stats = peer_stats_path
    else:
        if not os.path.exists(peer_stats_path):
            raise FileNotFoundError(f"Peer stats cache not found at: {peer_stats_path}")
        with open(peer_stats_path, 'r', encoding='utf-8') as f:
            stats = json.load(f)

    cost_stats = stats.get("peer_cost_stats", {})
    dur_stats = stats.get("peer_duration", {})
    global_stats = stats.get("global_stats", {})
    state_categories = stats.get("state_categories", [])
    sub_categories = stats.get("sub_categories", [])

    g_median_cost = global_stats.get("global_median_cost", 250000.0)
    g_mean_cost = global_stats.get("global_mean_cost", 300000.0)
    g_std_cost = global_stats.get("global_std_cost", 100000.0)

    g_median_dur = global_stats.get("global_median_duration", 300.0)
    g_mean_dur = global_stats.get("global_mean_duration", 300.0)
    g_std_dur = global_stats.get("global_std_duration", 150.0)

    df = new_rows_df.copy()

    # 1. Sub-category classification
    if 'workDescription' in df.columns:
        df['subCategory'] = df['workDescription'].apply(classify_subcategory)
    else:
        df['subCategory'] = 'Other'

    # 2. Numeric conversions
    num_cols = ['recommendedAmount', 'finalAmount', 'totalExpenditure',
                'implementationDays', 'daysSinceRecommendation',
                'sanctionLagDays', 'startLagDays', 'paymentCount',
                'averagePayment', 'maxPayment', 'uniqueVendorCount',
                'pendingPaymentCount', 'successPaymentCount',
                'finalToRecommendedRatio', 'expenditureToFinalRatio']
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # 3. Log-transform amounts
    df['amountLog'] = np.log1p(df['recommendedAmount'].fillna(0))

    # 4. Peer group cost stats lookup
    keys = df['state'].astype(str) + "::" + df['subCategory'].astype(str)
    cost_lookups = [cost_stats.get(k, {}) for k in keys]

    df['peerMedianCost'] = [d.get('peerMedianCost', g_median_cost) for d in cost_lookups]
    df['peerMeanCost'] = [d.get('peerMeanCost', g_mean_cost) for d in cost_lookups]
    df['peerStdCost'] = [d.get('peerStdCost', g_std_cost) for d in cost_lookups]
    df['peerCount'] = [d.get('peerCount', 0) for d in cost_lookups]

    df['costZScore'] = np.where(
        df['peerStdCost'] > 0,
        (df['recommendedAmount'] - df['peerMeanCost']) / df['peerStdCost'],
        0.0
    )
    df['costZScore'] = df['costZScore'].fillna(0.0)

    # 5. Peer group timeline stats lookup
    dur_lookups = [dur_stats.get(k, {}) for k in keys]

    df['peerMedianDuration'] = [d.get('peerMedianDuration', g_median_dur) for d in dur_lookups]
    df['peerMeanDuration'] = [d.get('peerMeanDuration', g_mean_dur) for d in dur_lookups]
    df['peerStdDuration'] = [d.get('peerStdDuration', g_std_dur) for d in dur_lookups]

    completed_mask = df['workStatus'] == 'COMPLETED'
    df['delayRatio'] = np.where(
        (df['peerMedianDuration'].notna()) & (df['peerMedianDuration'] > 0),
        df['daysSinceRecommendation'] / df['peerMedianDuration'],
        np.nan
    )
    df['timelineZScore'] = np.where(
        completed_mask & (df['peerStdDuration'].notna()) & (df['peerStdDuration'] > 0),
        (df['implementationDays'] - df['peerMeanDuration']) / df['peerStdDuration'],
        np.nan
    )

    # 6. Categorical encoding
    if state_categories:
        state_map = {str(cat): idx for idx, cat in enumerate(state_categories)}
        df['state_encoded'] = df['state'].astype(str).map(state_map).fillna(0).astype(int)
    else:
        df['state_encoded'] = df['state'].astype('category').cat.codes

    if sub_categories:
        sub_map = {str(cat): idx for idx, cat in enumerate(sub_categories)}
        df['subCategory_encoded'] = df['subCategory'].astype(str).map(sub_map).fillna(0).astype(int)
    else:
        df['subCategory_encoded'] = df['subCategory'].astype('category').cat.codes

    # 7. Payment velocity
    payment_count = df['paymentCount'].fillna(0) if 'paymentCount' in df.columns else 0
    days_rec = df['daysSinceRecommendation'].fillna(0) if 'daysSinceRecommendation' in df.columns else 0
    tot_exp = df['totalExpenditure'].fillna(0) if 'totalExpenditure' in df.columns else 0

    df['paymentVelocity'] = np.where(
        (payment_count > 0) & (days_rec > 0),
        tot_exp / days_rec,
        0.0
    )

    return df


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
