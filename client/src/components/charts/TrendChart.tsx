import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendDataPoint } from '@nirikshan/shared';
import { formatCurrencyCompact } from '@/utils/format';

export function TrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="expenditureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            dataKey="period"
            tick={{ fontSize: 11.5, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          {/* Left Y-Axis for Expenditure */}
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fontSize: 11.5, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          {/* Right Y-Axis for Risk Score */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11.5, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />

          <Tooltip
            contentStyle={{
              fontSize: '12px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) =>
              name === 'Expenditure' ? [formatCurrencyCompact(value), 'Expenditure'] : [value, 'Avg. Risk Score']
            }
          />

          {/* Expenditure Area Spline Curve */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="expenditure"
            name="Expenditure"
            stroke="#0f766e"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#expenditureGrad)"
            dot={{ r: 4, fill: '#0f766e', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          {/* Risk Score Dashed Line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="averageRiskScore"
            name="Avg. risk score"
            stroke="#d97706"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: '#d97706', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Institutional Legend Matching Ref 2 */}
      <div className="chart-custom-legend">
        <div className="legend-item">
          <span className="legend-indicator-expenditure" />
          <span>Expenditure (₹ Cr)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator-risk" />
          <span>Average risk score</span>
        </div>
      </div>
    </div>
  );
}
