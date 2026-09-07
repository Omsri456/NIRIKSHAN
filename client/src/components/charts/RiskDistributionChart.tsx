import type { RiskDistributionItem } from '@nirikshan/shared';
import { RISK_LEVEL_COLORS } from '@/utils/constants';
import { formatNumber, humanize } from '@/utils/format';

export function RiskDistributionChart({ data }: { data: RiskDistributionItem[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.map((item) => (
        <div key={item.level}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12.5,
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 600, color: RISK_LEVEL_COLORS[item.level] }}>
              {humanize(item.level)}
            </span>
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>
              {formatNumber(item.count)} · {item.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: RISK_LEVEL_COLORS[item.level],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
