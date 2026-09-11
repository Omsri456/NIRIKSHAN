import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';
import * as recommendationsApi from '@/api/recommendations';
import type { WorkRecommendation } from '@/api/recommendations';
import { StatusPill } from '@/components/ui/RiskBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { formatDate, formatCurrency, humanize } from '@/utils/format';

const WORK_CATEGORIES = [
  'Roads & Bridges',
  'Water Supply & Sanitation',
  'Education',
  'Healthcare',
  'Agriculture & Irrigation',
  'Skill Development',
  'Community Infrastructure',
  'Sports & Recreation',
  'Other',
];

export function RecommendWorkPage() {
  const { user } = useAuth();

  // Pre-fill from user scope
  const [constituency, setConstituency] = useState(user?.scope?.constituency ?? '');
  const [district, setDistrict] = useState(user?.scope?.district ?? '');
  const [state, setState] = useState(user?.scope?.state ?? '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(WORK_CATEGORIES[0]);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [justification, setJustification] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [recommendations, setRecommendations] = useState<WorkRecommendation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadRecommendations = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await recommendationsApi.fetchRecommendations({ limit: 50 });
      setRecommendations(res.data);
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await recommendationsApi.createRecommendation({
        description,
        category,
        estimatedCost: Number(estimatedCost),
        justification,
        constituency,
        district,
        state,
      });
      setSubmitSuccess(true);
      setDescription('');
      setJustification('');
      setEstimatedCost('');
      await loadRecommendations();
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewRecommendation() {
    setSubmitSuccess(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">MP WORKFLOW</div>
          <h1 className="page-title">Recommend Work</h1>
          <p className="page-subtitle">
            Submit a new MPLADS work proposal for District Authority review.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* ── Form Card ─────────────────────────────────────── */}
        <div className="login-card" style={{ padding: '28px 32px' }}>
          <div className="login-card-brand-header" style={{ marginBottom: '20px' }}>
            <h2 className="login-welcome-title" style={{ fontSize: '18px' }}>
              New Work Proposal
            </h2>
            <p className="login-welcome-sub">
              All fields are required. Cost should be in Indian Rupees (₹).
            </p>
          </div>

          {submitError && <div className="form-error-banner">{submitError}</div>}

          {submitSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 8px 8px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  border: '2px solid #a7f3d0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Recommendation Submitted
              </h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
                Your work proposal has been submitted for District Authority review.
              </p>
              <button
                type="button"
                className="btn-gov-primary"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handleNewRecommendation}
              >
                <span>Submit Another</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="gov-form-field">
                <label htmlFor="rec-description">Description</label>
                <textarea
                  id="rec-description"
                  className="gov-text-input"
                  style={{ paddingLeft: '14px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe the proposed work in detail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="gov-form-field">
                <label htmlFor="rec-category">Category</label>
                <select
                  id="rec-category"
                  className="gov-text-input"
                  style={{ paddingLeft: '14px' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="gov-form-field">
                <label htmlFor="rec-cost">Estimated Cost (₹)</label>
                <input
                  id="rec-cost"
                  type="number"
                  min="1"
                  step="1"
                  className="gov-text-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. 2500000"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  required
                />
              </div>

              <div className="gov-form-field">
                <label htmlFor="rec-justification">Justification</label>
                <textarea
                  id="rec-justification"
                  className="gov-text-input"
                  style={{ paddingLeft: '14px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Explain why this work is needed and how it benefits the constituency…"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="gov-form-field">
                  <label htmlFor="rec-constituency">Constituency</label>
                  <input
                    id="rec-constituency"
                    type="text"
                    className="gov-text-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="e.g. Dahod"
                    value={constituency}
                    onChange={(e) => setConstituency(e.target.value)}
                    required
                  />
                </div>
                <div className="gov-form-field">
                  <label htmlFor="rec-district">District</label>
                  <input
                    id="rec-district"
                    type="text"
                    className="gov-text-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="e.g. Dahod"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="gov-form-field">
                <label htmlFor="rec-state">State / UT</label>
                <input
                  id="rec-state"
                  type="text"
                  className="gov-text-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. Gujarat"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-gov-primary"
                style={{ marginTop: '8px' }}
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Submitting…' : 'Submit Recommendation'}</span>
              </button>
            </form>
          )}
        </div>

        {/* ── Past Recommendations List ─────────────────────── */}
        <div className="table-card">
          <div className="table-toolbar">
            <div>
              <div className="page-eyebrow" style={{ fontSize: '11px' }}>MY SUBMISSIONS</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--slate-900)' }}>
                Previous Recommendations
              </div>
            </div>
          </div>

          {listLoading && <LoadingState label="Loading recommendations…" />}
          {listError && !listLoading && (
            <ErrorState message={listError} onRetry={loadRecommendations} />
          )}

          {!listLoading && !listError && recommendations.length === 0 && (
            <EmptyState
              title="No recommendations yet"
              message="Your submitted work proposals will appear here."
            />
          )}

          {!listLoading && !listError && recommendations.length > 0 && (
            <div className="data-table-wrap">
              <table className="gov-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description / Category</th>
                    <th>Location</th>
                    <th>Est. Cost</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec, index) => (
                    <tr key={rec._id}>
                      <td className="cell-index">{index + 1}.</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--slate-900)', marginBottom: '2px' }}>
                          {rec.description.length > 60
                            ? rec.description.slice(0, 60) + '…'
                            : rec.description}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {humanize(rec.category)}
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', color: '#475569' }}>
                        {[rec.constituency, rec.district, rec.state]
                          .filter(Boolean)
                          .join(', ')}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
