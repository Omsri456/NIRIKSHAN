import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  DashboardOverview,
  Investigation,
  RiskDistributionItem,
  StateOverview,
  TrendDataPoint,
} from '@nirikshan/shared';
import { UserRole } from '@nirikshan/shared';
import * as dashboardApi from '@/api/dashboard';
import * as investigationsApi from '@/api/investigations';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { TrendChart } from '@/components/charts/TrendChart';
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart';
import { StateTable } from '@/components/charts/StateTable';
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
  const [mpInvestigations, setMpInvestigations] = useState<{ total: number; items: Investigation[] } | null>(null);
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

      if (user?.role === UserRole.MP) {
        try {
          const invRes = await investigationsApi.fetchInvestigations({ limit: 5 });
          setMpInvestigations({
            total: invRes.pagination?.total ?? invRes.data.length,
            items: invRes.data,
          });
        } catch {
          // Non-critical supplementary data for MP
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

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
        <div>
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

          {/* Investigations on MP Recommended Works (when user is MP) */}
          {user?.role === UserRole.MP && mpInvestigations && (
            <div className="table-card" style={{ marginTop: 24, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#f3e8ff',
                      color: '#7e22ce',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      border: '1px solid #e9d5ff',
                    }}
                  >
                    MP
                  </span>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>
                      Investigations on your recommended works
                    </h2>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                      Active oversight cases in {user.scope?.constituency ? `${user.scope.constituency} constituency` : 'your constituency'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/investigations"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#0f766e',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>View all ({mpInvestigations.total})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              {mpInvestigations.items.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>
                  No active investigations flagged for works in your constituency.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mpInvestigations.items.slice(0, 3).map((inv) => (
                    <div
                      key={inv._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate-800)' }}>
                          Work #{inv.workId}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                          }}
                        >
                          {inv.status}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              inv.priority === 'CRITICAL' || inv.priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
                            color:
                              inv.priority === 'CRITICAL' || inv.priority === 'HIGH' ? '#b91c1c' : '#b45309',
                          }}
                        >
                          {inv.priority}
                        </span>
                      </div>
                      <Link
                        to={`/investigations/${inv._id}`}
                        style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f766e', textDecoration: 'none' }}
                      >
                        Review Dossier &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
