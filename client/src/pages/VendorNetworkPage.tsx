import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAgencyProfiles } from '@/api/vendorNetwork';
import type { VendorProfile } from '@/api/vendorNetwork';
import { formatCurrencyCompact, formatNumber } from '@/utils/format';

type DisplayMode = 'table' | 'graph';
type FilterFilter = 'all' | 'high_risk' | 'multi_district';
type SortField = 'concentrationScore' | 'worksCount' | 'averageRiskScore' | 'highRiskPercentage' | 'totalExpenditure';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'var(--risk-critical, #ef4444)',
  HIGH: 'var(--risk-high, #f97316)',
  MEDIUM: 'var(--risk-medium, #eab308)',
  LOW: 'var(--risk-low, #22c55e)',
};

const RISK_BG: Record<string, string> = {
  CRITICAL: 'rgba(239, 68, 68, 0.12)',
  HIGH: 'rgba(249, 115, 22, 0.12)',
  MEDIUM: 'rgba(234, 179, 8, 0.12)',
  LOW: 'rgba(34, 197, 94, 0.10)',
};

export function VendorNetworkPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
  const [activeFilter, setActiveFilter] = useState<FilterFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('concentrationScore');
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGraphNode, setSelectedGraphNode] = useState<VendorProfile | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAgencyProfiles();
      setProfiles(data);
      if (data.length > 0) {
        setSelectedGraphNode(data[0]);
      }
    } catch {
      setError('Failed to load agency network data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return profiles
      .filter(p => {
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (activeFilter === 'high_risk') {
          return p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL';
        }
        if (activeFilter === 'multi_district') {
          return p.distinctDistricts.length > 1;
        }
        return true;
      })
      .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
  }, [profiles, searchTerm, activeFilter, sortBy]);

  // Summary stats
  const totalAgencies = profiles.length;
  const highRiskAgencies = profiles.filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length;
  const multiDistrictAgencies = profiles.filter(p => p.distinctDistricts.length > 1).length;
  const multiStateAgencies = profiles.filter(p => p.distinctStates.length > 1).length;

  return (
    <div className="vn-container">
      {/* Header */}
      <div className="vn-page-header">
        <div>
          <h1 className="vn-page-title">
            <NetworkIcon /> Implementing Agency (IDA) Network Analysis
          </h1>
          <p className="vn-page-subtitle">
            Official MoSPI Implementing Agency (IDA) Relational Intelligence — Surface agencies managing high-risk clusters, cross-district project backlogs, and fund execution bottlenecks.
          </p>
        </div>

        {/* View Mode Tabs (Table vs Graph) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`vn-view-tab-btn ${displayMode === 'table' ? 'active' : ''}`}
            onClick={() => setDisplayMode('table')}
          >
            📋 Table & Dossiers
          </button>
          <button
            className={`vn-view-tab-btn ${displayMode === 'graph' ? 'active' : ''}`}
            onClick={() => setDisplayMode('graph')}
          >
            🕸️ Agency-District Web Graph
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="vn-summary-cards">
        <div className="vn-stat-card">
          <div className="vn-stat-value">{formatNumber(totalAgencies)}</div>
          <div className="vn-stat-label">Implementing Agencies (IDAs)</div>
        </div>
        <div className="vn-stat-card vn-stat-danger">
          <div className="vn-stat-value">{formatNumber(highRiskAgencies)}</div>
          <div className="vn-stat-label">High / Critical Risk Clusters</div>
        </div>
        <div className="vn-stat-card vn-stat-warning">
          <div className="vn-stat-value">{formatNumber(multiDistrictAgencies)}</div>
          <div className="vn-stat-label">Multi-District Operations</div>
        </div>
        <div className="vn-stat-card vn-stat-info">
          <div className="vn-stat-value">{formatNumber(multiStateAgencies)}</div>
          <div className="vn-stat-label">Cross-State Footprint</div>
        </div>
      </div>

      {/* Controls */}
      <div className="vn-controls">
        {/* Quick Filter Pills */}
        <div className="vn-toggle-group">
          <button
            className={`vn-toggle-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Agencies ({totalAgencies})
          </button>
          <button
            className={`vn-toggle-btn ${activeFilter === 'high_risk' ? 'active' : ''}`}
            onClick={() => setActiveFilter('high_risk')}
          >
            ⚠️ High / Critical ({highRiskAgencies})
          </button>
          <button
            className={`vn-toggle-btn ${activeFilter === 'multi_district' ? 'active' : ''}`}
            onClick={() => setActiveFilter('multi_district')}
          >
            🌐 Multi-District ({multiDistrictAgencies})
          </button>
        </div>

        <input
          type="text"
          className="vn-search"
          placeholder="Search by agency name or IDA code…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <select
          className="vn-sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortField)}
        >
          <option value="concentrationScore">Workload / Concentration Index</option>
          <option value="worksCount">Most Works Supervised</option>
          <option value="averageRiskScore">Highest Avg Risk Score</option>
          <option value="highRiskPercentage">Highest % High Risk</option>
          <option value="totalExpenditure">Total Funds Handled</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="vn-loading">
          <div className="vn-spinner" />
          <span>Mining official MoSPI implementing agency relationships and risk scores…</span>
        </div>
      )}

      {error && <div className="vn-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="vn-empty">
          <span className="vn-empty-icon">🔍</span>
          <span>No implementing agencies found matching your criteria.</span>
        </div>
      )}

      {/* Visual Network Graph View */}
      {!loading && !error && filtered.length > 0 && displayMode === 'graph' && (
        <NetworkGraphView
          profiles={filtered.slice(0, 16)}
          selected={selectedGraphNode}
          onSelect={setSelectedGraphNode}
          onNavigateWork={(workId) => navigate(`/works/${workId}`)}
        />
      )}

      {/* Table & Dossier View */}
      {!loading && !error && filtered.length > 0 && displayMode === 'table' && (
        <div className="vn-table-wrap">
          <table className="vn-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Implementing Agency (IDA)</th>
                <th>Works Supervised</th>
                <th>Districts</th>
                <th>States</th>
                <th>Avg Risk</th>
                <th>High Risk %</th>
                <th>Total Value</th>
                <th>Workload Index</th>
                <th>Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <AgencyRow
                  key={p.name}
                  profile={p}
                  isExpanded={expandedAgency === p.name}
                  onToggle={() => setExpandedAgency(expandedAgency === p.name ? null : p.name)}
                  onNavigateWork={(workId) => navigate(`/works/${workId}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Visual Network Graph Component ─────────────────────────────────────

function NetworkGraphView({
  profiles,
  selected,
  onSelect,
  onNavigateWork,
}: {
  profiles: VendorProfile[];
  selected: VendorProfile | null;
  onSelect: (p: VendorProfile) => void;
  onNavigateWork: (id: string) => void;
}) {
  // Collect all unique districts among these profiles
  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => p.distinctDistricts.forEach(d => { if (d) set.add(d); }));
    return Array.from(set).slice(0, 8); // Top 8 districts for clean layout
  }, [profiles]);

  const svgWidth = 850;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // District positions arranged around outer ring
  const districtCoords = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const count = allDistricts.length || 1;
    const radiusX = 350;
    const radiusY = 170;
    allDistricts.forEach((d, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      map.set(d, {
        x: centerX + radiusX * Math.cos(angle),
        y: centerY + radiusY * Math.sin(angle),
      });
    });
    return map;
  }, [allDistricts, centerX, centerY]);

  // Agency node coordinates arranged in inner orbit
  const agencyCoords = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const count = profiles.length || 1;
    const radiusX = 180;
    const radiusY = 95;
    profiles.forEach((p, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      map.set(p.name, {
        x: centerX + radiusX * Math.cos(angle),
        y: centerY + radiusY * Math.sin(angle),
      });
    });
    return map;
  }, [profiles, centerX, centerY]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px' }}>
      {/* SVG Canvas */}
      <div className="vn-graph-container" style={{ position: 'relative' }}>
        <div className="vn-graph-header">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-800)' }}>
            Agency-to-District Operational Web
          </div>
          <div className="vn-graph-legend">
            <span className="vn-legend-item">
              <span className="vn-legend-dot" style={{ background: '#ef4444' }} /> Critical
            </span>
            <span className="vn-legend-item">
              <span className="vn-legend-dot" style={{ background: '#f97316' }} /> High
            </span>
            <span className="vn-legend-item">
              <span className="vn-legend-dot" style={{ background: '#0284c7' }} /> District Node
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', background: '#fafbfc', borderRadius: '8px' }}>
          {/* Connecting Lines */}
          {profiles.map(p => {
            const aCoord = agencyCoords.get(p.name);
            if (!aCoord) return null;
            const isSelected = selected?.name === p.name;
            const strokeColor = RISK_COLORS[p.riskLevel] || '#94a3b8';

            return p.distinctDistricts.map(d => {
              const dCoord = districtCoords.get(d);
              if (!dCoord) return null;
              return (
                <line
                  key={`${p.name}-${d}`}
                  x1={aCoord.x}
                  y1={aCoord.y}
                  x2={dCoord.x}
                  y2={dCoord.y}
                  stroke={isSelected ? strokeColor : '#e2e8f0'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  strokeDasharray={isSelected ? undefined : '2,2'}
                  opacity={isSelected ? 0.9 : 0.6}
                />
              );
            });
          })}

          {/* District Nodes */}
          {allDistricts.map(d => {
            const coord = districtCoords.get(d);
            if (!coord) return null;
            return (
              <g key={d} transform={`translate(${coord.x}, ${coord.y})`}>
                <circle r={14} fill="#e0f2fe" stroke="#0284c7" strokeWidth={2} />
                <text textAnchor="middle" dy={4} fontSize={9} fontWeight={700} fill="#0369a1">
                  DST
                </text>
                <text textAnchor="middle" dy={26} fontSize={10.5} fontWeight={600} fill="#334155">
                  {d.length > 12 ? d.slice(0, 10) + '…' : d}
                </text>
              </g>
            );
          })}

          {/* Agency Nodes */}
          {profiles.map(p => {
            const coord = agencyCoords.get(p.name);
            if (!coord) return null;
            const isSelected = selected?.name === p.name;
            const color = RISK_COLORS[p.riskLevel] || '#22c55e';
            const radius = 12 + Math.min(p.worksCount * 1.5, 14);

            return (
              <g
                key={p.name}
                transform={`translate(${coord.x}, ${coord.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(p)}
              >
                {isSelected && (
                  <circle r={radius + 6} fill="none" stroke={color} strokeWidth={2.5} opacity={0.6} strokeDasharray="3,3" />
                )}
                {p.distinctDistricts.length > 1 && (
                  <circle r={radius + 3} fill="none" stroke="#d97706" strokeWidth={1.5} opacity={0.7} />
                )}
                <circle
                  r={radius}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                />
                <text textAnchor="middle" dy={4} fontSize={10} fontWeight={800} fill="#ffffff">
                  {p.worksCount}
                </text>
                <text textAnchor="middle" dy={radius + 14} fontSize={10} fontWeight={isSelected ? 700 : 500} fill="var(--slate-800)">
                  {p.name.length > 15 ? p.name.slice(0, 13) + '…' : p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Agency Inspector Panel */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {selected ? (
          <>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Implementing Agency Dossier
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                {selected.name}
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span className="vn-risk-badge" style={{ background: RISK_BG[selected.riskLevel], color: RISK_COLORS[selected.riskLevel] }}>
                  {selected.riskLevel} RISK ({selected.averageRiskScore} AVG)
                </span>
                <span className="vn-concentration-pill" style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: 'var(--slate-800)' }}>
                  Workload Index: {selected.concentrationScore}
                </span>
              </div>
            </div>

            {selected.distinctDistricts.length > 1 && (
              <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                🌐 <strong>Cross-District Agency:</strong> Supervises projects across {selected.distinctDistricts.join(', ')}.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Works Under Supervision</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)' }}>{selected.worksCount}</div>
              </div>
              <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Total Sanctioned / Exp.</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f766e' }}>{formatCurrencyCompact(selected.totalExpenditure)}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '8px' }}>
                Supervised Works ({selected.works.length})
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selected.works.map(w => (
                  <div
                    key={w.workId}
                    onClick={() => onNavigateWork(w.workId)}
                    style={{
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: '#0f766e' }}>#{w.workId}</span>
                      <span style={{ color: RISK_COLORS[w.riskLevel] || '#475569' }}>Risk: {w.riskScore}</span>
                    </div>
                    <div style={{ color: '#475569', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
            Click any node on the graph to inspect implementing agency dossier.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table Row Component ────────────────────────────────────────────────

function AgencyRow({
  profile,
  isExpanded,
  onToggle,
  onNavigateWork,
}: {
  profile: VendorProfile;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateWork: (workId: string) => void;
}) {
  const riskColor = RISK_COLORS[profile.riskLevel] || RISK_COLORS.LOW;
  const riskBg = RISK_BG[profile.riskLevel] || RISK_BG.LOW;

  return (
    <>
      <tr
        className={`vn-row ${isExpanded ? 'vn-row-expanded' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <td className="vn-name-cell">
          <span className="vn-expand-icon">{isExpanded ? '▾' : '▸'}</span>
          <span className="vn-name-text">{profile.name}</span>
          {profile.activeInvestigations > 0 && (
            <span className="vn-investigation-badge" title={`${profile.activeInvestigations} active investigation(s)`}>
              🔍 {profile.activeInvestigations}
            </span>
          )}
        </td>
        <td><span className="vn-metric">{profile.worksCount}</span></td>
        <td>
          <span className={`vn-metric ${profile.distinctDistricts.length > 1 ? 'vn-multi' : ''}`}>
            {profile.distinctDistricts.length}
          </span>
        </td>
        <td>
          <span className={`vn-metric ${profile.distinctStates.length > 1 ? 'vn-multi-state' : ''}`}>
            {profile.distinctStates.length}
          </span>
        </td>
        <td>
          <span className="vn-risk-score" style={{ color: riskColor }}>
            {profile.averageRiskScore}
          </span>
        </td>
        <td>
          <div className="vn-bar-wrap">
            <div
              className="vn-bar-fill"
              style={{
                width: `${Math.min(profile.highRiskPercentage, 100)}%`,
                background: riskColor,
              }}
            />
            <span className="vn-bar-label">{profile.highRiskPercentage}%</span>
          </div>
        </td>
        <td className="vn-expenditure">{formatCurrencyCompact(profile.totalExpenditure)}</td>
        <td>
          <span
            className="vn-concentration-pill"
            style={{ background: riskBg, color: riskColor, borderColor: riskColor }}
          >
            {profile.concentrationScore}
          </span>
        </td>
        <td>
          <span className="vn-risk-badge" style={{ background: riskBg, color: riskColor }}>
            {profile.riskLevel}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr className="vn-detail-row">
          <td colSpan={9}>
            <div className="vn-detail-panel">
              <div className="vn-detail-meta">
                <div className="vn-detail-meta-item">
                  <strong>Districts:</strong> {profile.distinctDistricts.join(', ') || '—'}
                </div>
                <div className="vn-detail-meta-item">
                  <strong>States:</strong> {profile.distinctStates.join(', ') || '—'}
                </div>
              </div>

              <div className="vn-detail-subtitle">Supervised Works ({profile.worksCount})</div>
              <div className="vn-works-grid">
                {profile.works.slice(0, 20).map(w => (
                  <button
                    key={w.workId}
                    className="vn-work-card"
                    onClick={(e) => { e.stopPropagation(); onNavigateWork(w.workId); }}
                  >
                    <div className="vn-work-header">
                      <span className="vn-work-id">{w.workId}</span>
                      <span
                        className="vn-work-risk-pill"
                        style={{
                          background: RISK_BG[w.riskLevel] || RISK_BG.LOW,
                          color: RISK_COLORS[w.riskLevel] || RISK_COLORS.LOW,
                        }}
                      >
                        {w.riskScore}
                      </span>
                    </div>
                    <div className="vn-work-desc">
                      {w.description.length > 80 ? w.description.slice(0, 80) + '…' : w.description}
                    </div>
                    <div className="vn-work-meta">
                      <span>{w.district}, {w.state}</span>
                      <span>{formatCurrencyCompact(w.expenditure)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────

function NetworkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8 }}>
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <line x1="12" y1="8" x2="5" y2="16" />
      <line x1="12" y1="8" x2="19" y2="16" />
    </svg>
  );
}
