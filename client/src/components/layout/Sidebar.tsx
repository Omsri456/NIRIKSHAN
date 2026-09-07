import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/works', label: 'Works', icon: WorksIcon, end: false },
  { to: '/high-risk', label: 'High Risk', icon: RiskIcon, end: false },
  { to: '/investigations', label: 'Investigations', icon: InvestigationIcon, end: false },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">NIRIKSHAN</div>
        <div className="sidebar-brand-sub">MPLADS Risk Intelligence</div>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon className="sidebar-link-icon" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        A risk score is a decision-support indicator, not a finding of fraud.
      </div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="2.5" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.5" y="2.5" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.5" y="9.5" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.5" y="12.5" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function WorksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path
        d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M3 6.5 10 10m0 0 7-3.5M10 10v7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function RiskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.5 17.5 16h-15L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="13.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

function InvestigationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m16.5 16.5-4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
