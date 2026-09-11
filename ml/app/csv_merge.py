"""
NIRIKSHAN — CSV Merge Utility
==============================
Merges newly uploaded works CSV into data/processed/unified_works.csv:
- Upserts by `workId`: replaces rows where workId already exists,
  appends genuinely new workIds.
- Never replaces the file wholesale.
- Returns counts: { "updated": N, "inserted": M, "total": len(merged_df) }
"""

import os
import sys
import io
from typing import Union, Dict, Any
import pandas as pd

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

DEFAULT_UNIFIED_PATH = os.path.join(project_root, 'data', 'processed', 'unified_works.csv')


def merge_unified_works_csv(
    new_csv_source: Union[str, io.StringIO, pd.DataFrame],
    existing_path: str = DEFAULT_UNIFIED_PATH,
    output_path: str = None,
) -> Dict[str, Any]:
    """
    Merge newly uploaded works CSV data into the existing unified_works.csv.

    Args:
        new_csv_source: Path to new CSV file, raw CSV string content, StringIO, or DataFrame.
        existing_path: Path to the target existing unified_works.csv.
        output_path: Destination path for writing the merged CSV (defaults to existing_path).

    Returns:
        dict: { "updated": N, "inserted": M, "total": total_rows }
    """
    if output_path is None:
        output_path = existing_path

    # 1. Load newly uploaded works
    if isinstance(new_csv_source, pd.DataFrame):
        new_df = new_csv_source.copy()
    elif isinstance(new_csv_source, str):
        if os.path.isfile(new_csv_source):
            new_df = pd.read_csv(new_csv_source, low_memory=False)
        else:
            new_df = pd.read_csv(io.StringIO(new_csv_source), low_memory=False)
    elif isinstance(new_csv_source, (io.StringIO, io.BytesIO)):
        new_df = pd.read_csv(new_csv_source, low_memory=False)
    else:
        raise ValueError("Unsupported type for new_csv_source")

    if new_df.empty:
        return {"updated": 0, "inserted": 0, "updatedWorkIds": [], "insertedWorkIds": [], "total": 0}

    # Normalize column names (strip BOM and whitespace)
    new_df.columns = [str(c).replace('\ufeff', '').strip() for c in new_df.columns]

    if 'workId' not in new_df.columns:
        raise ValueError("Uploaded CSV must contain a 'workId' column.")

    # Drop any rows without workId
    new_df = new_df.dropna(subset=['workId']).copy()
    new_df['workId'] = new_df['workId'].astype(str).str.strip()
    new_df = new_df[new_df['workId'] != '']

    # Deduplicate within newly uploaded data, keeping latest occurrence
    new_df = new_df.drop_duplicates(subset=['workId'], keep='last')

    # 2. Load existing dataset
    if os.path.exists(existing_path):
        existing_df = pd.read_csv(existing_path, low_memory=False)
        existing_df.columns = [str(c).replace('\ufeff', '').strip() for c in existing_df.columns]
        if 'workId' in existing_df.columns:
            existing_df['workId'] = existing_df['workId'].astype(str).str.strip()
        else:
            existing_df['workId'] = ''
    else:
        existing_df = pd.DataFrame(columns=new_df.columns)

    # 3. Calculate insert vs update counts
    existing_ids = set(existing_df['workId'])
    new_ids = set(new_df['workId'])

    overlapping_ids = new_ids.intersection(existing_ids)
    new_distinct_ids = new_ids - existing_ids

    updated_count = len(overlapping_ids)
    inserted_count = len(new_distinct_ids)

    # 4. Upsert logic:
    # Filter out rows in existing_df that are in new_df, then concatenate new_df
    # Align columns so existing columns are preserved and new columns are added if any
    all_columns = list(existing_df.columns)
    for col in new_df.columns:
        if col not in all_columns:
            all_columns.append(col)

    existing_remaining = existing_df[~existing_df['workId'].isin(new_df['workId'])].copy()
    merged_df = pd.concat([existing_remaining, new_df], ignore_index=True)

    # Ensure output directory exists
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    # 5. Write back to disk
    merged_df.to_csv(output_path, index=False, encoding='utf-8')

    return {
        "updated": updated_count,
        "inserted": inserted_count,
        "updatedWorkIds": sorted(list(overlapping_ids)),
        "insertedWorkIds": sorted(list(new_distinct_ids)),
        "total": len(merged_df),
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
        res = merge_unified_works_csv(csv_file)
        print(f"Merge complete: {res}")
    else:
        print("Usage: python ml/app/csv_merge.py <path_to_new_csv>")
