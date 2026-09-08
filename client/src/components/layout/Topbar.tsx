import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, scopeDescriptor } from '@/utils/constants';
import { initials } from '@/utils/format';

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const scopeText = scopeDescriptor(user.role, user.scope);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>{ROLE_LABELS[user.role]} Dashboard</h1>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            📍 Jurisdiction: {scopeText}
          </span>
        </div>
        <p style={{ marginTop: '4px' }}>
          Role-scoped decision support & AI risk monitoring for {scopeText}.
        </p>
      </div>
      <div className="topbar-user">
        <div className="topbar-user-info">
          <div className="topbar-user-name">{user.name}</div>
          <div className="topbar-user-role">{user.email}</div>
        </div>
        <div className="avatar">{initials(user.name)}</div>
        <button type="button" className="logout-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
