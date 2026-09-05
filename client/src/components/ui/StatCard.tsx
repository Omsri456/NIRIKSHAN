import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  meta?: ReactNode;
  metaTone?: 'positive' | 'negative' | 'neutral';
  accent?: 'default' | 'amber' | 'critical' | 'positive';
}

export function StatCard({ label, value, meta, metaTone = 'neutral', accent = 'default' }: StatCardProps) {
  const accentClass = accent !== 'default' ? `accent-${accent}` : '';
  const metaClass = metaTone !== 'neutral' ? metaTone : '';
  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {meta && <div className={`stat-card-meta ${metaClass}`}>{meta}</div>}
    </div>
  );
}
