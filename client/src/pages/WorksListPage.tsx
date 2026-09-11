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
import { formatCurrencyCompact, formatDate, translateWorkDescription } from '@/utils/format';

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
          <div className="page-eyebrow">MONITORING REPOSITORY</div>
          <h1 className="page-title">Works</h1>
          <p className="page-subtitle">Every MPLADS development work record within your administrative scope.</p>
        </div>
      </div>

      <div className="table-card">
        {/* Search & Filter Toolbar */}
        <form className="table-toolbar" onSubmit={handleSearchSubmit}>
          <div className="table-search-wrap">
            <svg className="table-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="table-search-input"
              placeholder="Search by description, keyword or ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="table-actions-group">
            <select
              className="timeframe-select"
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {WORK_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-table-tool" style={{ backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#0f766e' }}>
              <span>Search</span>
            </button>
          </div>
        </form>

        {isLoading && <LoadingState label="Loading works…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No works match these filters"
            message="Try adjusting the search query or status filter."
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
                    <th>Description</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Final Amount</th>
                    <th>Expenditure</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((work, index) => {
                    const rowIndex = (page - 1) * result.pagination.limit + index + 1;
                    return (
                      <tr
                        key={work._id}
                        className="clickable"
                        onClick={() => navigate(`/works/${work.workId}`)}
                      >
                        <td className="cell-index">{rowIndex}.</td>
                        <td className="cell-work-id">{work.workId}</td>
                        <td style={{ maxWidth: '300px', fontWeight: 500 }}>
                          {translateWorkDescription(work.description, work.category)}
                        </td>
                        <td style={{ color: '#475569' }}>
                          {work.location.district}, {work.location.state}
                        </td>
                        <td>
                          <StatusPill status={work.execution.status} />
                        </td>
                        <td className="mono" style={{ fontWeight: 600 }}>{formatCurrencyCompact(work.financial.finalAmount)}</td>
                        <td className="mono" style={{ color: '#0f766e', fontWeight: 600 }}>
                          {formatCurrencyCompact(work.financial.totalExpenditure)}
                        </td>
                        <td style={{ color: '#64748b' }}>{formatDate(work.updatedAt)}</td>
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
