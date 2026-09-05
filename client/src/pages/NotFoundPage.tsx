import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state-block" style={{ minHeight: '60vh', justifyContent: 'center' }}>
      <h4>Page not found</h4>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn btn-secondary btn-sm">
        Back to dashboard
      </Link>
    </div>
  );
}
