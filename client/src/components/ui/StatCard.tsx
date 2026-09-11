import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  meta?: string;
  variant?: 'blue' | 'green' | 'amber' | 'rose';
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  meta,
  variant = 'blue',
  icon,
}: StatCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <div className={`metric-icon-wrap ${variant}`}>
          {icon ? (
            icon
          ) : variant === 'green' ? (
            <CoinsIcon />
          ) : variant === 'amber' ? (
            <ClockIcon />
          ) : variant === 'rose' ? (
            <SearchAlertIcon />
          ) : (
            <DocumentIcon />
          )}
        </div>
        <SparklineMiniIcon className="metric-sparkline-icon" />
      </div>

      <div>
        <div className="metric-card-label">{label}</div>
        <div className="metric-card-value">{value}</div>
        {meta && <div className="metric-card-meta">{meta}</div>}
      </div>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="7" rx="9" ry="3" />
      <path d="M3 7v6c0 1.66 4 3 9 3s9-1.34 9-3V7" />
      <path d="M3 13v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SearchAlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="12" />
      <line x1="11" y1="14" x2="11.01" y2="14" />
    </svg>
  );
}

function SparklineMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="14" width="3.5" height="7" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="10" y="9" width="3.5" height="12" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="17" y="4" width="3.5" height="17" rx="1" fill="currentColor" />
    </svg>
  );
}
