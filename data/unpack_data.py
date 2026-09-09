"""
NIRIKSHAN - Automated Dataset & Model Extraction Utility
=========================================================
Extracts the packaged ML datasets/models zip into the project directories:
  - ML_data/
  - data/processed/
  - ml/models/ (if present in bundle)

Usage:
  python data/unpack_data.py
  OR
  npm run setup:data
"""

import os
import sys
import zipfile

def unpack():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Priority: full bundle first, then datasets zip
    candidates = [
        "nirikshan_ml_full_bundle.zip",
        "nirikshan_ml_datasets.zip"
    ]
    
    archive_path = None
    for c in candidates:
        candidate_path = os.path.join(project_root, c)
        if os.path.exists(candidate_path):
            archive_path = candidate_path
            break
            
    if not archive_path:
        print("[ERROR] No dataset archive found in project root!")
        print("Expected 'nirikshan_ml_datasets.zip' or 'nirikshan_ml_full_bundle.zip'.")
        print("Please place the zip file in the root NIRIKSHAN/ directory.")
        sys.exit(1)
        
    print("=" * 60)
    print("  NIRIKSHAN - Dataset Unpacking Utility")
    print("=" * 60)
    print(f"Found archive: {os.path.basename(archive_path)} ({os.path.getsize(archive_path) / (1024*1024):.2f} MB)")
    print(f"Extracting into: {project_root} ...\n")
    
    extracted_count = 0
    with zipfile.ZipFile(archive_path, 'r') as z:
        for member in z.namelist():
            if member.endswith('/'):
                continue
            z.extract(member, project_root)
            extracted_count += 1
            print(f"  [OK] Extracted: {member}")
            
    print("\n" + "=" * 60)
    print(f"Extraction complete! Successfully restored {extracted_count} files.")
    print("=" * 60)
    print("You can now run:")
    print("  1. python data/etl_enrich.py         (ETL Pipeline)")
    print("  2. python -m ml.app.batch_score      (ML Batch Scoring)")
    print("  3. python -m ml.app.evaluate         (Model Evaluation)")

if __name__ == "__main__":
    unpack()
