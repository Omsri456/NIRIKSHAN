"""
NIRIKSHAN — Interactive Model Demonstration CLI
================================================
Run this script to showcase the Risk Intelligence Engine to colleagues:
  python ml/demo.py
"""

import os
import sys
import json
import time

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
data_path = os.path.join(project_root, 'data', 'processed', 'risk_scores.json')

def load_scores():
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found. Please run 'python ml/app/batch_score.py' first.")
        sys.exit(1)
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def print_work_card(work):
    wid = work.get('workId')
    score = work.get('overallRiskScore', 0)
    level = work.get('riskLevel', 'UNKNOWN')
    flags = work.get('flags', [])
    scores = work.get('scores', {})
    exp = work.get('explainability', {})

    level_colors = {
        'CRITICAL': '\033[91m',  # Red
        'HIGH': '\033[93m',      # Yellow
        'MEDIUM': '\033[94m',    # Blue
        'LOW': '\033[92m',       # Green
    }
    reset = '\033[0m'
    bold = '\033[1m'
    col = level_colors.get(level, '')

    print("\n" + "=" * 70)
    print(f"  {bold}WORK ID: {wid}{reset}  |  RISK: {col}{bold}{level} ({score}/100){reset}")
    print("=" * 70)
    
    print(f"\n{bold}Sub-Model Scores:{reset}")
    print(f"  • Cost Anomaly:          {scores.get('costAnomalyScore', 0):>5.1f} / 100")
    print(f"  • Timeline Delay:        {scores.get('timelineDelayScore', 0):>5.1f} / 100")
    print(f"  • Payment Anomaly:       {scores.get('paymentAnomalyScore', 0):>5.1f} / 100")
    print(f"  • Duplicate Similarity:  {scores.get('duplicateSimilarityScore', 0):>5.1f} / 100")

    print(f"\n{bold}Active Flags ({len(flags)}):{reset}")
    if flags:
        for f in flags:
            print(f"  🚩 {col}{f}{reset}")
    else:
        print("  ✅ None (Clean record)")

    print(f"\n{bold}AI Summary:{reset}")
    print(f"  \"{exp.get('summary', 'No summary available.')}\"")

    evidence = exp.get('evidence', [])
    if evidence:
        print(f"\n{bold}Evidence & Audit Trail ({len(evidence)} items):{reset}")
        for ev in evidence:
            cat = ev.get('category', 'GENERAL')
            sev = ev.get('severity', 'INFO')
            title = ev.get('title', '')
            desc = ev.get('description', '')
            print(f"  • [{cat} - {sev}] {bold}{title}{reset}")
            print(f"    {desc}")
            if 'metrics' in ev:
                m_str = ", ".join(f"{k}: {v}" for k, v in ev['metrics'].items())
                print(f"    \033[90m(Data metrics: {m_str})\033[0m")
    print("=" * 70)

def main():
    scores = load_scores()
    score_map = {s['workId']: s for s in scores}
    
    critical_list = [s for s in scores if s['riskLevel'] == 'CRITICAL']
    high_list = [s for s in scores if s['riskLevel'] == 'HIGH']
    low_list = [s for s in scores if s['riskLevel'] == 'LOW']

    while True:
        print("\n" + "#" * 60)
        print("  NIRIKSHAN — ML Risk Intelligence Interactive Showcase")
        print("#" * 60)
        print("1. Inspect a CRITICAL Risk Work (Compound cost overrun & vendor scatter)")
        print("2. Inspect a HIGH Risk Stalled Work (> 2 years inactive delay)")
        print("3. Inspect a Genuine LOW Risk Work (Normal, compliant government tender)")
        print("4. Lookup Any Work by ID (Total: 87,272 works available)")
        print("5. View Aggregate National Risk Distribution")
        print("6. Run Live Model Test Suite (24 automated tests)")
        print("7. Exit")
        print("-" * 60)
        
        choice = input("Enter choice (1-7): ").strip()

        if choice == '1':
            if critical_list:
                print_work_card(critical_list[0])
            else:
                print("No critical works found.")
        elif choice == '2':
            stalled = [s for s in high_list if 'STALLED_WORK' in s.get('flags', [])]
            if stalled:
                print_work_card(stalled[0])
            else:
                print_work_card(high_list[0])
        elif choice == '3':
            clean = [s for s in low_list if len(s.get('flags', [])) == 0]
            if clean:
                print_work_card(clean[0])
            else:
                print_work_card(low_list[0])
        elif choice == '4':
            wid = input("Enter Work ID to inspect (e.g. 80680, 80673, 138509, 311247): ").strip()
            if wid in score_map:
                print_work_card(score_map[wid])
            else:
                print(f"Work ID '{wid}' not found in the dataset.")
        elif choice == '5':
            dist = {"CRITICAL": len(critical_list), "HIGH": len(high_list), 
                    "MEDIUM": len([s for s in scores if s['riskLevel'] == 'MEDIUM']), 
                    "LOW": len(low_list)}
            total = len(scores)
            print("\n" + "=" * 50)
            print("  NATIONAL RISK INTELLIGENCE OVERVIEW")
            print("=" * 50)
            for lvl, count in dist.items():
                pct = (count / total) * 100
                bar = "█" * int(pct / 2)
                print(f"  {lvl:<9}: {count:>6,} ({pct:>5.1f}%) {bar}")
            print("=" * 50)
        elif choice == '6':
            print("\nRunning automated test suite across all 4 models and API...")
            os.system(f'"{sys.executable}" -m pytest ml/tests/test_ml_pipeline.py -v')
        elif choice == '7' or choice.lower() in ['q', 'exit']:
            print("\nExiting showcase demo. Goodbye!")
            break
        else:
            print("Invalid selection. Please enter 1-7.")

if __name__ == '__main__':
    main()
