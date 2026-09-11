import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Investigation, PaginatedResponse } from '@nirikshan/shared';
import * as investigationsApi from '@/api/investigations';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge, StatusPill } from '@/components/ui/RiskBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { INVESTIGATION_STATUS_OPTIONS } from '@/utils/constants';
import { formatDate, humanize } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

export function InvestigationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReviewer =
    user?.role === 'MINISTRY' || user?.role === 'STATE_AUTHORITY' || user?.role === 'ADMIN';

  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? '';

  const [result, setResult] = useState<PaginatedResponse<Investigation> | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationsApi.fetchInvestigations({
        page,
        limit: 20,
        status: status || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingCount = async () => {
    if (!isReviewer) return;
    try {
      const data = await investigationsApi.fetchInvestigations({
        status: 'PENDING_VERIFICATION',
        limit: 1,
      });
      setPendingCount(data.pagination.total);
    } catch {
      // Non-critical queue count
    }
  };

  useEffect(() => {
    load();
  }, [page, status]);

  useEffect(() => {
    loadPendingCount();
  }, [isReviewer]);

  function updateStatus(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    next.delete('page');
    setSearchParams(next);
  }

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">AUDIT & RESOLUTION WORKFLOW</div>
          <h1 className="page-title">Investigations</h1>
          <p className="page-subtitle">Human review workflow, case files, and multi-tier evidence validation for flagged works.</p>
        </div>
      </div>

      <div className="table-card">
        {/* Status Filter Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              className="timeframe-select"
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {INVESTIGATION_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>

            {isReviewer && (
              <button
                type="button"
                className="btn-table-tool"
                style={{
                  backgroundColor: status === 'PENDING_VERIFICATION' ? '#f0fdfa' : '#ffffff',
                  borderColor: status === 'PENDING_VERIFICATION' ? '#14b8a6' : '#cbd5e1',
                  color: status === 'PENDING_VERIFICATION' ? '#0f766e' : '#334155',
                }}
                onClick={() =>
                  updateStatus(status === 'PENDING_VERIFICATION' ? '' : 'PENDING_VERIFICATION')
                }
              >
                <span>Pending Verification</span>
                {pendingCount !== null && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {isLoading && <LoadingState label="Loading investigations…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No investigations found"
            message="Open an investigation from a flagged work's intelligence page to initiate review."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="data-table-wrap">
              <table className="gov-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th style={{ minWidth: '280px' }}>Work Details</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Finding</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((inv, index) => {
                    const rowIndex = (page - 1) * result.pagination.limit + index + 1;
                    return (
                      <tr
                        key={inv._id}
                        className="clickable"
                        onClick={() => navigate(`/investigations/${inv._id}`)}
                      >
                        <td className="cell-index">{rowIndex}.</td>
                        <td style={{ maxWidth: '380px', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="mono" style={{ fontWeight: 700, color: '#0f766e', fontSize: '13px' }}>
                                {inv.workId}
                              </span>
                              {inv.work?.category && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  {inv.work.category}
                                </span>
                              )}
                            </div>
                            {inv.work?.description && (
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  color: '#1e293b',
                                  lineHeight: 1.35,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 500,
                                }}
                                title={inv.work.description}
                              >
                                {inv.work.description}
                              </div>
                            )}
                            {inv.work?.location && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {[inv.work.location.district, inv.work.location.state].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusPill status={inv.status} />
                        </td>
                        <td>
                          <RiskBadge level={inv.priority} />
                        </td>
                        <td style={{ color: '#475569', fontWeight: 500 }}>
                          {inv.finding ? humanize(inv.finding) : 'Pending Review'}
                        </td>
                        <td style={{ color: '#64748b' }}>{formatDate(inv.updatedAt)}</td>
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
