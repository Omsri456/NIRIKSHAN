import { useEffect, useState } from 'react';
import { fetchPrecisionStats, type PrecisionStats } from '@/api/modelFeedback';

export function ModelPrecisionCard() {
  const [stats, setStats] = useState<PrecisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPrecisionStats()
      .then((data) => {
        if (mounted) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message || 'Failed to load model accuracy stats');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="analytics-card" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--slate-500)', fontSize: '13px' }}>Loading ground-truth model feedback...</div>
      </div>
    );
  }

  if (error || !stats) {
    return null; // Gracefully degrade if not available
  }

  return (
    <div className="analytics-card" style={{ marginTop: '24px' }}>
      <div className="analytics-card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div className="analytics-card-title-group">
            <svg className="analytics-card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <h2 className="analytics-card-title">Ground-Truth Model Calibration & Precision</h2>
          </div>
          <p style={{ margin: '4px 0 0 28px', fontSize: '12.5px', color: '#64748b' }}>
            Closed field investigation findings continuously validate AI anomaly detections (Human-in-the-Loop)
          </p>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '11.5px',
          fontWeight: 600,
          backgroundColor: '#ecfdf5',
          color: '#059669',
          border: '1px solid #a7f3d0'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Active Feedback Loop
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {/* Precision Summary Stat */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Model Precision
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
              {stats.precision}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {stats.truePositives} confirmed / {stats.totalVerified} verified cases
            </div>
          </div>
          <div style={{ marginTop: '12px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${stats.precision}%`,
                backgroundColor: stats.precision >= 70 ? '#10b981' : '#f59e0b',
                borderRadius: '3px'
              }}
            />
          </div>
        </div>

        {/* Precision by Risk Level */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Verification By Risk Tier
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stats.byRiskLevel).map(([tier, data]) => (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 600, color: tier === 'CRITICAL' ? '#b91c1c' : tier === 'HIGH' ? '#c2410c' : '#854d0e' }}>
                  {tier}
                </span>
                <span style={{ color: '#475569' }}>
                  {data.precision}% ({data.truePositive}/{data.verified})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Verified Signals */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Top Confirmed Anomaly Signals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.topSignals.slice(0, 3).map((sig) => (
              <div key={sig.signalType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--slate-800)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {sig.signalType.replace(/_/g, ' ')}
                </span>
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  {sig.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
