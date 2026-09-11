import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  DashboardOverview,
  RiskDistributionItem,
  StateOverview,
  TrendDataPoint,
} from '@nirikshan/shared';
import { UserRole } from '@nirikshan/shared';
import * as dashboardApi from '@/api/dashboard';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { TrendChart } from '@/components/charts/TrendChart';
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart';
import { StateTable } from '@/components/charts/StateTable';
import { GeographicRiskHeatmap } from '@/components/map/GeographicRiskHeatmap';
import { ErrorState, LoadingState } from '@/components/ui/States';

import { formatCurrencyCompact, formatNumber } from '@/utils/format';
import { ParliamentIllustration } from '@/components/ui/BrandAssets';

interface DashboardData {
  overview: DashboardOverview;
  trends: TrendDataPoint[];
  riskDistribution: RiskDistributionItem[];
  states: StateOverview[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overview, trends, riskDistribution, states] = await Promise.all([
        dashboardApi.fetchOverview(),
        dashboardApi.fetchTrends(),
        dashboardApi.fetchRiskDistribution(),
        dashboardApi.fetchStates(),
      ]);
      setData({ overview, trends, riskDistribution, states });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showStateBreakdown = user?.role === UserRole.MINISTRY || user?.role === UserRole.ADMIN;

  return (
    <div className="dashboard-page-wrap">
      {/* Background Layer: Faint Parliament Architectural Watermark (Attached Image 4) */}
      <div className="dashboard-bg-watermark">
        <ParliamentIllustration variant="dashboard" />
      </div>

      {/* Page Header (Reference 2) */}
      <div className="page-header" style={{ position: 'relative', zIndex: 10 }}>
        <div>
          <div className="page-eyebrow">DASHBOARD</div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">
            Fund utilization, execution status and risk posture across works in your scope.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/risk-map" className="btn-action-overview" style={{ background: '#fff', color: 'var(--slate-700)', borderColor: 'var(--border-card)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span>Geographic Heatmap</span>
          </Link>
          <Link to="/high-risk" className="btn-action-overview">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Review high-risk works</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      {isLoading && <LoadingState label="Loading overview metrics…" />}
      {error && !isLoading && <ErrorState message={error} onRetry={load} />}

      {data && !isLoading && !error && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          {/* Row of 4 Metric Cards (Ref 2) */}
          <div className="metric-cards-grid">
            <StatCard
              label="Total works"
              value={formatNumber(data.overview.totalWorks)}
              meta={`${formatNumber(data.overview.completedWorks)} completed`}
              variant="blue"
            />
            <StatCard
              label="Fund utilization"
              value={`${data.overview.utilizationPercentage.toFixed(1)}%`}
              meta={`${formatCurrencyCompact(data.overview.totalExpenditure)} of ${formatCurrencyCompact(
                data.overview.totalAllocated
              )}`}
              variant="green"
            />
            <StatCard
              label="Delayed works"
              value={formatNumber(data.overview.delayedWorks)}
              meta={`${formatNumber(data.overview.inProgressWorks)} in progress`}
              variant="amber"
            />
            <StatCard
              label="Active investigations"
              value={formatNumber(data.overview.activeInvestigations)}
              meta={`${formatNumber(data.overview.alertCount)} open alerts`}
              variant="rose"
            />
          </div>

          {/* Main Analytics Area (Ref 2) */}
          <div className="analytics-grid">
            {/* Left: Expenditure & Average Risk Trend */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title-group">
                  <svg className="analytics-card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <h2 className="analytics-card-title">Expenditure & average risk trend</h2>
                </div>
                <select className="timeframe-select" defaultValue="Quarterly">
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <TrendChart data={data.trends} />
            </div>

            {/* Right: Risk Distribution */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title-group">
                  <svg className="analytics-card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                  <h2 className="analytics-card-title">Risk distribution</h2>
                </div>
              </div>
              <RiskDistributionChart data={data.riskDistribution} />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <GeographicRiskHeatmap />
          </div>

          {/* Works by State (when authorized) */}
          {showStateBreakdown && (
            <div className="table-card" style={{ marginTop: 24 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>Works by state</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>{data.states.length} states</span>
              </div>
              <div className="data-table-wrap">
                <StateTable data={data.states} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
