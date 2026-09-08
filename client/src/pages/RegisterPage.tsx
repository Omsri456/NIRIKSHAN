import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DISTRICT_AUTHORITY');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
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
      await register({
        name,
        email,
        password,
        role,
        scope: {
          state: state.trim() || null,
          district: district.trim() || null,
        },
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-mark">NIRIKSHAN</div>
        <div className="login-tagline">
          <h2>Register your account for MPLADS Risk Intelligence.</h2>
          <p>
            Gain role-scoped access to screening models, risk distribution metrics, and evidence-backed audit trails.
          </p>
        </div>
        <div className="login-flow">
          <span>Register</span>
          <span>Role Scope</span>
          <span>Dashboard</span>
          <span>Oversight</span>
        </div>
      </aside>
      <div className="login-form-side">
        <div className="login-form-card">
          <h1>Create Account</h1>
          <p className="subtitle">Sign up for role-based monitoring access.</p>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Officer Rajesh Kumar"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Official Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gov.in"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password (min 6 chars)</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="field">
              <label htmlFor="role">Authority Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="select-input"
              >
                <option value="DISTRICT_AUTHORITY">District Authority</option>
                <option value="STATE_AUTHORITY">State Authority</option>
                <option value="MP">Member of Parliament (MP)</option>
                <option value="MINISTRY">Ministry Official</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="state">State / UT (Scope)</label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="select-input"
                >
                  <option value="">All States (Nationwide Scope)</option>
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
              <div className="field">
                <label htmlFor="district">District (Optional Scope)</label>
                <input
                  id="district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Dahod, Mumbai, Lucknow"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Register Account'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-secondary, #94a3b8)' }}>Already have an account? </span>
              <Link to="/login" style={{ color: 'var(--color-primary, #3b82f6)', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
