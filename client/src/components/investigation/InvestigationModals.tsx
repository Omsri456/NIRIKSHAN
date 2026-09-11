import { useState } from 'react';
import type { FormEvent } from 'react';
import type { InvestigationFinding, InvestigationPriority, SafeUser, Work } from '@nirikshan/shared';
import { humanize } from '@/utils/format';

// -------------------------------------------------------------
// 1. Submit Audit Finding Modal
// -------------------------------------------------------------
interface SubmitFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (finding: Exclude<InvestigationFinding, null>, note: string) => Promise<void>;
  isSubmitting: boolean;
}

const FINDING_DEFINITIONS: Array<{
  value: Exclude<InvestigationFinding, null>;
  title: string;
  badgeClass: string;
  description: string;
}> = [
  {
    value: 'NO_ISSUE',
    title: 'No Issue / Clean Audit',
    badgeClass: 'clean',
    description:
      'Site audit confirmed physical assets exist, expenditures match approved estimates, and execution complies with MPLADS guidelines.',
  },
  {
    value: 'MINOR_IRREGULARITY',
    title: 'Minor Irregularity',
    badgeClass: 'warning',
    description:
      'Procedural or administrative lapses, minor milestone delays, or incomplete paperwork with no evidence of fraud.',
  },
  {
    value: 'MAJOR_IRREGULARITY',
    title: 'Major Irregularity',
    badgeClass: 'danger',
    description:
      'Substantial specification deviations, contractor billing discrepancies, or substandard construction requiring corrective action.',
  },
  {
    value: 'REFERRED_FOR_ACTION',
    title: 'Referred for Action',
    badgeClass: 'critical',
    description:
      'Critical fraud signals, ghost assets, or statutory non-compliance requiring formal vigilance or law-enforcement referral.',
  },
];

export function SubmitFindingModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: SubmitFindingModalProps) {
  const [selectedFinding, setSelectedFinding] = useState<Exclude<InvestigationFinding, null>>('NO_ISSUE');
  const [summaryNote, setSummaryNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summaryNote.trim()) {
      setError('An executive summary note explaining the audit conclusion is required.');
      return;
    }
    setError(null);
    await onSubmit(selectedFinding, summaryNote.trim());
  };

  return (
    <div className="nirikshan-modal-overlay" onClick={onClose}>
      <div className="nirikshan-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nirikshan-modal-header">
          <div>
            <h3>Submit Formal Audit Finding</h3>
            <p>Conclude review and propose finding for supervisory verification.</p>
          </div>
          <button type="button" className="nirikshan-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="nirikshan-modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
                SELECT OFFICIAL AUDIT FINDING
              </label>
              <div className="finding-cards-grid">
                {FINDING_DEFINITIONS.map((def) => {
                  const isSelected = selectedFinding === def.value;
                  return (
                    <div
                      key={def.value}
                      className={`finding-choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedFinding(def.value)}
                    >
                      <div className="finding-card-header">
                        <span className="finding-card-title">
                          <input
                            type="radio"
                            name="auditFinding"
                            checked={isSelected}
                            onChange={() => setSelectedFinding(def.value)}
                            style={{ accentColor: '#0f766e' }}
                          />
                          {def.title}
                        </span>
                      </div>
                      <p className="finding-card-desc">{def.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                EXECUTIVE FINDING SUMMARY &amp; AUDIT REMARKS <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="table-search-input"
                style={{ width: '100%', height: '85px', padding: '10px 12px', resize: 'vertical' }}
                placeholder="Detail site inspection observations, verified measurements, or contractor justifications…"
                value={summaryNote}
                onChange={(e) => setSummaryNote(e.target.value)}
              />
              <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: 4, display: 'block' }}>
                This will be recorded into the official case log and submitted to supervisory authorities for sign-off.
              </span>
            </div>
          </div>

          <div className="nirikshan-modal-footer">
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lifecycle btn-lifecycle-teal"
              disabled={isSubmitting || !summaryNote.trim()}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Finding for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. Verify & Resolve Case Modal
// -------------------------------------------------------------
interface VerifyResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => Promise<void>;
  finding: InvestigationFinding;
  isSubmitting: boolean;
}

export function VerifyResolveModal({
  isOpen,
  onClose,
  onConfirm,
  finding,
  isSubmitting,
}: VerifyResolveModalProps) {
  const [remarks, setRemarks] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    await onConfirm(remarks.trim());
  };

  return (
    <div className="nirikshan-modal-overlay" onClick={onClose}>
      <div className="nirikshan-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nirikshan-modal-header">
          <div>
            <h3>Verify &amp; Resolve Investigation</h3>
            <p>Supervisory sign-off and final case closure.</p>
          </div>
          <button type="button" className="nirikshan-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="nirikshan-modal-body">
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: '13px',
                color: '#166534',
                lineHeight: 1.45,
              }}
            >
              <strong>Proposed Audit Finding:</strong> {finding ? humanize(finding) : 'Not Specified'}
              <p style={{ marginTop: 4, fontSize: '12px', color: '#15803d' }}>
                By resolving, you confirm this audit investigation meets standards and conclude active review.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                SUPERVISORY VERIFICATION DIRECTIVE / REMARKS (OPTIONAL)
              </label>
              <textarea
                className="table-search-input"
                style={{ width: '100%', height: '75px', padding: '10px 12px', resize: 'vertical' }}
                placeholder="Add final closure remarks, institutional directives, or file reference numbers…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <div className="nirikshan-modal-footer">
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lifecycle btn-lifecycle-success"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Resolving…' : 'Confirm & Resolve Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. Dismiss Case Modal
// -------------------------------------------------------------
interface DismissCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export function DismissCaseModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: DismissCaseModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A justification for dismissing this investigation is mandatory.');
      return;
    }
    setError(null);
    await onConfirm(reason.trim());
  };

  return (
    <div className="nirikshan-modal-overlay" onClick={onClose}>
      <div className="nirikshan-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nirikshan-modal-header">
          <div>
            <h3>Dismiss Investigation</h3>
            <p>Close case without adverse findings.</p>
          </div>
          <button type="button" className="nirikshan-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="nirikshan-modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: '13px',
                color: '#991b1b',
                lineHeight: 1.45,
              }}
            >
              Dismissing a case removes it from active review. A valid administrative reason must be recorded in the audit trail.
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                DISMISSAL JUSTIFICATION <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="table-search-input"
                style={{ width: '100%', height: '80px', padding: '10px 12px', resize: 'vertical' }}
                placeholder="State why this inquiry is dismissed (e.g., duplicate entry, verified false alert, external probe already completed)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="nirikshan-modal-footer">
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lifecycle btn-lifecycle-danger"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? 'Dismissing…' : 'Confirm Dismissal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. Request Further Inquiry Modal
// -------------------------------------------------------------
interface RequestInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (directive: string) => Promise<void>;
  isSubmitting: boolean;
}

export function RequestInquiryModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: RequestInquiryModalProps) {
  const [directive, setDirective] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!directive.trim()) {
      setError('Please provide specific inquiry directives for the investigating officer.');
      return;
    }
    setError(null);
    await onConfirm(directive.trim());
  };

  return (
    <div className="nirikshan-modal-overlay" onClick={onClose}>
      <div className="nirikshan-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nirikshan-modal-header">
          <div>
            <h3>Request Further Inquiry</h3>
            <p>Return case to Under Review with specific instructions.</p>
          </div>
          <button type="button" className="nirikshan-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="nirikshan-modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                INQUIRY DIRECTIVE &amp; CLARIFICATION REQUEST <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="table-search-input"
                style={{ width: '100%', height: '85px', padding: '10px 12px', resize: 'vertical' }}
                placeholder="Explain what evidence is missing, what additional site measurements are required, or what invoices need cross-checking…"
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
              />
              <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: 4, display: 'block' }}>
                The case status will revert to <strong>Under Review</strong>, and this instruction will be logged for the assigned officer.
              </span>
            </div>
          </div>

          <div className="nirikshan-modal-footer">
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lifecycle btn-lifecycle-warning"
              disabled={isSubmitting || !directive.trim()}
            >
              {isSubmitting ? 'Updating…' : 'Return for Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. Reassign & Priority Modal (Supervisors)
// -------------------------------------------------------------
interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priority: InvestigationPriority, assignedTo: string | null) => Promise<void>;
  currentPriority: InvestigationPriority;
  currentAssignedTo: string | null;
  users: SafeUser[];
  work: Work | null;
  isSubmitting: boolean;
  isOfficerLocked?: boolean;
  officerLockReason?: string;
}

export function ReassignModal({
  isOpen,
  onClose,
  onSave,
  currentPriority,
  currentAssignedTo,
  users,
  work,
  isSubmitting,
  isOfficerLocked = false,
  officerLockReason,
}: ReassignModalProps) {
  const [priority, setPriority] = useState<InvestigationPriority>(currentPriority);
  const [assignedTo, setAssignedTo] = useState<string | null>(currentAssignedTo);

  if (!isOpen) return null;

  const workDistrict = work?.location?.district?.trim().toLowerCase() || '';
  const workState = work?.location?.state?.trim().toLowerCase() || '';

  const districtAuthorities = users.filter(
    (u) =>
      u.role === 'DISTRICT_AUTHORITY' &&
      u.scope?.district &&
      u.scope.district.trim().toLowerCase() === workDistrict
  );

  const stateAuthorities = users.filter(
    (u) =>
      u.role === 'STATE_AUTHORITY' &&
      u.scope?.state &&
      u.scope.state.trim().toLowerCase() === workState
  );

  const centralAuthorities = users.filter(
    (u) => u.role === 'MINISTRY' || u.role === 'ADMIN'
  );

  const isCurrentAssigneeIncluded =
    !assignedTo ||
    districtAuthorities.some((u) => u._id === assignedTo) ||
    stateAuthorities.some((u) => u._id === assignedTo) ||
    centralAuthorities.some((u) => u._id === assignedTo);

  const currentAssignedUser = !isCurrentAssigneeIncluded
    ? users.find((u) => u._id === assignedTo)
    : null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await onSave(priority, assignedTo);
  };

  return (
    <div className="nirikshan-modal-overlay" onClick={onClose}>
      <div className="nirikshan-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nirikshan-modal-header">
          <div>
            <h3>Edit Priority &amp; Assigned Officer</h3>
            <p>Designate responsible authority within jurisdiction.</p>
          </div>
          <button type="button" className="nirikshan-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="nirikshan-modal-body">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                PRIORITY LEVEL
              </label>
              <select
                className="table-search-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as InvestigationPriority)}
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                  <option key={p} value={p}>
                    {humanize(p)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  ASSIGNED INVESTIGATING OFFICER
                </label>
                {isOfficerLocked && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#92400e',
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontWeight: 600,
                    }}
                    title={officerLockReason || 'Designated by Central Ministry'}
                  >
                    🔒 {officerLockReason || 'Locked by Central Ministry'}
                  </span>
                )}
              </div>
              <select
                className="table-search-input"
                value={assignedTo ?? ''}
                disabled={isOfficerLocked}
                onChange={(e) => setAssignedTo(e.target.value || null)}
              >
                <option value="">Unassigned</option>
                {currentAssignedUser && (
                  <optgroup label="Current Assigned Officer">
                    <option value={currentAssignedUser._id}>
                      {currentAssignedUser.name} ({humanize(currentAssignedUser.role)})
                    </option>
                  </optgroup>
                )}
                {districtAuthorities.length > 0 && (
                  <optgroup label={`District Authorities (${work?.location?.district || 'In-Scope'})`}>
                    {districtAuthorities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {stateAuthorities.length > 0 && (
                  <optgroup label={`State Authorities (${work?.location?.state || 'In-Scope'})`}>
                    {stateAuthorities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {centralAuthorities.length > 0 && (
                  <optgroup label="Central & Ministry Authorities (National Oversight)">
                    {centralAuthorities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({humanize(u.role)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="nirikshan-modal-footer">
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lifecycle btn-lifecycle-teal"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save Attributes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
