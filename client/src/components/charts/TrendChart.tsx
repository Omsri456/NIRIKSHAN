import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendDataPoint } from '@nirikshan/shared';
import { formatCurrencyCompact } from '@/utils/format';

export function TrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-200)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--slate-200)' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(v) => formatCurrencyCompact(v)}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid var(--border-default)',
          }}
          formatter={(value: number, name: string) =>
            name === 'Expenditure' ? [formatCurrencyCompact(value), name] : [value, name]
          }
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="expenditure"
          name="Expenditure"
          stroke="var(--navy-800)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="averageRiskScore"
          name="Avg. risk score"
          stroke="var(--amber-500)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
