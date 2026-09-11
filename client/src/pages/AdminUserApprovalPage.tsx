import { useEffect, useState } from 'react';
import type { SafeUser } from '@nirikshan/shared';
import * as usersApi from '@/api/users';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, humanize } from '@/utils/format';

export function AdminUserApprovalPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [pendingUsers, setPendingUsers] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.fetchPendingUsers();
      setPendingUsers(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      await usersApi.approveUser(id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      setStatusMessage({ type: 'success', text: `Account for ${name} has been approved.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: extractErrorMessage(err) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      await usersApi.rejectUser(id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      setStatusMessage({ type: 'success', text: `Account for ${name} has been rejected.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: extractErrorMessage(err) });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '32px' }}>
        <ErrorState message="Access restricted. Administrator privileges are required to view this page." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">SYSTEM GOVERNANCE</div>
          <h1 className="page-title">User Approvals</h1>
          <p className="page-subtitle">
            Review and approve or reject government personnel registration requests awaiting portal access.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="table-card">
        {/* Filter / Meta Toolbar */}
        <div className="table-toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--slate-700)',
                padding: '4px 10px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
              }}
            >
              {pendingUsers.length} Pending Approval{pendingUsers.length === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            className="btn-table-tool"
            onClick={load}
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {isLoading && <LoadingState label="Loading pending registrations…" />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {!isLoading && !error && pendingUsers.length === 0 && (
          <EmptyState
            title="No pending approvals"
            message="All registration requests have been reviewed and processed. New official sign-ups will appear here."
          />
        )}

        {!isLoading && !error && pendingUsers.length > 0 && (
          <div className="data-table-wrap">
            <table className="gov-data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Full Name</th>
                  <th>Official Email</th>
                  <th>Requested Role</th>
                  <th>Jurisdiction / Scope</th>
                  <th>Registered Date</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u, idx) => {
                  const isProcessing = actionLoadingId === u._id;
                  const scopeParts = [u.scope?.state, u.scope?.district, u.scope?.constituency].filter(Boolean);
                  const scopeLabel = scopeParts.length > 0 ? scopeParts.join(' / ') : 'National';

                  return (
                    <tr key={u._id}>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{u.name}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#1e293b' }}>
                            {u.email}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            Gov Domain
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #dbeafe',
                          }}
                        >
                          {humanize(u.role)}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: '#475569' }}>{scopeLabel}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(u.createdAt)}</td>
                      <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-table-tool"
                            style={{
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              borderColor: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                            disabled={isProcessing}
                            onClick={() => handleApprove(u._id, u.name)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            className="btn-table-tool"
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#e11d48',
                              borderColor: '#fecdd3',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                            disabled={isProcessing}
                            onClick={() => handleReject(u._id, u.name)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
