import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre GL JS loads its Web Worker from getWorkerUrl(). Under Vite (dev
// and static builds) that URL is not auto-resolvable for this dependency, so
// we explicitly point MapLibre at the bundled worker asset.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
import type {
  DistrictRiskSummary,
  DistrictRiskMapResponse,
  DistrictProjectItem,
} from '@nirikshan/shared';
import { fetchDistrictsRiskMap } from '@/api/dashboard';
import { extractErrorMessage } from '@/api/client';
import { RiskBadge, StatusPill } from '@/components/ui/RiskBadge';
import { formatCurrencyCompact, formatNumber } from '@/utils/format';

interface FeatureProperties {
  district: string;
  state: string;
  dtname?: string;
  latitude?: number;
  longitude?: number;
}

const RISK_COLORS = {
  CRITICAL: '#b23a3a',
  HIGH: '#b45a1f',
  MEDIUM: '#a97418',
  LOW: '#2f7a4f',
  NONE: '#363c4a',
};

export function GeographicRiskHeatmap() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);

  const [mapData, setMapData] = useState<DistrictRiskMapResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRiskSummary | null>(null);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState<string>('');

  // 1. Fetch district risk aggregation from backend
  const loadRiskData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDistrictsRiskMap();
      setMapData(response);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  }, []);

  // 2. Initialize and update MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current || !mapData) return;

    // Build lookup for quick risk metrics access by normalized key
    const riskByDistrict = new Map<string, DistrictRiskSummary>();
    for (const d of mapData.districts) {
      riskByDistrict.set(`${d.state.toLowerCase()}:::${d.district.toLowerCase()}`, d);
      riskByDistrict.set(d.district.toLowerCase(), d);
    }

    // Default center on India
    let centerLon = 78.9629;
    let centerLat = 21.5937;
    let initialZoom = 4.3;

    // If user is restricted to a state or district, center on their scope
    if (mapData.userScope.state && mapData.districts.length > 0) {
      centerLon = 75.7139;
      centerLat = 19.7515;
      initialZoom = 6.2;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-opacity': 0.72,
              'raster-saturation': -0.2,
              'raster-contrast': 0.1,
            },
          },
        ],
      },
      center: [centerLon, centerLat],
      zoom: initialZoom,
      maxZoom: 14,
      minZoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'heatmap-hover-popup',
    });
    hoverPopupRef.current = hoverPopup;

    map.on('load', async () => {
      try {
        const geoResponse = await fetch('/geo/india_districts.json');
        if (!geoResponse.ok) throw new Error('Failed to load district boundary geometries.');
        const geoJsonData = await geoResponse.json();

        // Enrich GeoJSON features with real aggregated risk metrics
        const enrichedFeatures = geoJsonData.features.map((feat: any, idx: number) => {
          const p: FeatureProperties = feat.properties;
          const key = `${(p.state || '').toLowerCase()}:::${(p.district || '').toLowerCase()}`;
          const riskInfo = riskByDistrict.get(key) || riskByDistrict.get((p.district || '').toLowerCase());

          const totalWorks = riskInfo?.totalWorks || 0;
          const avgScore = riskInfo?.averageRiskScore || 0;
          const riskLevel = riskInfo?.riskLevel || 'NONE';

          let fillColor = RISK_COLORS.NONE;
          let fillOpacity = 0.35;

          if (totalWorks > 0) {
            fillOpacity = 0.72;
            if (riskLevel === 'CRITICAL') fillColor = RISK_COLORS.CRITICAL;
            else if (riskLevel === 'HIGH') fillColor = RISK_COLORS.HIGH;
            else if (riskLevel === 'MEDIUM') fillColor = RISK_COLORS.MEDIUM;
            else if (riskLevel === 'LOW') fillColor = RISK_COLORS.LOW;
          }

          return {
            ...feat,
            id: idx + 1,
            properties: {
              ...feat.properties,
              hasData: totalWorks > 0,
              totalWorks,
              avgScore,
              riskLevel,
              fillColor,
              fillOpacity,
            },
          };
        });

        const enrichedGeoJson = {
          type: 'FeatureCollection',
          features: enrichedFeatures,
        };

        map.addSource('districts-source', {
          type: 'geojson',
          data: enrichedGeoJson,
          generateId: true,
        });

        // 1. Fill Layer (Choropleth by Risk)
        map.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts-source',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.92,
              ['get', 'fillOpacity'],
            ],
          },
        });

        // 2. District Border Lines
        map.addLayer({
          id: 'districts-borders',
          type: 'line',
          source: 'districts-source',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ffffff',
              '#131f35',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              2.4,
              1.2,
            ],
          },
        });

        let hoveredId: string | number | null = null;

        // Hover events
        map.on('mousemove', 'districts-fill', (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';

          const feature = e.features[0];
          const props = feature.properties as any;

          if (hoveredId !== null) {
            map.setFeatureState({ source: 'districts-source', id: hoveredId }, { hover: false });
          }
          hoveredId = feature.id as number;
          map.setFeatureState({ source: 'districts-source', id: hoveredId }, { hover: true });

          const districtName = props.district || props.dtname || 'District';
          const stateName = props.state || 'State';
          const totalWorks = props.totalWorks || 0;
          const avgScore = props.avgScore || 0;
          const riskLevel = props.riskLevel || 'NONE';

          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="padding: 4px 6px; font-family: var(--font-ui, sans-serif);">
                <div style="font-weight: 600; font-size: 13px; color: #0d1626;">${districtName}</div>
                <div style="font-size: 11px; color: #6b7486; margin-bottom: 6px;">${stateName}</div>
                ${
                  totalWorks > 0
                    ? `<div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px;">
                        <span>Projects: <strong>${totalWorks}</strong></span>
                        <span>Avg Risk: <strong>${avgScore}</strong></span>
                      </div>
                      <div style="margin-top: 4px; font-size: 11px; font-weight: 600; color: ${
                        riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
                          ? '#b23a3a'
                          : riskLevel === 'MEDIUM'
                          ? '#a97418'
                          : '#2f7a4f'
                      };">
                        Risk Level: ${riskLevel}
                      </div>`
                    : `<div style="font-size: 11px; color: #9aa3b2; font-style: italic;">No active projects in scope</div>`
                }
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseleave', 'districts-fill', () => {
          map.getCanvas().style.cursor = '';
          if (hoveredId !== null) {
            map.setFeatureState({ source: 'districts-source', id: hoveredId }, { hover: false });
            hoveredId = null;
          }
          hoverPopup.remove();
        });

        // Click event on district polygon
        map.on('click', 'districts-fill', (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const props = feature.properties as any;
          const districtName = props.district || props.dtname;
          const stateName = props.state;

          const key = `${(stateName || '').toLowerCase()}:::${(districtName || '').toLowerCase()}`;
          const summary = riskByDistrict.get(key) || riskByDistrict.get((districtName || '').toLowerCase());

          if (summary) {
            setSelectedDistrict(summary);
          } else {
            setSelectedDistrict({
              district: districtName,
              state: stateName,
              totalWorks: 0,
              highRisk: 0,
              mediumRisk: 0,
              lowRisk: 0,
              averageRiskScore: 0,
              riskLevel: 'LOW' as any,
              totalExpenditure: 0,
              totalAllocated: 0,
            });
          }

          if (props.longitude && props.latitude) {
            map.flyTo({
              center: [props.longitude, props.latitude],
              zoom: 8.5,
              duration: 1000,
            });
          }
        });
      } catch (err: any) {
        console.error('Failed to initialize district layers:', err);
      }
    });

    mapRef.current = map;

    return () => {
      hoverPopup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [mapData]);

  // Extract unique states available in authorized scope
  const availableStates = Array.from(
    new Set(mapData?.districts.map((d) => d.state).filter(Boolean) || [])
  );

  // Filter districts based on state selection
  const filteredDistricts = (mapData?.districts || []).filter((d) => {
    if (selectedStateFilter !== 'ALL' && d.state !== selectedStateFilter) return false;
    return true;
  });

  // Filter projects inside selected district by search
  const filteredProjects = (selectedDistrict?.projects || []).filter((p: DistrictProjectItem) => {
    if (!projectSearch.trim()) return true;
    const q = projectSearch.toLowerCase();
    return (
      p.workId.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const resetZoom = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [78.9629, 21.5937],
        zoom: 4.3,
        duration: 1000,
      });
    }
  };

  return (
    <div className="heatmap-container" style={{ marginTop: 24 }}>
      <div className="panel" style={{ overflow: 'hidden' }}>
        {/* Header with Title, Scope Disclaimers, and Controls */}
        <div
          className="panel-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0 }}>Geographic Risk Heatmap</h3>
              <span
                className="badge"
                style={{
                  background: 'var(--navy-900)',
                  color: 'var(--text-inverse)',
                  fontSize: 11,
                  padding: '2px 8px',
                }}
              >
                MapLibre GIS
              </span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              Spatial visualization of high-risk MPLADS works aggregated across administrative
              districts.
            </p>
            {mapData?.userScope.scopeNote && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--amber-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>ℹ️</span> {mapData.userScope.scopeNote}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {availableStates.length > 1 && (
              <select
                className="input-select"
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                }}
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
              >
                <option value="ALL">All States ({availableStates.length})</option>
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', height: 36 }}
              onClick={resetZoom}
            >
              Reset Map View
            </button>
          </div>
        </div>

        {/* Heatmap Body */}
        <div
          className="panel-body panel-body--tight"
          style={{ position: 'relative', minHeight: 560 }}
        >
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.85)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
                Loading geographic risk assessments...
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ color: 'var(--negative)', fontWeight: 600, marginBottom: 8 }}>
                Failed to load geographic risk map
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
              <button type="button" className="btn btn-primary" onClick={loadRiskData}>
                Retry Loading
              </button>
            </div>
          )}

          {mapData && !isLoading && !error && mapData.districts.length === 0 && (
            <div
              style={{
                padding: '12px 20px',
                background: 'var(--slate-100)',
                borderBottom: '1px solid var(--border-default)',
                fontSize: 13,
                color: 'var(--slate-600)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span role="img" aria-label="empty map indicator">
                🗺️
              </span>
              No projects with risk data fall within your authorized scope. Districts with
              authorized works appear colored; all other districts remain gray.
            </div>
          )}

          {/* Map Container and Overlay Drawer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedDistrict ? '1fr 380px' : '1fr',
              height: 560,
              transition: 'all 0.3s ease',
            }}
          >
            {/* Map Canvas */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div
                ref={mapContainerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 560,
                  background: 'var(--slate-100)',
                }}
              />

              {/* Map Legend Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  background: 'rgba(13, 22, 38, 0.92)',
                  color: 'var(--text-inverse)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  fontSize: 12,
                  zIndex: 5,
                  backdropFilter: 'blur(6px)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Risk Classification
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: RISK_COLORS.CRITICAL,
                      }}
                    />
                    <span>Critical Risk (75–100)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: RISK_COLORS.HIGH,
                      }}
                    />
                    <span>High Risk (50–74)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: RISK_COLORS.MEDIUM,
                      }}
                    />
                    <span>Medium Risk (25–49)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: RISK_COLORS.LOW,
                      }}
                    />
                    <span>Low Risk (0–24)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: RISK_COLORS.NONE,
                      }}
                    />
                    <span style={{ color: 'var(--slate-400)' }}>No Active Works</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected District Drill-Down Sidebar Panel */}
            {selectedDistrict && (
              <div
                style={{
                  borderLeft: '1px solid var(--border-default)',
                  background: 'var(--white)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 560,
                  overflow: 'hidden',
                }}
              >
                {/* District Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-default)',
                    background: 'var(--slate-50)',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDistrict(null)}
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: 'var(--slate-500)',
                      padding: 4,
                    }}
                    title="Close district details"
                  >
                    ✕
                  </button>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      color: 'var(--slate-500)',
                      fontWeight: 600,
                    }}
                  >
                    {selectedDistrict.state}
                  </div>
                  <h4 style={{ margin: '2px 0 6px', fontSize: 18, color: 'var(--slate-900)' }}>
                    {selectedDistrict.district} District
                  </h4>
                  {selectedDistrict.userScopeNote && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--amber-500)',
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {selectedDistrict.userScopeNote}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiskBadge level={selectedDistrict.riskLevel} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Average score: <strong>{selectedDistrict.averageRiskScore}</strong>
                    </span>
                  </div>
                </div>

                {/* District Risk Summary Stats Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 8,
                    padding: '12px 16px',
                    background: 'var(--white)',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--slate-50)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Total Projects</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)' }}>
                      {formatNumber(selectedDistrict.totalWorks)}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'var(--risk-critical-bg)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--risk-critical)' }}>
                      High / Critical Risk
                    </div>
                    <div
                      style={{ fontSize: 18, fontWeight: 700, color: 'var(--risk-critical)' }}
                    >
                      {formatNumber(selectedDistrict.highRisk)}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'var(--risk-medium-bg)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--risk-medium)' }}>Medium Risk</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--risk-medium)' }}>
                      {formatNumber(selectedDistrict.mediumRisk)}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'var(--risk-low-bg)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--risk-low)' }}>Low Risk</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--risk-low)' }}>
                      {formatNumber(selectedDistrict.lowRisk)}
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Expended:{' '}
                    <strong>{formatCurrencyCompact(selectedDistrict.totalExpenditure)}</strong>
                  </span>
                  <span>
                    Allocated:{' '}
                    <strong>{formatCurrencyCompact(selectedDistrict.totalAllocated)}</strong>
                  </span>
                </div>

                {/* Project List / Drill-Down */}
                <div
                  style={{
                    padding: '12px 16px',
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--slate-700)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Projects in District ({selectedDistrict.projects?.length || 0})
                    </div>
                  </div>

                  {selectedDistrict.projects && selectedDistrict.projects.length > 5 && (
                    <input
                      type="text"
                      className="input"
                      placeholder="Filter projects by ID or title..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      style={{ marginBottom: 12, fontSize: 12, padding: '6px 10px' }}
                    />
                  )}

                  {filteredProjects.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        padding: '32px 16px',
                      }}
                    >
                      No projects matching criteria in this district.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filteredProjects.map((work: DistrictProjectItem) => (
                        <div
                          key={work.workId}
                          style={{
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 12px',
                            background: 'var(--white)',
                            transition: 'border-color 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--navy-900)',
                              }}
                            >
                              {work.workId}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <RiskBadge level={work.riskLevel} />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--slate-600)',
                                }}
                              >
                                {work.riskScore}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--slate-900)',
                              marginBottom: 6,
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {work.description}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              marginBottom: 8,
                            }}
                          >
                            <span>{work.category}</span>
                            <StatusPill status={work.status as any} />
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              width: '100%',
                              fontSize: 12,
                              padding: '4px 8px',
                              justifyContent: 'center',
                            }}
                            onClick={() => navigate(`/works/${work.workId}`)}
                          >
                            Inspect Project Workflow →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* District Quick-Selection Footer Bar */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--slate-50)',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--slate-600)' }}>
            Showing <strong>{filteredDistricts.length}</strong> monitored districts across
            authorized scope.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filteredDistricts.slice(0, 6).map((d) => (
              <button
                key={`${d.state}-${d.district}`}
                type="button"
                onClick={() => setSelectedDistrict(d)}
                style={{
                  background:
                    selectedDistrict?.district === d.district
                      ? 'var(--navy-900)'
                      : 'var(--white)',
                  color:
                    selectedDistrict?.district === d.district
                      ? 'var(--text-inverse)'
                      : 'var(--navy-900)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{d.district}</span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      d.riskLevel === 'CRITICAL' || d.riskLevel === 'HIGH'
                        ? RISK_COLORS.HIGH
                        : d.riskLevel === 'MEDIUM'
                        ? RISK_COLORS.MEDIUM
                        : RISK_COLORS.LOW,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
