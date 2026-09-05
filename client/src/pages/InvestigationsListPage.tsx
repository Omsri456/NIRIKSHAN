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

export function InvestigationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? '';

  const [result, setResult] = useState<PaginatedResponse<Investigation> | null>(null);
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Investigations</h2>
          <p className="subtitle">Human review workflow for flagged works.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => updateStatus(e.target.value)}>
            <option value="">All statuses</option>
            {INVESTIGATION_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        {isLoading && <LoadingState label="Loading investigations…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No investigations found"
            message="Open an investigation from a work's intelligence page to get started."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Finding</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((inv) => (
                    <tr
                      key={inv._id}
                      className="clickable"
                      onClick={() => navigate(`/investigations/${inv._id}`)}
                    >
                      <td className="mono cell-primary">{inv.workId}</td>
                      <td>
                        <StatusPill status={inv.status} />
                      </td>
                      <td>
                        <RiskBadge level={inv.priority} />
                      </td>
                      <td className="cell-secondary">
                        {inv.finding ? humanize(inv.finding) : 'Pending'}
                      </td>
                      <td className="cell-secondary">{formatDate(inv.updatedAt)}</td>
                    </tr>
                  ))}
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
