import { InvestigationStatus } from '@nirikshan/shared';
import type { InvestigationFinding } from '@nirikshan/shared';
import { humanize } from '@/utils/format';

interface InvestigationStepperProps {
  status: InvestigationStatus;
  finding: InvestigationFinding;
  userRole?: string;
  isAssignee: boolean;
  isSaving: boolean;
  onBeginInvestigation: () => void;
  onSubmitFindingClick: () => void;
  onVerifyResolveClick: () => void;
  onDismissClick: () => void;
  onRequestInquiryClick: () => void;
  onReopenClick: () => void;
}

export function InvestigationStepper({
  status,
  finding,
  userRole,
  isAssignee,
  isSaving,
  onBeginInvestigation,
  onSubmitFindingClick,
  onVerifyResolveClick,
  onDismissClick,
  onRequestInquiryClick,
  onReopenClick,
}: InvestigationStepperProps) {
  const isMP = userRole === 'MP';
  const isSupervisor = userRole === 'ADMIN' || userRole === 'MINISTRY' || userRole === 'STATE_AUTHORITY';
  const isCentralAuthority = userRole === 'ADMIN' || userRole === 'MINISTRY';

  // Determine stage progression
  const isDismissed = status === InvestigationStatus.DISMISSED;
  const isResolved = status === InvestigationStatus.RESOLVED;
  const isConcluded = isResolved || isDismissed;

  const step1State =
    status === InvestigationStatus.OPEN
      ? 'active'
      : 'completed';

  const step2State =
    status === InvestigationStatus.OPEN
      ? 'upcoming'
      : status === InvestigationStatus.UNDER_REVIEW
      ? 'active'
      : 'completed';

  const step3State =
    status === InvestigationStatus.OPEN || status === InvestigationStatus.UNDER_REVIEW
      ? 'upcoming'
      : status === InvestigationStatus.PENDING_VERIFICATION
      ? 'active'
      : 'completed';

  const step4State = !isConcluded
    ? 'upcoming'
    : isDismissed
    ? 'dismissed-step'
    : 'completed';

  return (
    <div className="investigation-lifecycle-card">
      <div className="lifecycle-stepper-track">
        {/* Step 1: Intake & Registration */}
        <div className={`lifecycle-step ${step1State}`}>
          <div className="lifecycle-step-node">
            {step1State === 'completed' ? '✓' : '1'}
          </div>
          <div className="lifecycle-step-content">
            <span className="lifecycle-step-title">1. Registered</span>
            <span className="lifecycle-step-desc">Case Opened & Assigned</span>
          </div>
        </div>

        <div className={`lifecycle-step-connector ${step1State === 'completed' ? 'completed' : ''}`} />

        {/* Step 2: Under Review */}
        <div className={`lifecycle-step ${step2State}`}>
          <div className="lifecycle-step-node">
            {step2State === 'completed' ? '✓' : '2'}
          </div>
          <div className="lifecycle-step-content">
            <span className="lifecycle-step-title">2. Under Review</span>
            <span className="lifecycle-step-desc">Field Audit & Evidence</span>
          </div>
        </div>

        <div
          className={`lifecycle-step-connector ${
            step2State === 'completed' ? 'completed' : step2State === 'active' ? 'active' : ''
          }`}
        />

        {/* Step 3: Pending Verification */}
        <div className={`lifecycle-step ${step3State}`}>
          <div className="lifecycle-step-node">
            {step3State === 'completed' ? '✓' : '3'}
          </div>
          <div className="lifecycle-step-content">
            <span className="lifecycle-step-title">3. Verification</span>
            <span className="lifecycle-step-desc">Supervisory Review</span>
          </div>
        </div>

        <div
          className={`lifecycle-step-connector ${
            step3State === 'completed' ? 'completed' : step3State === 'active' ? 'active' : ''
          }`}
        />

        {/* Step 4: Concluded */}
        <div className={`lifecycle-step ${step4State}`}>
          <div className="lifecycle-step-node">
            {isConcluded ? (isDismissed ? '✕' : '✓') : '4'}
          </div>
          <div className="lifecycle-step-content">
            <span className="lifecycle-step-title">
              {isDismissed ? '4. Case Dismissed' : isResolved ? '4. Resolved' : '4. Concluded'}
            </span>
            <span className="lifecycle-step-desc">
              {isConcluded ? (finding ? humanize(finding) : 'Closed') : 'Final Resolution'}
            </span>
          </div>
        </div>
      </div>

      {/* Contextual Action Bar */}
      <div className="lifecycle-action-bar">
        <div className="lifecycle-status-context">
          <strong>Current Stage:</strong>
          <span>{humanize(status)}</span>
          {isAssignee && (
            <span
              style={{
                marginLeft: 4,
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: '11px',
                fontWeight: 600,
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
              }}
            >
              Assigned to You
            </span>
          )}
          {finding && (
            <span
              style={{
                marginLeft: 6,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '11.5px',
                fontWeight: 600,
                background:
                  finding === 'NO_ISSUE'
                    ? '#ecfdf5'
                    : finding === 'MINOR_IRREGULARITY'
                    ? '#fffbeb'
                    : '#fef2f2',
                color:
                  finding === 'NO_ISSUE'
                    ? '#047857'
                    : finding === 'MINOR_IRREGULARITY'
                    ? '#b45309'
                    : '#b91c1c',
                border: '1px solid currentColor',
              }}
            >
              Finding: {humanize(finding)}
            </span>
          )}
        </div>

        <div className="lifecycle-buttons-group">
          {/* OPEN stage actions */}
          {status === InvestigationStatus.OPEN && !isMP && (
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-teal"
              disabled={isSaving}
              onClick={onBeginInvestigation}
            >
              ▶ Begin Investigation
            </button>
          )}

          {/* UNDER_REVIEW stage actions */}
          {status === InvestigationStatus.UNDER_REVIEW && !isMP && (
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-teal"
              disabled={isSaving}
              onClick={onSubmitFindingClick}
            >
              📋 Submit Audit Finding
            </button>
          )}

          {/* PENDING_VERIFICATION stage actions */}
          {status === InvestigationStatus.PENDING_VERIFICATION && (
            <>
              {isSupervisor ? (
                <>
                  <button
                    type="button"
                    className="btn-lifecycle btn-lifecycle-warning"
                    disabled={isSaving}
                    onClick={onRequestInquiryClick}
                    title="Send case back to Under Review with an inquiry note"
                  >
                    ↩ Request Further Inquiry
                  </button>

                  <button
                    type="button"
                    className="btn-lifecycle btn-lifecycle-danger"
                    disabled={isSaving}
                    onClick={onDismissClick}
                  >
                    ✕ Dismiss Case
                  </button>

                  {/* If finding is REFERRED_FOR_ACTION and user is STATE_AUTHORITY, only Ministry can resolve */}
                  {finding === 'REFERRED_FOR_ACTION' && userRole === 'STATE_AUTHORITY' ? (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#92400e',
                        background: '#fef3c7',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #fde68a',
                        fontWeight: 600,
                      }}
                    >
                      Requires Ministry Sign-Off
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-lifecycle btn-lifecycle-success"
                      disabled={isSaving}
                      onClick={onVerifyResolveClick}
                    >
                      ✓ Verify & Resolve Case
                    </button>
                  )}
                </>
              ) : (
                <span
                  style={{
                    fontSize: '12.5px',
                    color: '#64748b',
                    background: '#f8fafc',
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  ⏳ Submitted. Awaiting supervisory verification.
                </span>
              )}
            </>
          )}

          {/* CONCLUDED stage actions */}
          {isConcluded && isCentralAuthority && (
            <button
              type="button"
              className="btn-lifecycle btn-lifecycle-outline"
              disabled={isSaving}
              onClick={onReopenClick}
            >
              ↺ Reopen Investigation
            </button>
          )}

          {isMP && (
            <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
              Read-only view • Member of Parliament
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
