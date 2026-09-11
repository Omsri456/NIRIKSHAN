import type { RiskDistributionItem } from '@nirikshan/shared';
import { formatNumber } from '@/utils/format';

export function RiskDistributionChart({ data }: { data: RiskDistributionItem[] }) {
  const total = data.reduce((acc, item) => acc + item.count, 0) || 1;

  // Order levels consistently: Low, Medium, High, Critical
  const levelOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const sortedData = [...data].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div className="risk-dist-list">
        {sortedData.map((item) => {
          const percentage = ((item.count / total) * 100).toFixed(1);
          const levelClass = item.level.toLowerCase();
          const label = item.level.charAt(0) + item.level.slice(1).toLowerCase();

          return (
            <div key={item.level} className="risk-dist-row">
              <div className="risk-dist-row-header">
                <span className="risk-dist-level">{label}</span>
                <span className="risk-dist-stats">
                  {formatNumber(item.count)} • {percentage}%
                </span>
              </div>
              <div className="risk-dist-bar-track">
                <div
                  className={`risk-dist-bar-fill ${levelClass}`}
                  style={{ width: `${Math.max(Number(percentage), item.count > 0 ? 1.5 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Support Disclaimer Alert Box (Ref 2) */}
      <div className="risk-disclaimer-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>A risk score is a decision-support indicator, not a finding of fraud.</p>
      </div>
    </div>
  );
}
