import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Expenditure, RiskAssessment, Work } from '@nirikshan/shared';
import * as worksApi from '@/api/works';
import * as investigationsApi from '@/api/investigations';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge, StatusPill } from '@/components/ui/RiskBadge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  humanize,
} from '@/utils/format';

interface WorkDetailData {
  work: Work;
  expenditures: Expenditure[];
  risk: RiskAssessment | null;
  riskHistory: RiskAssessment[];
  similar: Work[];
}

type Tab = 'expenditures' | 'risk' | 'similar';

export function WorkDetailPage() {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<WorkDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('risk');
  const [isCreatingInvestigation, setIsCreatingInvestigation] = useState(false);

  const load = async () => {
    if (!workId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [work, expenditures, risk, riskHistory, similar] = await Promise.all([
        worksApi.fetchWork(workId),
        worksApi.fetchWorkExpenditures(workId),
        worksApi.fetchWorkRisk(workId),
        worksApi.fetchWorkRiskHistory(workId),
        worksApi.fetchSimilarWorks(workId),
      ]);
      setData({ work, expenditures, risk, riskHistory, similar });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId]);

  async function handleOpenInvestigation() {
    if (!workId) return;
    setIsCreatingInvestigation(true);
    try {
      const priority =
        data?.risk?.level === 'CRITICAL'
          ? 'CRITICAL'
          : data?.risk?.level === 'HIGH'
            ? 'HIGH'
            : 'MEDIUM';
      const investigation = await investigationsApi.createInvestigation(workId, priority);
      navigate(`/investigations/${investigation._id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsCreatingInvestigation(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading work intelligence…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { work, expenditures, risk, riskHistory, similar } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/works" className="cell-secondary">
            ← Back to works
          </Link>
          <h2 style={{ marginTop: 8 }}>{work.description}</h2>
          <p className="subtitle">
            <span className="mono">{work.workId}</span> · {work.category} ·{' '}
            {work.location.constituency}, {work.location.district}, {work.location.state}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenInvestigation}
          disabled={isCreatingInvestigation}
        >
          {isCreatingInvestigation ? 'Opening…' : 'Open investigation'}
        </button>
      </div>

      <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
        {/* Left column: work + financial info */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="panel">
            <div className="panel-header">
              <h3>Work details</h3>
              <StatusPill status={work.execution.status} />
            </div>
            <div className="panel-body">
              <dl className="info-grid">
                <div className="info-item">
                  <dt>MP</dt>
                  <dd>
                    {work.mp.name} ({work.mp.house})
                  </dd>
                </div>
                <div className="info-item">
                  <dt>Implementing agency</dt>
                  <dd>{work.implementingAgency.name}</dd>
                </div>
                <div className="info-item">
                  <dt>Recommended amount</dt>
                  <dd className="mono">{formatCurrency(work.recommendation.amount)}</dd>
                </div>
                <div className="info-item">
                  <dt>Recommendation date</dt>
                  <dd className="mono">{formatDate(work.recommendation.date)}</dd>
                </div>
                <div className="info-item">
                  <dt>Final amount</dt>
                  <dd className="mono">{formatCurrency(work.financial.finalAmount)}</dd>
                </div>
                <div className="info-item">
                  <dt>Total expenditure</dt>
                  <dd className="mono">{formatCurrency(work.financial.totalExpenditure)}</dd>
                </div>
                <div className="info-item">
                  <dt>Start date</dt>
                  <dd className="mono">{formatDate(work.execution.startDate)}</dd>
                </div>
                <div className="info-item">
                  <dt>Completion date</dt>
                  <dd className="mono">{formatDate(work.execution.completionDate)}</dd>
                </div>
                <div className="info-item">
                  <dt>Asset status</dt>
                  <dd>{humanize(work.asset.status)}</dd>
                </div>
                <div className="info-item">
                  <dt>Source dataset</dt>
                  <dd>{work.source.dataset}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="panel">
            <div className="tabs" style={{ padding: '0 20px', marginBottom: 0, marginTop: 4 }}>
              <button
                type="button"
                className={`tab-btn${tab === 'risk' ? ' active' : ''}`}
                onClick={() => setTab('risk')}
              >
                Risk signals
              </button>
              <button
                type="button"
                className={`tab-btn${tab === 'expenditures' ? ' active' : ''}`}
                onClick={() => setTab('expenditures')}
              >
                Expenditures ({expenditures.length})
              </button>
              <button
                type="button"
                className={`tab-btn${tab === 'similar' ? ' active' : ''}`}
                onClick={() => setTab('similar')}
              >
                Similar works ({similar.length})
              </button>
            </div>
            <div className="panel-body">
              {tab === 'risk' && <RiskSignalsPanel risk={risk} history={riskHistory} />}
              {tab === 'expenditures' && <ExpenditurePanel expenditures={expenditures} />}
              {tab === 'similar' && <SimilarWorksPanel works={similar} />}
            </div>
          </div>
        </div>

        {/* Right column: risk snapshot */}
        <div className="panel">
          <div className="panel-header">
            <h3>Current risk</h3>
          </div>
          <div className="panel-body">
            {!risk && (
              <EmptyState
                title="No assessment yet"
                message="This work has not been scored by the risk engine."
              />
            )}
            {risk && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <RiskGauge score={risk.score} level={risk.level} size={140} />
                <RiskBadge level={risk.level} />
                <p
                  className="cell-secondary"
                  style={{ textAlign: 'center' }}
                >
                  {risk.signals.length} signal{risk.signals.length === 1 ? '' : 's'} · model{' '}
                  {risk.modelVersion}
                </p>
                <p className="cell-secondary" style={{ textAlign: 'center' }}>
                  Generated {formatDate(risk.generatedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskSignalsPanel({
  risk,
  history,
}: {
  risk: RiskAssessment | null;
  history: RiskAssessment[];
}) {
  if (!risk) {
    return (
      <EmptyState
        title="No risk signals"
        message="Risk assessments are generated when this work is next scored."
      />
    );
  }

  return (
    <div>
      <div>
        {risk.signals.length === 0 && (
          <EmptyState title="No individual signals recorded for this assessment." />
        )}
        {risk.signals.map((signal, idx) => (
          <div className="signal-row" key={`${signal.type}-${idx}`}>
            <div className="signal-row-head">
              <span className="signal-name">{humanize(signal.type)}</span>
              <RiskBadge level={signal.severity} />
            </div>
            <p className="signal-explanation">{signal.explanation}</p>
            {Object.keys(signal.evidence ?? {}).length > 0 && (
              <div className="evidence-list">
                {Object.entries(signal.evidence).map(([key, value]) => (
                  <span className="evidence-chip" key={key}>
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
            <p className="signal-score" style={{ marginTop: 6 }}>
              Signal score {signal.score.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {history.length > 1 && (
        <>
          <hr className="divider" />
          <div className="section-label">Risk score history</div>
          <div className="timeline">
            {history.map((h) => (
              <div className="timeline-item" key={h._id}>
                <span className="timeline-marker" />
                <div className="timeline-content">
                  <div className="timeline-date">{formatDate(h.generatedAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {h.score}
                    </span>
                    <RiskBadge level={h.level} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExpenditurePanel({ expenditures }: { expenditures: Expenditure[] }) {
  if (expenditures.length === 0) {
    return (
      <EmptyState
        title="No expenditure records"
        message="No payments have been recorded against this work yet."
      />
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Vendor</th>
            <th>Agency</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenditures.map((e) => (
            <tr key={e._id}>
              <td className="mono cell-secondary">{formatDate(e.date)}</td>
              <td className="cell-primary">{e.vendor.name}</td>
              <td>{e.implementingAgency}</td>
              <td className="mono">{formatCurrency(e.amount)}</td>
              <td>
                <StatusPill status={e.paymentStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimilarWorksPanel({ works }: { works: Work[] }) {
  const navigate = useNavigate();
  if (works.length === 0) {
    return (
      <EmptyState
        title="No potentially similar works detected"
        message="The NLP similarity service found no comparable works above the match threshold."
      />
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Work ID</th>
            <th>Description</th>
            <th>Location</th>
            <th>Final amount</th>
          </tr>
        </thead>
        <tbody>
          {works.map((w) => (
            <tr key={w._id} className="clickable" onClick={() => navigate(`/works/${w.workId}`)}>
              <td className="mono cell-secondary">{w.workId}</td>
              <td className="cell-primary">{w.description}</td>
              <td>
                {w.location.district}, {w.location.state}
              </td>
              <td className="mono">{formatCurrencyCompact(w.financial.finalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
