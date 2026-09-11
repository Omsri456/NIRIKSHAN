import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { EarlyWarningAlert, PaginatedResponse } from '@nirikshan/shared';
import * as alertsApi from '@/api/alerts';
import * as investigationsApi from '@/api/investigations';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, humanize } from '@/utils/format';

export function EarlyWarningsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(searchParams.get('page') ?? '1');

  const [result, setResult] = useState<PaginatedResponse<EarlyWarningAlert> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingWorkId, setCreatingWorkId] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await alertsApi.fetchEarlyWarnings({ page, limit: 20 });
      setResult(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  async function handleOpenInvestigation(workId: string, newLevel: string) {
    setCreatingWorkId(workId);
    try {
      const priority =
        newLevel === 'CRITICAL'
          ? 'CRITICAL'
          : newLevel === 'HIGH'
            ? 'HIGH'
            : 'MEDIUM';
      const investigation = await investigationsApi.createInvestigation(workId, priority);
      navigate(`/investigations/${investigation._id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreatingWorkId(null);
    }
  }

  async function handleAcknowledge(alertId: string) {
    setAcknowledgingId(alertId);
    try {
      const updated = await alertsApi.acknowledgeEarlyWarning(alertId);
      if (result) {
        setResult({
          ...result,
          data: result.data.map((item) => (item._id === alertId ? updated : item)),
        });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">PREDICTIVE INTELLIGENCE</div>
          <h1 className="page-title">Early warning alerts</h1>
          <p className="page-subtitle">
            Automated alerts triggered by risk-level escalations or rapid score jumps across monitored works.
            An early warning flags works for priority review — it is not a finding of fraud.
          </p>
        </div>
      </div>

      <div className="table-card">
        {isLoading && <LoadingState label="Loading early warning alerts…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No early warning alerts"
            message="No risk escalations or rapid score jumps detected in your administrative scope."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="data-table-wrap">
              <table className="gov-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Work ID</th>
                    <th>Score Delta</th>
                    <th>Level Change</th>
                    <th>Trigger Type</th>
                    <th>Detected</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((alert, index) => {
                    const rowIndex = (page - 1) * result.pagination.limit + index + 1;
                    return (
                      <tr key={alert._id}>
                        <td className="cell-index">{rowIndex}.</td>
                        <td className="cell-work-id">{alert.workId}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {alert.previousScore} → {alert.newScore}{' '}
                          <span style={{ fontSize: '12px', color: alert.scoreDelta > 0 ? '#b91c1c' : '#047857' }}>
                            ({alert.scoreDelta >= 0 ? `+${alert.scoreDelta}` : alert.scoreDelta})
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <RiskBadge level={alert.previousLevel} />
                            <span style={{ color: '#94a3b8' }}>→</span>
                            <RiskBadge level={alert.newLevel} />
                          </div>
                        </td>
                        <td style={{ color: '#475569' }}>{humanize(alert.triggerType)}</td>
                        <td style={{ color: '#64748b' }}>{formatDate(alert.triggeredAt)}</td>
                        <td>
                          <span
                            className={`gov-risk-badge ${
                              alert.status === 'UNSEEN' ? 'critical' : 'low'
                            }`}
                          >
                            <span className="gov-risk-badge-dot" />
                            {alert.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-table-tool"
                              style={{ backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#0f766e', height: '32px', padding: '0 12px', fontSize: '12px' }}
                              disabled={creatingWorkId === alert.workId}
                              onClick={() => handleOpenInvestigation(alert.workId, alert.newLevel)}
                            >
                              {creatingWorkId === alert.workId ? 'Opening…' : 'Investigate'}
                            </button>
                            {alert.status === 'UNSEEN' && (
                              <button
                                type="button"
                                className="btn-table-tool"
                                style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                                disabled={acknowledgingId === alert._id}
                                onClick={() => handleAcknowledge(alert._id)}
                              >
                                {acknowledgingId === alert._id ? 'Ack…' : 'Acknowledge'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.pagination} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}
