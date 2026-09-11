import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ParliamentIllustration, SidebarBrandLogo } from '@/components/ui/BrandAssets';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/works', label: 'Works', icon: WorksIcon, end: false },
  { to: '/high-risk', label: 'High Risk', icon: RiskIcon, end: false },
  { to: '/early-warnings', label: 'Early Warnings', icon: BellIcon, end: false },
  { to: '/investigations', label: 'Investigations', icon: InvestigationIcon, end: false },
];

export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ to: '/admin/data-imports', label: 'Data Import', icon: DataImportIcon, end: false }] : []),
  ];

  return (
    <aside className="sidebar" aria-label="Main Navigation">
      {/* Brand Header with masked traveling light sweep animation */}
      <div className="sidebar-brand">
        <SidebarBrandLogo />
        <div className="sidebar-brand-sub">MPLADS Risk Intelligence</div>
      </div>


      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon className="sidebar-link-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Lower Section with Parliament Architectural Watermark & Tagline (Attached Image 2) */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-watermark">
          <ParliamentIllustration variant="sidebar" />
        </div>
        <div className="sidebar-tagline-content">
          <div className="sidebar-tagline-bar" />
          <div className="sidebar-tagline-text">
            Transparent data.<br />
            Stronger communities.
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function WorksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3 6.5 10 10m0 0 7-3.5M10 10v7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RiskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5 17.5 16h-15L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 7.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="13.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5v3.2L4 12.5h12l-1.5-2.3V7A4.5 4.5 0 0 0 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 15a2 2 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InvestigationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DataImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 3v8m0 0 3-3m-3 3-3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 13.5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
