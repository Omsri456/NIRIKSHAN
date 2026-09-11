import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse, RiskAssessment } from '@nirikshan/shared';
import * as riskApi from '@/api/risk';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, humanize } from '@/utils/format';

export function HighRiskPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(searchParams.get('page') ?? '1');

  const [result, setResult] = useState<PaginatedResponse<RiskAssessment> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await riskApi.fetchHighRisk({ page, limit: 20 });
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

  // Filter works by search query client-side for immediate responsive feedback
  const filteredWorks = useMemo(() => {
    if (!result?.data) return [];
    if (!searchQuery.trim()) return result.data;
    const q = searchQuery.toLowerCase().trim();
    return result.data.filter(
      (w) =>
        w.workId.toLowerCase().includes(q) ||
        w.signals.some((s) => s.type.toLowerCase().includes(q) || s.explanation.toLowerCase().includes(q))
    );
  }, [result, searchQuery]);

  // Export CSV handler
  function handleExportCsv() {
    if (!result?.data.length) return;
    const headers = ['#', 'Work ID', 'Score', 'Level', 'Top Signal', 'Generated Date'];
    const rows = result.data.map((item, index) => [
      index + 1,
      item.workId,
      item.score,
      item.level,
      item.signals[0] ? humanize(item.signals[0].type) : 'None',
      formatDate(item.generatedAt),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nirikshan_high_risk_works_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      {/* Page Header Matching Reference 3 Strictly */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">RISK MONITORING</div>
          <h1 className="page-title">High-risk works</h1>
          <p className="page-subtitle">
            Works currently at HIGH or CRITICAL risk level, ranked by score. A risk score flags works for review — it is not a finding of fraud.
          </p>
        </div>

        {/* Warning Banner on Top Right (Ref 3) */}
        <div className="header-warning-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p>These works require prioritized review and further investigation.</p>
        </div>
      </div>

      {/* Main Table Card (Ref 3) */}
      <div className="table-card">
        {/* Toolbar: Search, Filters, Export */}
        <div className="table-toolbar">
          <div className="table-search-wrap">
            <svg className="table-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="table-search-input"
              placeholder="Search by Work ID, signal or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="table-actions-group">
            <button
              type="button"
              className="btn-table-tool"
              onClick={() => alert('Filter panel: Displaying all High and Critical score thresholds.')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filters</span>
            </button>

            <button type="button" className="btn-table-tool" onClick={handleExportCsv}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Content States */}
        {isLoading && <LoadingState label="Loading high-risk works…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && filteredWorks.length === 0 && (
          <EmptyState
            title="No high-risk works found"
            message="No works currently match your search query or criteria."
          />
        )}

        {/* Data Table */}
        {result && !isLoading && !error && filteredWorks.length > 0 && (
          <>
            <div className="data-table-wrap">
              <table className="gov-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Work ID</th>
                    <th>Score ↓</th>
                    <th>Level</th>
                    <th>Top signal</th>
                    <th>Generated</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorks.map((assessment, index) => {
                    const rowIndex = (page - 1) * result.pagination.limit + index + 1;
                    return (
                      <tr
                        key={assessment._id}
                        className="clickable"
                        onClick={() => navigate(`/works/${assessment.workId}`)}
                      >
                        <td className="cell-index">{rowIndex}.</td>
                        <td className="cell-work-id">{assessment.workId}</td>
                        <td className="cell-score">{assessment.score}</td>
                        <td>
                          <RiskBadge level={assessment.level} />
                        </td>
                        <td style={{ color: '#475569' }}>
                          {assessment.signals[0] ? humanize(assessment.signals[0].type) : '—'}
                        </td>
                        <td style={{ color: '#64748b' }}>{formatDate(assessment.generatedAt)}</td>
                        <td
                          style={{ textAlign: 'right', paddingRight: '20px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              className="action-menu-btn"
                              aria-label="Work actions"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === assessment._id ? null : assessment._id)
                              }
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>

                            {activeMenuId === assessment._id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                  zIndex: 50,
                                  minWidth: '170px',
                                  padding: '4px',
                                }}
                              >
                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    color: '#0f172a',
                                    borderRadius: '4px',
                                  }}
                                  onClick={() => navigate(`/works/${assessment.workId}`)}
                                >
                                  View Work Details
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    color: '#0f766e',
                                    borderRadius: '4px',
                                  }}
                                  onClick={() => navigate(`/works/${assessment.workId}`)}
                                >
                                  Investigate Anomaly
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination meta={result.pagination} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}
