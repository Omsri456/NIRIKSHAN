import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, scopeDescriptor } from '@/utils/constants';
import { initials } from '@/utils/format';
import { EmblemOfIndia, IndiaTransparencyMark } from '@/components/ui/BrandAssets';

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const scopeText = scopeDescriptor(user.role, user.scope);
  const roleName = ROLE_LABELS[user.role] || 'Ministry';

  return (
    <header className="topbar">
      {/* 1. Government of India Emblem + Role-Scoped Dashboard Title & Scope */}
      <div className="topbar-left">
        <div className="topbar-emblem-wrap">
          <EmblemOfIndia />
        </div>
        <div className="topbar-title-section">
          <div className="topbar-title-row">
            <span className="topbar-heading">{roleName} Dashboard</span>
            <span className="topbar-jurisdiction-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Jurisdiction: {scopeText}
            </span>
          </div>
          <div className="topbar-subtitle">
            Role-scoped decision support & AI risk monitoring for {scopeText}.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* 2. Institutional Branding Block: Small India + Indian Flag + DATA FOR A MORE TRANSPARENT INDIA */}
        <div className="topbar-center-branding">
          <IndiaTransparencyMark />
        </div>


        {/* 3. User Identity Profile & Sign Out Button */}
        <div className="topbar-user-divider" />
        <div className="topbar-right">
          <div className="topbar-user-meta">
            <div className="topbar-user-name">{user.name}</div>
            <div className="topbar-user-email">{user.email}</div>
          </div>
          <div className="topbar-avatar">{initials(user.name)}</div>
          <button type="button" className="topbar-signout-btn" onClick={logout} aria-label="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
