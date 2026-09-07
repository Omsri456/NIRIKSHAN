import csv, sys, statistics
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

rows = []
with open('data/processed/unified_works.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        rows.append(row)

total = len(rows)
status = Counter(r['workStatus'] for r in rows)
print('=== WORK STATUS ===')
for k, v in status.items():
    print(f'  {k}: {v:,} ({100*v/total:.1f}%)')

print()
print('=== MODEL 1: COST ANOMALY ===')
rec_amts = [float(r['recommendedAmount']) for r in rows if r['recommendedAmount']]
fin_amts = [float(r['finalAmount']) for r in rows if r['finalAmount']]
ratios   = [float(r['finalToRecommendedRatio']) for r in rows if r['finalToRecommendedRatio']]
print(f'  recommendedAmount : {len(rec_amts):,}  min={min(rec_amts):,.0f}  max={max(rec_amts):,.0f}  median={statistics.median(rec_amts):,.0f}')
print(f'  finalAmount       : {len(fin_amts):,}  min={min(fin_amts):,.0f}  max={max(fin_amts):,.0f}  median={statistics.median(fin_amts):,.0f}')
print(f'  fin/rec ratio     : {len(ratios):,}  min={min(ratios):.3f}  max={max(ratios):.3f}  median={statistics.median(ratios):.3f}')
cats = Counter(r['category'] for r in rows if r['category'])
print(f'  categories: {dict(cats)}')
states_set = set(r['state'] for r in rows if r['state'])
districts_set = set(r['district'] for r in rows if r['district'])
print(f'  states: {len(states_set)}  districts: {len(districts_set)}')
high_ratio = sum(1 for x in ratios if x > 1.5)
print(f'  Works with final/rec > 1.5x (cost overrun signal): {high_ratio} ({100*high_ratio/len(ratios):.1f}%)')

print()
print('=== MODEL 2: TIMELINE / DELAY ===')
impl_days  = [int(r['implementationDays']) for r in rows if r['implementationDays']]
days_since = [int(r['daysSinceRecommendation']) for r in rows if r['daysSinceRecommendation']]
san_lags   = [int(r['sanctionLagDays']) for r in rows if r['sanctionLagDays']]
print(f'  implementationDays (completed):   {len(impl_days):,}  min={min(impl_days)}  max={max(impl_days)}  median={statistics.median(impl_days):.0f}d')
print(f'  daysSinceRecommendation (active): {len(days_since):,}  min={min(days_since)}  max={max(days_since)}  median={statistics.median(days_since):.0f}d')
print(f'  sanctionLagDays (synthetic):      {len(san_lags):,}  min={min(san_lags)}  max={max(san_lags)}  mean={statistics.mean(san_lags):.1f}d')
long_delay = sum(1 for d in days_since if d > 365)
very_long  = sum(1 for d in days_since if d > 730)
print(f'  Active works older than 1 year:  {long_delay:,} ({100*long_delay/len(days_since):.1f}%)')
print(f'  Active works older than 2 years: {very_long:,} ({100*very_long/len(days_since):.1f}%) -- strong delay signal')

print()
print('=== MODEL 3: PAYMENT ANOMALY ===')
works_with_pay = [r for r in rows if int(r['paymentCount']) > 0]
exp_amts = [float(r['totalExpenditure']) for r in works_with_pay]
vendor_counts = [int(r['uniqueVendorCount']) for r in works_with_pay]
pending_vals  = [int(r['pendingPaymentCount']) for r in works_with_pay]
print(f'  Works WITH payments : {len(works_with_pay):,} ({100*len(works_with_pay)/total:.1f}%)')
print(f'  Works WITHOUT       : {total - len(works_with_pay):,} ({100*(total - len(works_with_pay))/total:.1f}%)')
if exp_amts:
    print(f'  totalExpenditure: min={min(exp_amts):,.0f}  max={max(exp_amts):,.0f}  median={statistics.median(exp_amts):,.0f}')
    print(f'  uniqueVendorCount: min={min(vendor_counts)}  max={max(vendor_counts)}  mean={statistics.mean(vendor_counts):.1f}')
    multi_vendor = sum(1 for v in vendor_counts if v > 3)
    print(f'  Works with >3 vendors: {multi_vendor}')
    has_pending = sum(1 for p in pending_vals if p > 0)
    print(f'  Works with pending payments: {has_pending} ({100*has_pending/len(works_with_pay):.1f}%)')

print()
print('=== MODEL 4: NLP SIMILARITY ===')
descs = [r['workDescription'] for r in rows if r['workDescription']]
desc_lens = [len(d.split()) for d in descs]
desc_counter = Counter(descs)
exact_dups = sum(v for v in desc_counter.values() if v > 1)
uniq = len(desc_counter)
print(f'  Descriptions: {len(descs):,} ({100*len(descs)/total:.1f}%)')
print(f'  Word count: min={min(desc_lens)}  max={max(desc_lens)}  mean={statistics.mean(desc_lens):.1f}')
print(f'  Unique descriptions: {uniq:,}')
print(f'  Exact-duplicate descriptions: {exact_dups:,} rows  ({len([k for k,v in desc_counter.items() if v>1]):,} phrases repeated)')
