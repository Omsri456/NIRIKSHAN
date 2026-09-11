import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  Investigation,
  InvestigationFinding,
  InvestigationPriority,
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
import { formatDateTime, humanize } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
import { InvestigationStepper } from '@/components/investigation/InvestigationStepper';
import {
  DismissCaseModal,
  ReassignModal,
  RequestInquiryModal,
  SubmitFindingModal,
  VerifyResolveModal,
} from '@/components/investigation/InvestigationModals';
import { AuditTrailTimeline } from '@/components/investigation/AuditTrailTimeline';

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

  // Tab State
  const [activeTab, setActiveTab] = useState<'notes' | 'audit_trail' | 'signals'>('notes');

  // Modal States
  const [isSubmitFindingOpen, setIsSubmitFindingOpen] = useState(false);
  const [isVerifyResolveOpen, setIsVerifyResolveOpen] = useState(false);
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [isRequestInquiryOpen, setIsRequestInquiryOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

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

  const userRole = user?.role;
  const isMP = userRole === 'MP';
  const isSupervisor = userRole === 'ADMIN' || userRole === 'MINISTRY' || userRole === 'STATE_AUTHORITY';
  const isStateAuthority = userRole === 'STATE_AUTHORITY';
  const isAssignee = !!user?._id && investigation?.assignedTo === user._id;

  const isConcluded =
    investigation?.status === InvestigationStatus.RESOLVED ||
    investigation?.status === InvestigationStatus.DISMISSED;

  const assignedOfficerUser = users.find((u) => u._id === investigation?.assignedTo);
  const isCentralAssignee =
    assignedOfficerUser?.role === 'MINISTRY' || assignedOfficerUser?.role === 'ADMIN';

  const lastAssignAction = [...(investigation?.history || [])]
    .reverse()
    .find((h) => h.field === 'assignedTo');
  const isAssignedByCentral =
    lastAssignAction?.changedByRole === 'MINISTRY' || lastAssignAction?.changedByRole === 'ADMIN';

  // State Authority cannot override an officer designated by Central Ministry / Admin
  const isOfficerLockedForState = isStateAuthority && (isCentralAssignee || isAssignedByCentral);
  const canEditAttributes = isSupervisor && !isConcluded;

  // Generic Update Handler
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

  // 1. Begin Investigation
  async function handleBeginInvestigation() {
    await handleUpdate({ status: InvestigationStatus.UNDER_REVIEW });
  }

  // 2. Submit Finding
  async function handleSubmitFinding(finding: Exclude<InvestigationFinding, null>, note: string) {
    if (!id) return;
    setIsSaving(true);
    try {
      await investigationsApi.updateInvestigation(id, {
        status: InvestigationStatus.PENDING_VERIFICATION,
        finding,
      });
      const withNote = await investigationsApi.addInvestigationNote(
        id,
        `[AUDIT FINDING PROPOSED: ${humanize(finding)}]\n${note}`
      );
      setInvestigation(withNote);
      setIsSubmitFindingOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Verify & Resolve
  async function handleVerifyResolve(remarks: string) {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await investigationsApi.updateInvestigation(id, {
        status: InvestigationStatus.RESOLVED,
      });
      if (remarks) {
        const withNote = await investigationsApi.addInvestigationNote(
          id,
          `[SUPERVISORY VERIFICATION DIRECTIVE]\n${remarks}`
        );
        setInvestigation(withNote);
      } else {
        setInvestigation(updated);
      }
      setIsVerifyResolveOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // 4. Dismiss Case
  async function handleDismiss(reason: string) {
    if (!id) return;
    setIsSaving(true);
    try {
      await investigationsApi.updateInvestigation(id, {
        status: InvestigationStatus.DISMISSED,
      });
      const withNote = await investigationsApi.addInvestigationNote(
        id,
        `[CASE DISMISSED]\nJustification: ${reason}`
      );
      setInvestigation(withNote);
      setIsDismissOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // 5. Request Further Inquiry
  async function handleRequestInquiry(directive: string) {
    if (!id) return;
    setIsSaving(true);
    try {
      await investigationsApi.updateInvestigation(id, {
        status: InvestigationStatus.UNDER_REVIEW,
      });
      const withNote = await investigationsApi.addInvestigationNote(
        id,
        `[FURTHER INQUIRY REQUESTED]\nDirective: ${directive}`
      );
      setInvestigation(withNote);
      setIsRequestInquiryOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // 6. Reopen Concluded Case
  async function handleReopen() {
    if (!id) return;
    setIsSaving(true);
    try {
      await investigationsApi.updateInvestigation(id, {
        status: InvestigationStatus.UNDER_REVIEW,
      });
      const withNote = await investigationsApi.addInvestigationNote(
        id,
        `[CASE REOPENED]\nCase reopened for further investigation by supervisory authority.`
      );
      setInvestigation(withNote);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // 7. Save Case Attributes (Priority & Assignee)
  async function handleSaveAttributes(priority: InvestigationPriority, assignedTo: string | null) {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await investigationsApi.updateInvestigation(id, {
        priority,
        assignedTo,
      });
      setInvestigation(updated);
      setIsReassignOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  // Add Note Handler
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
      {/* Page Header */}
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
            {work?.description && ` • ${work.description.slice(0, 70)}${work.description.length > 70 ? '…' : ''}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* 4-Stage Lifecycle Stepper & Context Actions */}
      <InvestigationStepper
        status={investigation.status}
        finding={investigation.finding}
        userRole={userRole}
        isAssignee={isAssignee}
        isSaving={isSaving}
        onBeginInvestigation={handleBeginInvestigation}
        onSubmitFindingClick={() => setIsSubmitFindingOpen(true)}
        onVerifyResolveClick={() => setIsVerifyResolveOpen(true)}
        onDismissClick={() => setIsDismissOpen(true)}
        onRequestInquiryClick={() => setIsRequestInquiryOpen(true)}
        onReopenClick={handleReopen}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Dossier Logs (Notes, Audit Trail, Signals) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="table-card" style={{ padding: '24px' }}>
            {/* Tab Navigation */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 14,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                className="btn-table-tool"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  backgroundColor: activeTab === 'notes' ? '#f0fdfa' : '#ffffff',
                  color: activeTab === 'notes' ? '#0f766e' : '#475569',
                  borderColor: activeTab === 'notes' ? '#0f766e' : '#cbd5e1',
                }}
                onClick={() => setActiveTab('notes')}
              >
                📝 Notes &amp; Field Log ({investigation.notes.length})
              </button>

              <button
                type="button"
                className="btn-table-tool"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  backgroundColor: activeTab === 'audit_trail' ? '#f0fdfa' : '#ffffff',
                  color: activeTab === 'audit_trail' ? '#0f766e' : '#475569',
                  borderColor: activeTab === 'audit_trail' ? '#0f766e' : '#cbd5e1',
                }}
                onClick={() => setActiveTab('audit_trail')}
              >
                ⚖ Audit Trail &amp; History ({investigation.history?.length || 0})
              </button>

              <button
                type="button"
                className="btn-table-tool"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  backgroundColor: activeTab === 'signals' ? '#f0fdfa' : '#ffffff',
                  color: activeTab === 'signals' ? '#0f766e' : '#475569',
                  borderColor: activeTab === 'signals' ? '#0f766e' : '#cbd5e1',
                }}
                onClick={() => setActiveTab('signals')}
              >
                ⚡ Risk Signals ({riskAssessment?.signals?.length || 0})
              </button>
            </div>

            {/* TAB 1: Investigation Notes */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      padding: '14px 16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '13px' }}>{note.authorName}</strong>
                        {note.authorRole && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: note.authorRole === 'MP' ? '#f3e8ff' : '#e2e8f0',
                              color: note.authorRole === 'MP' ? '#7e22ce' : '#334155',
                              border: `1px solid ${note.authorRole === 'MP' ? '#e9d5ff' : '#cbd5e1'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              lineHeight: '14px',
                            }}
                          >
                            {note.authorRole === 'MP' ? 'MP' : humanize(note.authorRole)}
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '11.5px' }}>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {note.content}
                    </p>
                  </div>
                ))}

                <form onSubmit={handleAddNote} style={{ marginTop: 10 }}>
                  <textarea
                    className="table-search-input"
                    style={{ height: '75px', padding: '10px 12px', resize: 'vertical' }}
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Record what was audited, site verification findings, or inquiry notes…"
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
            )}

            {/* TAB 2: Audit Trail & Chain of Custody */}
            {activeTab === 'audit_trail' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Immutable Chain of Custody &amp; Change Log
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>
                    Every state transition, finding assignment, and officer nomination is cryptographically preserved.
                  </p>
                </div>
                <AuditTrailTimeline history={investigation.history} users={users} />
              </div>
            )}

            {/* TAB 3: Linked Risk Signals */}
            {activeTab === 'signals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Automated ML Anomaly Signals
                  </h3>
                  {riskAssessment && <RiskBadge level={riskAssessment.level} />}
                </div>

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
            )}
          </div>
        </div>

        {/* Right Column: Case Dossier Attributes */}
        <div className="table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>Dossier Attributes</h2>
            {isConcluded ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Investigation is concluded. Reopen case to edit attributes."
              >
                🔒 Dossier Locked
              </span>
            ) : canEditAttributes ? (
              <button
                type="button"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f766e',
                  cursor: 'pointer',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: 6,
                  padding: '4px 10px',
                }}
                onClick={() => setIsReassignOpen(true)}
              >
                ⚙ Edit Attributes
              </button>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <div className="attribute-item">
              <span className="attribute-label">Workflow Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusPill status={investigation.status} />
              </div>
            </div>

            {/* Priority */}
            <div className="attribute-item">
              <span className="attribute-label">Priority Level</span>
              <div>
                <RiskBadge level={investigation.priority} />
              </div>
            </div>

            {/* Audit Finding */}
            <div className="attribute-item">
              <span className="attribute-label">Audit Finding</span>
              <div className="attribute-value">
                {investigation.finding ? (
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background:
                        investigation.finding === 'NO_ISSUE'
                          ? '#ecfdf5'
                          : investigation.finding === 'MINOR_IRREGULARITY'
                          ? '#fffbeb'
                          : '#fef2f2',
                      color:
                        investigation.finding === 'NO_ISSUE'
                          ? '#047857'
                          : investigation.finding === 'MINOR_IRREGULARITY'
                          ? '#b45309'
                          : '#b91c1c',
                      border: '1px solid currentColor',
                    }}
                  >
                    {humanize(investigation.finding)}
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                    Not yet determined
                  </span>
                )}
              </div>
            </div>

            {/* Assigned Officer */}
            <div className="attribute-item">
              <span className="attribute-label">Assigned Investigating Officer</span>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                }}
              >
                {assignedOfficerUser ? (
                  <>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                      {assignedOfficerUser.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>
                      {assignedOfficerUser.email}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="audit-role-pill">
                        {humanize(assignedOfficerUser.role)}
                      </span>
                      {isAssignedByCentral && (
                        <span className="audit-role-pill ministry">
                          Central Designated
                        </span>
                      )}
                      {assignedOfficerUser.scope?.district && (
                        <span style={{ fontSize: '10.5px', color: '#475569' }}>
                          • {assignedOfficerUser.scope.district}
                        </span>
                      )}
                    </div>
                    {isOfficerLockedForState && !isConcluded && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#92400e',
                          marginTop: 6,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: 4,
                          padding: '4px 8px',
                          lineHeight: 1.35,
                        }}
                      >
                        Designated by Central Ministry — State Authority cannot override this assignment.
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                    Unassigned
                  </span>
                )}
              </div>
            </div>

            {/* Work Location */}
            <div className="attribute-item">
              <span className="attribute-label">Jurisdiction</span>
              <div style={{ fontSize: '13px', color: '#334155' }}>
                {work?.location?.district ? `${work.location.district}, ` : ''}
                {work?.location?.state || 'National Oversight'}
              </div>
            </div>

            {/* Dates */}
            <div className="attribute-item" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <span className="attribute-label">Dates</span>
              <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                <div>Opened: {formatDateTime(investigation.createdAt)}</div>
                <div>Updated: {formatDateTime(investigation.updatedAt)}</div>
              </div>
            </div>

            {isMP && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  lineHeight: 1.45,
                  marginTop: '4px',
                }}
              >
                Members of Parliament have observational access to review case progress, audit findings, and post comments in the dossier.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Structured Modals */}
      <SubmitFindingModal
        isOpen={isSubmitFindingOpen}
        onClose={() => setIsSubmitFindingOpen(false)}
        onSubmit={handleSubmitFinding}
        isSubmitting={isSaving}
      />

      <VerifyResolveModal
        isOpen={isVerifyResolveOpen}
        onClose={() => setIsVerifyResolveOpen(false)}
        onConfirm={handleVerifyResolve}
        finding={investigation.finding}
        isSubmitting={isSaving}
      />

      <DismissCaseModal
        isOpen={isDismissOpen}
        onClose={() => setIsDismissOpen(false)}
        onConfirm={handleDismiss}
        isSubmitting={isSaving}
      />

      <RequestInquiryModal
        isOpen={isRequestInquiryOpen}
        onClose={() => setIsRequestInquiryOpen(false)}
        onConfirm={handleRequestInquiry}
        isSubmitting={isSaving}
      />

      <ReassignModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        onSave={handleSaveAttributes}
        currentPriority={investigation.priority}
        currentAssignedTo={investigation.assignedTo}
        users={users}
        work={work}
        isSubmitting={isSaving}
        isOfficerLocked={isOfficerLockedForState}
        officerLockReason="Designated by Central Ministry (Non-overrideable by State Authority)"
      />
    </div>
  );
}
