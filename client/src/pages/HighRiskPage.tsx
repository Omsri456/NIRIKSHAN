import { useEffect, useState } from 'react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>High-risk works</h2>
          <p className="subtitle">
            Works currently at HIGH or CRITICAL risk level, ranked by score. A risk score flags
            works for review — it is not a finding of fraud.
          </p>
        </div>
      </div>

      <div className="panel">
        {isLoading && <LoadingState label="Loading high-risk works…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {result && !isLoading && !error && result.data.length === 0 && (
          <EmptyState
            title="No high-risk works right now"
            message="Nothing in your scope currently sits at HIGH or CRITICAL risk."
          />
        )}

        {result && !isLoading && !error && result.data.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work ID</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Top signal</th>
                    <th>Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((assessment) => (
                    <tr
                      key={assessment._id}
                      className="clickable"
                      onClick={() => navigate(`/works/${assessment.workId}`)}
                    >
                      <td className="mono cell-primary">{assessment.workId}</td>
                      <td className="mono">{assessment.score}</td>
                      <td>
                        <RiskBadge level={assessment.level} />
                      </td>
                      <td className="cell-secondary">
                        {assessment.signals[0] ? humanize(assessment.signals[0].type) : '—'}
                      </td>
                      <td className="cell-secondary">{formatDate(assessment.generatedAt)}</td>
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
