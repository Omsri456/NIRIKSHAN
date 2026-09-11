import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as recommendationsApi from '@/api/recommendations';
import type { WorkRecommendation, RecommendationStatus } from '@/api/recommendations';
import { extractErrorMessage } from '@/api/client';
import { StatusPill } from '@/components/ui/RiskBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, formatCurrency } from '@/utils/format';

const RECOMMENDATION_STATUS_OPTIONS: RecommendationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
];

const STATUS_LABELS: Record<RecommendationStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function RecommendationsReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const status = (searchParams.get('status') ?? '') as RecommendationStatus | '';

  const [result, setResult] = useState<{
    data: WorkRecommendation[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await recommendationsApi.fetchRecommendations({
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

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

  async function handleStatusUpdate(id: string, newStatus: RecommendationStatus) {
    setUpdatingId(id);
    setUpdateError(null);
    try {
      await recommendationsApi.updateRecommendationStatus(id, newStatus);
      await load();
    } catch (err) {
      setUpdateError(extractErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">AUTHORITY WORKFLOW</div>
          <h1 className="page-title">Review Recommendations</h1>
          <p className="page-subtitle">
            Review and act on MP-submitted work proposals within your scope.
          </p>
        </div>
      </div>

      <div className="table-card">
        {/* Status Filter Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="timeframe-select"
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {RECOMMENDATION_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-table-tool"
              style={{
                backgroundColor: status === 'SUBMITTED' ? '#eff6ff' : '#ffffff',
                borderColor: status === 'SUBMITTED' ? '#3b82f6' : '#cbd5e1',
                color: status === 'SUBMITTED' ? '#1d4ed8' : '#334155',
              }}
              onClick={() => updateStatus(status === 'SUBMITTED' ? '' : 'SUBMITTED')}
            >
              <span>Pending Review</span>
            </button>
          </div>
        </div>

        {updateError && (
          <div className="form-error-banner" style={{ margin: '0 0 12px' }}>
            {updateError}
          </div>
        )}

        {isLoading && <LoadingState label="Loading recommendations…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No recommendations found"
            message="No work proposals match the selected filter within your scope."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="data-table-wrap">
              <table className="gov-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Description / Category</th>
                    <th>Recommended By</th>
                    <th>Location</th>
                    <th>Est. Cost</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((rec, index) => {
                    const rowIndex = (page - 1) * result.pagination.limit + index + 1;
                    const isPending = rec.status === 'SUBMITTED' || rec.status === 'UNDER_REVIEW';
                    const isUpdating = updatingId === rec._id;

                    return (
                      <tr key={rec._id}>
                        <td className="cell-index">{rowIndex}.</td>
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: 'var(--slate-900)',
                              marginBottom: '2px',
                            }}
                          >
                            {rec.description.length > 60
                              ? rec.description.slice(0, 60) + '…'
                              : rec.description}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{rec.category}</div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>
                          <div style={{ fontWeight: 500 }}>{rec.recommendedBy?.name ?? '—'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {rec.recommendedBy?.email ?? ''}
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>
                          {[rec.constituency, rec.district, rec.state].filter(Boolean).join(', ')}
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--slate-900)' }}>
                          {formatCurrency(rec.estimatedCost)}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                          {formatDate(rec.createdAt)}
                        </td>
                        <td>
                          <StatusPill status={rec.status} />
                        </td>
                        <td>
                          {isPending ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn-table-tool"
                                style={{
                                  borderColor: '#16a34a',
                                  color: '#16a34a',
                                  backgroundColor: '#f0fdf4',
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                }}
                                disabled={isUpdating}
                                onClick={() => handleStatusUpdate(rec._id, 'APPROVED')}
                              >
                                {isUpdating ? '…' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className="btn-table-tool"
                                style={{
                                  borderColor: '#dc2626',
                                  color: '#dc2626',
                                  backgroundColor: '#fef2f2',
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                }}
                                disabled={isUpdating}
                                onClick={() => handleStatusUpdate(rec._id, 'REJECTED')}
                              >
                                {isUpdating ? '…' : 'Reject'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                          )}
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
