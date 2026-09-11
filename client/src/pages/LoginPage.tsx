import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';
import { IndiaMonitoringVisualization, ParliamentIllustration, NirikshanEyeIcon, EmblemOfIndia, LoginHeroBrandLogo } from '@/components/ui/BrandAssets';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="gov-login-container">
      {/* Left Institutional Technology Panel (Ref 1 & Attached Image 1) */}
      <aside className="gov-login-left">
        {/* Layer 2 & 3: Background Telemetry Map & Cropped Parliament Building */}
        <div className="login-left-bg-telemetry">
          <IndiaMonitoringVisualization />
        </div>
        <div className="login-left-bg-parliament">
          <ParliamentIllustration variant="login" />
        </div>


        {/* Top Header Information */}
        <div className="login-header-meta">
          <div>
            <div className="login-gov-heading">Government of India</div>
            <div className="login-teal-line" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="login-system-online">
              <span className="login-system-online-dot" />
              SYSTEM ONLINE
            </div>
          </div>
        </div>

        {/* Hero Wordmark & Product Tagline */}
        <div className="login-hero-brand-section">
          <div className="login-brand-title">
            <LoginHeroBrandLogo />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.02em', marginTop: '-12px', marginBottom: '22px' }}>
            From data to accountable development.
          </div>
          <h2 className="login-tagline-heading">Sign in to your account.</h2>
          <p className="login-description">
            Access your monitoring workspace and role-scoped risk intelligence.
          </p>
        </div>

        {/* Process Flow (DATA -> ANALYZE -> PRIORITIZE -> INVESTIGATE) */}
        <div className="login-process-flow">
          {/* 1. DATA */}
          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">DATA</span>
              <span className="process-step-desc">Works & Expenditure</span>
            </div>
          </div>

          <div className="process-step-arrow">→</div>

          {/* 2. ANALYZE */}
          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">ANALYZE</span>
              <span className="process-step-desc">Detect anomalies</span>
            </div>
          </div>

          <div className="process-step-arrow">→</div>

          {/* 3. PRIORITIZE */}
          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">PRIORITIZE</span>
              <span className="process-step-desc">Highlight risk</span>
            </div>
          </div>

          <div className="process-step-arrow">→</div>

          {/* 4. INVESTIGATE */}
          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">INVESTIGATE</span>
              <span className="process-step-desc">Audit & take action</span>
            </div>
          </div>
        </div>

        {/* Bottom Statement */}
        <div className="login-left-footer">
          <span>Transparent use of public funds. A more accountable India.</span>
          <span style={{ fontWeight: 600 }}>NIRIKSHAN v1.0</span>
        </div>
      </aside>

      {/* Right Clean Institutional Login Area */}
      <main className="gov-login-right">
        {/* Background Emblem Watermark */}
        <div style={{ position: 'absolute', top: 30, right: 30, opacity: 0.1, pointerEvents: 'none' }}>
          <EmblemOfIndia />
        </div>

        {/* Centered White Institutional Card */}
        <div className="login-card">
          <div className="login-card-brand-header">
            <NirikshanEyeIcon className="login-card-eye-icon" />
            <div className="login-card-app-name">NIRIKSHAN</div>
            <h1 className="login-welcome-title">Welcome back</h1>
            <p className="login-welcome-sub">Access your workspace.</p>
          </div>

          {error && <div className="form-error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="gov-form-field">
              <label htmlFor="email">Email</label>
              <div className="gov-input-wrap">
                <svg className="gov-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className="gov-text-input"
                  placeholder="name@gov.in"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="gov-form-field">
              <label htmlFor="password">Password</label>
              <div className="gov-input-wrap">
                <svg className="gov-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="gov-text-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="gov-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a href="#forgot" className="gov-forgot-link" onClick={(e) => { e.preventDefault(); alert('Please contact your System Administrator to reset your credentials.'); }}>
                Forgot password?
              </a>
            </div>

            {/* Sign in Button */}
            <button type="submit" className="btn-gov-primary" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* OR Divider */}
            <div className="gov-or-divider">OR</div>

            {/* Register User Button */}
            <Link to="/register" className="btn-gov-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <span>Register User</span>
            </Link>

            {/* Security Notice */}
            <div className="login-security-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Secure access • Authorized users only</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
