import type { InvestigationHistoryEntry, SafeUser } from '@nirikshan/shared';
import { formatDateTime, humanize } from '@/utils/format';

interface AuditTrailTimelineProps {
  history?: InvestigationHistoryEntry[];
  users?: SafeUser[];
}

export function AuditTrailTimeline({ history = [], users = [] }: AuditTrailTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📜</span>
        No audit activity recorded yet. Initial case registration will appear once modified.
      </div>
    );
  }

  // Display newest first
  const sorted = [...history].reverse();

  const getActorName = (entry: InvestigationHistoryEntry) => {
    return entry.changedByName || 'System';
  };

  const getRoleClass = (role?: string | null) => {
    if (!role) return '';
    const norm = role.toLowerCase();
    if (norm.includes('ministry')) return 'ministry';
    if (norm.includes('state')) return 'state_authority';
    if (norm.includes('district')) return 'district_authority';
    return '';
  };

  const formatValue = (field: string, val: any) => {
    if (val === null || val === undefined || val === '') {
      return 'None / Unassigned';
    }
    if (field === 'assignedTo') {
      const u = users.find((user) => user._id === String(val));
      return u ? `${u.name} (${humanize(u.role)})` : 'Assigned Officer';
    }
    return humanize(String(val));
  };

  const getDotStyle = (field: string) => {
    switch (field) {
      case 'status':
        return { className: 'status-dot', icon: '⟳' };
      case 'finding':
        return { className: 'finding-dot', icon: '⚖' };
      case 'assignedTo':
        return { className: 'assigned-dot', icon: '👤' };
      case 'priority':
        return { className: 'priority-dot', icon: '⚡' };
      default:
        return { className: '', icon: '•' };
    }
  };

  return (
    <div className="audit-trail-timeline">
      {sorted.map((entry, idx) => {
        const dot = getDotStyle(entry.field);
        const roleClass = getRoleClass(entry.changedByRole);

        return (
          <div key={entry._id || idx} className="audit-timeline-item">
            <div className={`audit-timeline-dot ${dot.className}`}>{dot.icon}</div>

            <div className="audit-timeline-box">
              <div className="audit-timeline-top">
                <div className="audit-timeline-actor">
                  <span className="audit-timeline-name">{getActorName(entry)}</span>
                  {entry.changedByRole && (
                    <span className={`audit-role-pill ${roleClass}`}>
                      {humanize(entry.changedByRole)}
                    </span>
                  )}
                </div>
                <span className="audit-timeline-time">{formatDateTime(entry.changedAt)}</span>
              </div>

              <div className="audit-diff-row">
                <span className="audit-diff-field">
                  {entry.field === 'assignedTo'
                    ? 'Officer Assignment'
                    : entry.field === 'finding'
                    ? 'Audit Finding'
                    : entry.field === 'priority'
                    ? 'Priority'
                    : 'Workflow Status'}
                  :
                </span>
                <span className="audit-diff-old">{formatValue(entry.field, entry.oldValue)}</span>
                <span className="audit-diff-arrow">→</span>
                <span className="audit-diff-new">{formatValue(entry.field, entry.newValue)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
