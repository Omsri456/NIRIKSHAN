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
import { ErrorState, LoadingState } from '@/components/ui/States';
import { formatCurrencyCompact, formatNumber } from '@/utils/format';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showStateBreakdown = user?.role === UserRole.MINISTRY || user?.role === UserRole.ADMIN;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Overview</h2>
          <p className="subtitle">
            Fund utilization, execution status and risk posture across works in your scope.
          </p>
        </div>
        <Link to="/high-risk" className="btn btn-secondary">
          Review high-risk works
        </Link>
      </div>

      {isLoading && <LoadingState label="Loading dashboard…" />}
      {error && !isLoading && <ErrorState message={error} onRetry={load} />}

      {data && !isLoading && !error && (
        <>
          <div className="grid grid-cols-4" style={{ marginBottom: 24 }}>
            <StatCard
              label="Total works"
              value={formatNumber(data.overview.totalWorks)}
              meta={`${formatNumber(data.overview.completedWorks)} completed`}
            />
            <StatCard
              label="Fund utilization"
              value={`${data.overview.utilizationPercentage.toFixed(1)}%`}
              meta={`${formatCurrencyCompact(data.overview.totalExpenditure)} of ${formatCurrencyCompact(
                data.overview.totalAllocated
              )}`}
              accent="positive"
            />
            <StatCard
              label="Delayed works"
              value={formatNumber(data.overview.delayedWorks)}
              meta={`${formatNumber(data.overview.inProgressWorks)} in progress`}
              accent="amber"
            />
            <StatCard
              label="Active investigations"
              value={formatNumber(data.overview.activeInvestigations)}
              meta={`${formatNumber(data.overview.alertCount)} open alerts`}
              accent="critical"
            />
          </div>

          <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
            <div className="panel" style={{ gridColumn: 'span 2' }}>
              <div className="panel-header">
                <h3>Expenditure & average risk trend</h3>
                <span className="muted">Quarterly</span>
              </div>
              <div className="panel-body">
                <TrendChart data={data.trends} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Risk distribution</h3>
              </div>
              <div className="panel-body">
                <RiskDistributionChart data={data.riskDistribution} />
              </div>
            </div>
          </div>

          {showStateBreakdown && (
            <div className="panel" style={{ marginTop: 24 }}>
              <div className="panel-header">
                <h3>Works by state</h3>
                <span className="muted">{data.states.length} states</span>
              </div>
              <div className="panel-body panel-body--tight">
                <StateTable data={data.states} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
