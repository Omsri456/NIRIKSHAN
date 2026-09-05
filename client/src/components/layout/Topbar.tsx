import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, scopeDescriptor } from '@/utils/constants';
import { initials } from '@/utils/format';

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{ROLE_LABELS[user.role]}</h1>
        <p>{scopeDescriptor(user.role, user.scope)}</p>
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
