import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Investigation, InvestigationFinding } from '@nirikshan/shared';
import { InvestigationStatus } from '@nirikshan/shared';
import * as investigationsApi from '@/api/investigations';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge, StatusPill } from '@/components/ui/RiskBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { INVESTIGATION_STATUS_OPTIONS } from '@/utils/constants';
import { formatDateTime, humanize } from '@/utils/format';

const FINDING_OPTIONS: Exclude<InvestigationFinding, null>[] = [
  'NO_ISSUE',
  'MINOR_IRREGULARITY',
  'MAJOR_IRREGULARITY',
  'REFERRED_FOR_ACTION',
];

export function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
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
        <div style={{ gridColumn: 'span 2' }} className="panel">
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

              <div className="field">
                <label htmlFor="statusSelect">Update status</label>
                <select
                  id="statusSelect"
                  value={investigation.status}
                  disabled={isSaving}
                  onChange={(e) =>
                    handleUpdate({ status: e.target.value as InvestigationStatus })
                  }
                >
                  {INVESTIGATION_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
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
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Timeline</h3>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
