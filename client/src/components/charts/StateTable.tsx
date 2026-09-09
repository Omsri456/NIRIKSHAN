import type { StateOverview } from '@nirikshan/shared';
import { formatCurrencyCompact, formatNumber } from '@/utils/format';

export function StateTable({ data }: { data: StateOverview[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>State</th>
            <th>Works</th>
            <th>Expenditure</th>
            <th>Utilization</th>
            <th>Avg. risk</th>
            <th>Critical</th>
            <th>High risk</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.state}>
              <td className="cell-primary">{row.state}</td>
              <td className="mono">{formatNumber(row.totalWorks)}</td>
              <td className="mono">{formatCurrencyCompact(row.totalExpenditure)}</td>
              <td className="mono">{row.utilizationPercentage.toFixed(1)}%</td>
              <td className="mono">{row.averageRiskScore.toFixed(0)}</td>
              <td className="mono">{formatNumber(row.criticalWorks)}</td>
              <td className="mono">{formatNumber(row.highRiskWorks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
