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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (isLoading) return <LoadingState label="Loading investigation…" />;
  if (error && !investigation) return <ErrorState message={error} onRetry={load} />;
  if (!investigation) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/investigations" className="cell-secondary">
            ← Back to investigations
          </Link>
          <h2 style={{ marginTop: 8 }}>Investigation</h2>
          <p className="subtitle">
            Work{' '}
            <Link to={`/works/${investigation.workId}`} className="link-emphasis mono">
              {investigation.workId}
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
        {/* Left Column: Notes & Risk Evidence */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel">
            <div className="panel-header">
              <h3>Notes</h3>
              <span className="muted">{investigation.notes.length}</span>
            </div>
            <div className="panel-body">
              {investigation.notes.length === 0 && (
                <EmptyState
                  title="No notes yet"
                  message="Add findings, evidence references, or next steps below."
                />
              )}
              {investigation.notes.map((note) => (
                <div className="note-item" key={note._id}>
                  <div className="note-head">
                    <span className="note-author">{note.authorName}</span>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="note-content">{note.content}</p>
                </div>
              ))}

              <form onSubmit={handleAddNote} style={{ marginTop: 20 }}>
                <div className="field">
                  <label htmlFor="note">Add a note</label>
                  <textarea
                    id="note"
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Record what was reviewed, evidence found, or next steps…"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 10 }}
                  disabled={isAddingNote || !noteContent.trim()}
                >
                  {isAddingNote ? 'Adding…' : 'Add note'}
                </button>
              </form>
            </div>
          </div>

          {/* Linked Risk Evidence Panel */}
          <div className="panel">
            <div className="panel-header">
              <h3>Linked risk evidence</h3>
              {riskAssessment && <RiskBadge level={riskAssessment.level} />}
            </div>
            <div className="panel-body">
              {!riskAssessment || riskAssessment.signals.length === 0 ? (
                <EmptyState
                  title="No risk signals recorded"
                  message="This work has no linked risk signals or has not been scored yet."
                />
              ) : (
                riskAssessment.signals.map((signal, idx) => (
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Timeline/Audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel">
            <div className="panel-header">
              <h3>Status</h3>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    fontSize: '12.5px',
                    color: '#92400e',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Pending Verification:</strong> Proposed finding:{' '}
                  <em>{investigation.finding ? humanize(investigation.finding) : 'None'}</em>.
                  Awaiting State Authority or Ministry review.
                </div>
              )}

              <div className="field">
                <label htmlFor="statusSelect">Update status</label>
                <select
                  id="statusSelect"
                  value={investigation.status}
                  disabled={isSaving}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as InvestigationStatus)
                  }
                >
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
                {investigation.finding === 'REFERRED_FOR_ACTION' && isStateAuthority && (
                  <small style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Note: Cases referred for action can only be resolved by Ministry.
                  </small>
                )}
              </div>

              <div className="field">
                <label htmlFor="prioritySelect">Priority</label>
                <select
                  id="prioritySelect"
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

              <div className="field">
                <label htmlFor="findingSelect">Finding</label>
                <select
                  id="findingSelect"
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

              <div className="field">
                <label htmlFor="assigneeSelect">Assigned investigator</label>
                <select
                  id="assigneeSelect"
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
                    <optgroup
                      label={`District Authorities (${work?.location?.district || 'Matching District'})`}
                    >
                      {districtAuthorities.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} (District Authority - {u.scope?.district})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {stateAndMinistry.length > 0 && (
                    <optgroup label="State & Ministry Reviewers">
                      {stateAndMinistry.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({humanize(u.role)}
                          {u.scope?.state ? ` - ${u.scope.state}` : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherAuthorities.length > 0 && (
                    <optgroup label="Other Personnel">
                      {otherAuthorities.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({humanize(u.role)}
                          {u.scope?.district ? ` - ${u.scope.district}` : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Timeline & Audit Trail</h3>
            </div>
            <div className="panel-body">
              <dl className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="info-item">
                  <dt>Opened</dt>
                  <dd className="mono">{formatDateTime(investigation.createdAt)}</dd>
                </div>
                <div className="info-item">
                  <dt>Last updated</dt>
                  <dd className="mono">{formatDateTime(investigation.updatedAt)}</dd>
                </div>
              </dl>

              {investigation.history && investigation.history.length > 0 && (
                <>
                  <hr className="divider" style={{ margin: '16px 0' }} />
                  <div className="section-label" style={{ marginBottom: 12 }}>Change History</div>
                  <div className="timeline">
                    {investigation.history.map((h, i) => (
                      <div className="timeline-item" key={h._id || i}>
                        <span className="timeline-marker" />
                        <div className="timeline-content">
                          <div className="timeline-date">{formatDateTime(h.changedAt)}</div>
                          <div style={{ marginTop: 2, fontSize: '0.85rem' }}>
                            <strong>{h.changedByName}</strong> changed <em>{humanize(h.field)}</em> from{' '}
                            <code className="mono">{h.oldValue ? String(h.oldValue) : 'none'}</code> to{' '}
                            <code className="mono">{h.newValue ? String(h.newValue) : 'none'}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
