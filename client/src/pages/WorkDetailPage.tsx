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
  translateWorkDescription,
} from '@/utils/format';

interface WorkDetailData {
  work: Work;
  expenditures: Expenditure[];
  risk: RiskAssessment | null;
  riskHistory: RiskAssessment[];
  similar: Work[];
}

type Tab = 'risk' | 'expenditures' | 'similar';

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

  if (isLoading) return <LoadingState label="Loading work intelligence profile…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { work, expenditures, risk, riskHistory, similar } = data;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <Link
            to="/works"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0f766e',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            ← Back to works
          </Link>
          <div className="page-eyebrow">WORK INTELLIGENCE DOSSIER</div>
          <h1 className="page-title" style={{ fontSize: '22px' }}>{translateWorkDescription(work.description, work.category)}</h1>
          <p className="page-subtitle">
            <span className="mono" style={{ fontWeight: 600, color: '#0f172a' }}>{work.workId}</span> · {work.category} ·{' '}
            {work.location.constituency}, {work.location.district}, {work.location.state}
          </p>
        </div>

        <button
          type="button"
          className="btn-table-tool"
          style={{ backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#0f766e' }}
          onClick={handleOpenInvestigation}
          disabled={isCreatingInvestigation}
        >
          <span>{isCreatingInvestigation ? 'Opening…' : 'Open Investigation'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left column: Work Details & Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Work Details Card */}
          <div className="table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)' }}>Work details</h2>
              <StatusPill status={work.execution.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 24px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>MP Sponsor</span>
                <strong style={{ color: '#0f172a' }}>{work.mp.name} ({work.mp.house})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Implementing Agency</span>
                <strong style={{ color: '#0f172a' }}>{work.implementingAgency.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Recommended Amount</span>
                <span className="mono" style={{ fontWeight: 600 }}>{formatCurrency(work.recommendation.amount)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Sanction Amount</span>
                <span className="mono" style={{ fontWeight: 600 }}>{formatCurrency(work.financial.finalAmount)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Total Expenditure</span>
                <span className="mono" style={{ color: '#0f766e', fontWeight: 600 }}>{formatCurrency(work.financial.totalExpenditure)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>Recommendation Date</span>
                <span className="mono">{formatDate(work.recommendation.date)}</span>
              </div>
            </div>
          </div>

          {/* Tabs Card */}
          <div className="table-card">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-card)', padding: '0 16px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                style={{
                  padding: '14px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: tab === 'risk' ? '#0f766e' : '#64748b',
                  borderBottom: tab === 'risk' ? '2.5px solid #0f766e' : '2.5px solid transparent',
                }}
                onClick={() => setTab('risk')}
              >
                Risk Signals ({risk?.signals.length ?? 0})
              </button>
              <button
                type="button"
                style={{
                  padding: '14px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: tab === 'expenditures' ? '#0f766e' : '#64748b',
                  borderBottom: tab === 'expenditures' ? '2.5px solid #0f766e' : '2.5px solid transparent',
                }}
                onClick={() => setTab('expenditures')}
              >
                Expenditures ({expenditures.length})
              </button>
              <button
                type="button"
                style={{
                  padding: '14px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: tab === 'similar' ? '#0f766e' : '#64748b',
                  borderBottom: tab === 'similar' ? '2.5px solid #0f766e' : '2.5px solid transparent',
                }}
                onClick={() => setTab('similar')}
              >
                Similar Works ({similar.length})
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {tab === 'risk' && <RiskSignalsPanel risk={risk} history={riskHistory} />}
              {tab === 'expenditures' && <ExpenditurePanel expenditures={expenditures} />}
              {tab === 'similar' && <SimilarWorksPanel works={similar} />}
            </div>
          </div>
        </div>

        {/* Right column: Risk Gauge & Score Card */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '16px' }}>Current risk posture</h2>
          {!risk ? (
            <EmptyState
              title="No assessment yet"
              message="This work has not yet been processed by the anomaly detection engine."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <RiskGauge score={risk.score} level={risk.level} size={150} />
              <RiskBadge level={risk.level} />
              <div style={{ textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                <p>{risk.signals.length} signal{risk.signals.length === 1 ? '' : 's'} flagged · Model {risk.modelVersion}</p>
                <p style={{ marginTop: '4px' }}>Evaluated {formatDate(risk.generatedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskSignalsPanel({
  risk,
}: {
  risk: RiskAssessment | null;
  history: RiskAssessment[];
}) {
  if (!risk || risk.signals.length === 0) {
    return (
      <EmptyState
        title="No anomalous signals detected"
        message="The statistical models found no significant anomalies for this work."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {risk.signals.map((signal, idx) => (
        <div
          key={idx}
          style={{
            padding: '14px 16px',
            backgroundColor: '#fafbfc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{humanize(signal.type)}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>Score +{signal.score}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.45 }}>{signal.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function ExpenditurePanel({ expenditures }: { expenditures: Expenditure[] }) {
  if (expenditures.length === 0) {
    return <EmptyState title="No expenditures recorded" message="No payment vouchers logged for this work." />;
  }

  return (
    <div className="data-table-wrap">
      <table className="gov-data-table">
        <thead>
          <tr>
            <th>Installment</th>
            <th>Amount</th>
            <th>Sanction / Voucher Date</th>
          </tr>
        </thead>
        <tbody>
          {expenditures.map((exp, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 600 }}>Installment #{idx + 1}</td>
              <td className="mono" style={{ color: '#0f766e', fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
              <td style={{ color: '#64748b' }}>{formatDate(exp.date)}</td>
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
    return <EmptyState title="No peer works found" message="No similar category works located in nearby districts." />;
  }

  return (
    <div className="data-table-wrap">
      <table className="gov-data-table">
        <thead>
          <tr>
            <th>Work ID</th>
            <th>District</th>
            <th>Final Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {works.map((w) => (
            <tr key={w._id} className="clickable" onClick={() => navigate(`/works/${w.workId}`)}>
              <td className="cell-work-id">{w.workId}</td>
              <td style={{ color: '#475569' }}>{w.location.district}</td>
              <td className="mono">{formatCurrencyCompact(w.financial.finalAmount)}</td>
              <td><StatusPill status={w.execution.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
