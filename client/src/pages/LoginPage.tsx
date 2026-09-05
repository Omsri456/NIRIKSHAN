import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-mark">NIRIKSHAN</div>
        <div className="login-tagline">
          <h2>Decision support for MPLADS fund oversight.</h2>
          <p>
            Works, expenditure and payment data are screened for anomalies and irregularities,
            then scored with explainable risk signals to prioritize human review.
          </p>
        </div>
        <div className="login-flow">
          <span>Data</span>
          <span>Risk Engine</span>
          <span>Dashboard</span>
          <span>Investigation</span>
        </div>
      </aside>
      <div className="login-form-side">
        <div className="login-form-card">
          <h1>Sign in</h1>
          <p className="subtitle">Access your role-scoped monitoring dashboard.</p>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
