import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse, Work } from '@nirikshan/shared';
import * as worksApi from '@/api/works';
import { extractErrorMessage } from '@/api/client';
import { StatusPill } from '@/components/ui/RiskBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { WORK_STATUS_OPTIONS } from '@/utils/constants';
import { formatCurrencyCompact, formatDate } from '@/utils/format';

export function WorksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const [result, setResult] = useState<PaginatedResponse<Work> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await worksApi.fetchWorks({
        page,
        limit: 20,
        status: status || undefined,
        search: search || undefined,
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
  }, [page, status, search]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    updateParam('search', searchInput.trim());
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
          <h2>Works</h2>
          <p className="subtitle">Every MPLADS work record within your scope.</p>
        </div>
      </div>

      <form className="filter-bar" onSubmit={handleSearchSubmit}>
        <div className="field grow">
          <label htmlFor="search">Search description</label>
          <input
            id="search"
            type="text"
            placeholder="e.g. community hall, drinking water…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {WORK_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Apply
        </button>
      </form>

      <div className="panel">
        {isLoading && <LoadingState label="Loading works…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No works match these filters"
            message="Try clearing the search term or status filter."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work ID</th>
                    <th>Description</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Final amount</th>
                    <th>Expenditure</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((work) => (
                    <tr
                      key={work._id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={() => navigate(`/works/${work.workId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/works/${work.workId}`);
                        }
                      }}
                    >
                      <td className="mono cell-secondary">{work.workId}</td>
                      <td className="cell-primary">{work.description}</td>
                      <td>
                        {work.location.district}, {work.location.state}
                      </td>
                      <td>
                        <StatusPill status={work.execution.status} />
                      </td>
                      <td className="mono">{formatCurrencyCompact(work.financial.finalAmount)}</td>
                      <td className="mono">
                        {formatCurrencyCompact(work.financial.totalExpenditure)}
                      </td>
                      <td className="cell-secondary">{formatDate(work.updatedAt)}</td>
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
