import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  Investigation,
  InvestigationFinding,
  RiskAssessment,
  SafeUser,
  Work,
} from '@nirikshan/shared';
import { InvestigationStatus } from '@nirikshan/shared';
import * as investigationsApi from '@/api/investigations';
import * as worksApi from '@/api/works';
import * as authApi from '@/api/auth';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge, StatusPill } from '@/components/ui/RiskBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { INVESTIGATION_STATUS_OPTIONS } from '@/utils/constants';
import { formatDateTime, humanize } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

const FINDING_OPTIONS: Exclude<InvestigationFinding, null>[] = [
  'NO_ISSUE',
  'MINOR_IRREGULARITY',
  'MAJOR_IRREGULARITY',
  'REFERRED_FOR_ACTION',
];

export function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationsApi.fetchInvestigation(id);
      setInvestigation(data);

      try {
        const [riskData, usersData, workData] = await Promise.all([
          worksApi.fetchWorkRisk(data.workId),
          authApi.fetchUsers(),
          worksApi.fetchWork(data.workId),
        ]);
        setRiskAssessment(riskData);
        setUsers(usersData);
        setWork(workData);
      } catch {
        // Non-critical supplementary data
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  async function handleUpdate(update: investigationsApi.InvestigationUpdate) {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await investigationsApi.updateInvestigation(id, update);
      setInvestigation(updated);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  const userRole = user?.role;
  const isHighReviewer = userRole === 'MINISTRY' || userRole === 'ADMIN';
  const isStateAuthority = userRole === 'STATE_AUTHORITY';
  const canClose = isHighReviewer || isStateAuthority;

  const availableStatuses = INVESTIGATION_STATUS_OPTIONS.filter((s) => {
    if (s === 'OPEN' || s === 'UNDER_REVIEW' || s === 'PENDING_VERIFICATION') {
      return true;
    }
    if (s === 'RESOLVED' || s === 'DISMISSED') {
      if (!canClose) return false;
      if (investigation?.finding === 'REFERRED_FOR_ACTION' && isStateAuthority) {
        return false;
      }
      return true;
    }
    return true;
  });

  const handleStatusChange = (newStatus: InvestigationStatus) => {
    if (newStatus === 'PENDING_VERIFICATION' && !investigation?.finding) {
      setError('A finding must be set before requesting verification.');
      return;
    }
    setError(null);
    handleUpdate({ status: newStatus });
  };

  const workDistrict = work?.location?.district?.trim().toLowerCase() || '';

  const districtAuthorities = users.filter(
    (u) =>
      u.role === 'DISTRICT_AUTHORITY' &&
      u.scope?.district &&
      u.scope.district.trim().toLowerCase() === workDistrict
  );

  const stateAndMinistry = users.filter(
    (u) => u.role === 'MINISTRY' || u.role === 'STATE_AUTHORITY' || u.role === 'ADMIN'
  );

  const otherAuthorities = users.filter(
    (u) =>
      !districtAuthorities.some((da) => da._id === u._id) &&
      !stateAndMinistry.some((sm) => sm._id === u._id)
  );

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    if (!id || !noteContent.trim()) return;
    setIsAddingNote(true);
    try {
      const updated = await investigationsApi.addInvestigationNote(id, noteContent.trim());
      setInvestigation(updated);
      setNoteContent('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsAddingNote(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading investigation dossier…" />;
  if (error && !investigation) return <ErrorState message={error} onRetry={load} />;
  if (!investigation) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            to="/investigations"
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
            ← Back to investigations
          </Link>
          <div className="page-eyebrow">AUDIT DOSSIER #{investigation._id.slice(-6).toUpperCase()}</div>
          <h1 className="page-title" style={{ fontSize: '22px' }}>Case Investigation</h1>
          <p className="page-subtitle">
            Monitored Work:{' '}
            <Link to={`/works/${investigation.workId}`} className="mono" style={{ color: '#0f766e', fontWeight: 600 }}>
              {investigation.workId}
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Notes & Risk Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Notes Panel */}
          <div className="table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>Investigation Notes & Log</h2>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>{investigation.notes.length} entries</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {investigation.notes.length === 0 && (
                <EmptyState
                  title="No notes recorded"
                  message="Add official notes, audit observations, or verification remarks below."
                />
              )}
              {investigation.notes.map((note) => (
                <div
                  key={note._id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '13px' }}>{note.authorName}</strong>
                    <span style={{ color: '#64748b', fontSize: '11.5px' }}>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>{note.content}</p>
                </div>
              ))}

              <form onSubmit={handleAddNote} style={{ marginTop: 12 }}>
                <textarea
                  className="table-search-input"
                  style={{ height: '70px', padding: '10px 12px', resize: 'vertical' }}
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record what was audited, site verification findings, or next steps…"
                />
                <button
                  type="submit"
                  className="btn-table-tool"
                  style={{ marginTop: 10, backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#0f766e' }}
                  disabled={isAddingNote || !noteContent.trim()}
                >
                  {isAddingNote ? 'Recording…' : 'Add Note'}
                </button>
              </form>
            </div>
          </div>

          {/* Linked Risk Evidence */}
          <div className="table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>Linked Risk Signals</h2>
              {riskAssessment && <RiskBadge level={riskAssessment.level} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!riskAssessment || riskAssessment.signals.length === 0 ? (
                <EmptyState
                  title="No risk signals flagged"
                  message="This work has no anomaly signals detected."
                />
              ) : (
                riskAssessment.signals.map((signal, idx) => (
                  <div
                    key={`${signal.type}-${idx}`}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{humanize(signal.type)}</span>
                      <RiskBadge level={signal.severity} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.45 }}>{signal.explanation}</p>
                    {signal.evidence && Object.keys(signal.evidence).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {Object.entries(signal.evidence).map(([key, value]) => (
                          <span
                            key={key}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#e2e8f0',
                              color: '#334155',
                              fontSize: '11px',
                              borderRadius: '4px',
                            }}
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Status & Assignment */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '16px' }}>Case Status</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusPill status={investigation.status} />
              <RiskBadge level={investigation.priority} />
            </div>

            {investigation.status === 'PENDING_VERIFICATION' && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#92400e',
                  lineHeight: 1.4,
                }}
              >
                <strong>Pending Verification:</strong> Proposed finding:{' '}
                <em>{investigation.finding ? humanize(investigation.finding) : 'None'}</em>.
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Workflow Status
              </label>
              <select
                className="table-search-input"
                value={investigation.status}
                disabled={isSaving}
                onChange={(e) => handleStatusChange(e.target.value as InvestigationStatus)}
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Priority Level
              </label>
              <select
                className="table-search-input"
                value={investigation.priority}
                disabled={isSaving}
                onChange={(e) =>
                  handleUpdate({
                    priority: e.target.value as investigationsApi.InvestigationUpdate['priority'],
                  })
                }
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                  <option key={p} value={p}>
                    {humanize(p)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Audit Finding
              </label>
              <select
                className="table-search-input"
                value={investigation.finding ?? ''}
                disabled={isSaving}
                onChange={(e) =>
                  handleUpdate({
                    finding: (e.target.value || null) as InvestigationFinding,
                  })
                }
              >
                <option value="">Not yet determined</option>
                {FINDING_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {humanize(f)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Assigned Officer
              </label>
              <select
                className="table-search-input"
                value={investigation.assignedTo ?? ''}
                disabled={isSaving}
                onChange={(e) =>
                  handleUpdate({
                    assignedTo: e.target.value || null,
                  })
                }
              >
                <option value="">Unassigned</option>
                {districtAuthorities.length > 0 && (
                  <optgroup label="District Authorities (In-Scope)">
                    {districtAuthorities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {stateAndMinistry.length > 0 && (
                  <optgroup label="State & Ministry Authorities">
                    {stateAndMinistry.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({humanize(u.role)})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherAuthorities.length > 0 && (
                  <optgroup label="Other Officers">
                    {otherAuthorities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({humanize(u.role)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
