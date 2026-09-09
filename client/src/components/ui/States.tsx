export function LoadingState({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="state-block">
      <div className="spinner" role="status" aria-label={label} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block">
      <h4>This couldn't be loaded</h4>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="state-block">
      <h4>{title}</h4>
      {message && <p>{message}</p>}
    </div>
  );
}
