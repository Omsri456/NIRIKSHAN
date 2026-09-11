import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';
import { IndiaMonitoringVisualization, ParliamentIllustration, NirikshanEyeIcon, EmblemOfIndia, LoginHeroBrandLogo } from '@/components/ui/BrandAssets';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DISTRICT_AUTHORITY');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const msg = await register({
        name,
        email,
        password,
        role,
        scope: {
          state: state.trim() || null,
          district: district.trim() || null,
        },
      });
      setSuccessMessage(msg || 'Registration successful — pending admin approval.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="gov-login-container">
      {/* Left Institutional Technology Panel */}
      <aside className="gov-login-left">
        {/* Layer 2 & 3: Background Telemetry Map & Cropped Parliament Building */}
        <div className="login-left-bg-telemetry">
          <IndiaMonitoringVisualization />
        </div>
        <div className="login-left-bg-parliament">
          <ParliamentIllustration variant="login" />
        </div>

        {/* Top Header Information: Government of India + System Online */}
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

        {/* Hero Wordmark, Product Tagline, & Simplified Registration Copy */}
        <div className="login-hero-brand-section">
          <div className="login-brand-title">
            <LoginHeroBrandLogo />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.02em', marginTop: '-12px', marginBottom: '22px' }}>
            From data to accountable development.
          </div>
          <h2 className="login-tagline-heading">Create your NIRIKSHAN account.</h2>
          <p className="login-description">
            Set up your account to get started.
          </p>
        </div>

        {/* Three Simplified Steps: YOUR DETAILS -> YOUR ACCESS -> READY TO GO */}
        <div className="login-process-flow">
          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">YOUR DETAILS</span>
              <span className="process-step-desc">Enter your basic information</span>
            </div>
          </div>

          <div className="process-step-arrow">→</div>

          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">YOUR ACCESS</span>
              <span className="process-step-desc">Choose your area</span>
            </div>
          </div>

          <div className="process-step-arrow">→</div>

          <div className="process-step">
            <div className="process-step-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="process-step-content">
              <span className="process-step-title">READY TO GO</span>
              <span className="process-step-desc">Access your workspace</span>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          <span>Transparent use of public funds. A more accountable India.</span>
          <span style={{ fontWeight: 600 }}>NIRIKSHAN v1.0</span>
        </div>
      </aside>

      {/* Right Registration Card */}
      <main className="gov-login-right" style={{ overflowY: 'auto', padding: '30px 20px' }}>
        <div style={{ position: 'absolute', top: 20, right: 20, opacity: 0.1, pointerEvents: 'none' }}>
          <EmblemOfIndia />
        </div>

        <div className="login-card" style={{ maxWidth: '480px', margin: 'auto' }}>
          <div className="login-card-brand-header" style={{ marginBottom: '16px' }}>
            <NirikshanEyeIcon className="login-card-eye-icon" style={{ width: '40px', height: '40px' }} />
            <div className="login-card-app-name">NIRIKSHAN</div>
            <h1 className="login-welcome-title" style={{ fontSize: '19px', marginTop: '8px' }}>Register User</h1>
            <p className="login-welcome-sub" style={{ marginBottom: '16px' }}>Create your authorized administrative account.</p>
          </div>

          {error && <div className="form-error-banner">{error}</div>}

          {successMessage ? (
            <div style={{ textAlign: 'center', padding: '20px 8px 8px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  border: '2px solid #a7f3d0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                Registration Successful
              </h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
                {successMessage}
              </p>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: '#475569',
                  marginBottom: '24px',
                  textAlign: 'left',
                  lineHeight: 1.45,
                }}
              >
                <strong>Security Notice:</strong> In accordance with government protocol, all new official accounts require verification by a NIRIKSHAN system administrator before dashboard access is granted.
              </div>
              <Link
                to="/login"
                className="btn-gov-primary"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                <span>Go to Login</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
            <div className="gov-form-field">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className="gov-text-input"
                style={{ paddingLeft: '14px' }}
                placeholder="e.g. Officer Rajesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="gov-form-field">
              <label htmlFor="reg-email">Official Email</label>
              <input
                id="reg-email"
                type="email"
                className="gov-text-input"
                style={{ paddingLeft: '14px' }}
                placeholder="name@gov.in"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="gov-form-field">
              <label htmlFor="reg-password">Password (min 6 characters)</label>
              <input
                id="reg-password"
                type="password"
                className="gov-text-input"
                style={{ paddingLeft: '14px' }}
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="gov-form-field">
              <label htmlFor="reg-role">Authority Role</label>
              <select
                id="reg-role"
                className="gov-text-input"
                style={{ paddingLeft: '14px' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="DISTRICT_AUTHORITY">District Authority</option>
                <option value="STATE_AUTHORITY">State Authority</option>
                <option value="MP">Member of Parliament (MP)</option>
                <option value="MINISTRY">Ministry Official</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="gov-form-field">
                <label htmlFor="reg-state">State / UT (Scope)</label>
                <select
                  id="reg-state"
                  className="gov-text-input"
                  style={{ paddingLeft: '12px' }}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">National Scope</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>

              <div className="gov-form-field">
                <label htmlFor="reg-district">District (Optional)</label>
                <input
                  id="reg-district"
                  type="text"
                  className="gov-text-input"
                  style={{ paddingLeft: '12px' }}
                  placeholder="e.g. Dahod"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-gov-primary" style={{ marginTop: '8px' }} disabled={isSubmitting}>
              <span>{isSubmitting ? 'Registering account…' : 'Create Account'}</span>
            </button>

            <div className="gov-or-divider">OR</div>

            <Link to="/login" className="btn-gov-secondary">
              <span>Back to Sign in</span>
            </Link>
          </form>
          )}
        </div>
      </main>
    </div>
  );
}
