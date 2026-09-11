import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre GL JS Web Worker asset setup
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
  NONE: 'rgba(226, 232, 240, 0.45)',
};

// Normalize names for robust cross-mapping between DB and GeoJSON
function normalizeGeoKey(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function GeographicRiskHeatmap() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const geoFeaturesRef = useRef<any[]>([]);

  const [mapData, setMapData] = useState<DistrictRiskMapResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRiskSummary | null>(null);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [isMapActive, setIsMapActive] = useState<boolean>(false);

  // Searchable State Dropdown state
  const [stateDropdownOpen, setStateDropdownOpen] = useState<boolean>(false);
  const [stateSearchQuery, setStateSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch district risk aggregation from backend
  const loadRiskData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDistrictsRiskMap();
      setMapData(response);

      // If user is locked to a specific state (e.g. STATE_AUTHORITY), default selection to that state
      if (response.userScope.state) {
        setSelectedStateFilter(response.userScope.state);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  }, []);

  // 2. Click outside detectors (for map scroll-lock & searchable state dropdown)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Lock map zoom when clicking outside the map container
      if (mapWrapperRef.current && !mapWrapperRef.current.contains(e.target as Node)) {
        if (mapRef.current) {
          mapRef.current.scrollZoom.disable();
        }
        setIsMapActive(false);
      }

      // Close state dropdown when clicking outside
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // 3. Activate scroll zoom on click
  const handleMapFocus = () => {
    if (mapRef.current && !isMapActive) {
      mapRef.current.scrollZoom.enable();
      setIsMapActive(true);
    }
  };

  // 4. Initialize MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current || !mapData) return;

    // Build comprehensive lookup map with normalizations and bidirectional aliases
    const ALIAS_MAP: Record<string, string[]> = {
      mumbai: ['mumbaicity', 'greaterbombay', 'southmumbai', 'bombay'],
      mumbaisuburban: ['mumbaisuburbandistrict', 'suburbanmumbai'],
      ahmednagar: ['ahilyanagar', 'ahmadnagar'],
      aurangabad: ['chhatrapatisambhajinagar', 'sambhajinagar'],
      osmanabad: ['dharashiv'],
      beed: ['bid'],
      buldhana: ['buldana'],
      gadchiroli: ['garhchiroli'],
      gondia: ['gondiya'],
      raigad: ['raigarh'],
      thane: ['thanecity'],
      palghar: ['palghardistrict'],
      kataka: ['cuttack'],
      cuttack: ['kataka'],
      khordha: ['khurda', 'bhubaneswar'],
      khurda: ['khordha', 'bhubaneswar'],
      baleshwar: ['balasore'],
      balasore: ['baleshwar'],
      kendujhar: ['keonjhar'],
      keonjhar: ['kendujhar'],
      baragada: ['bargarh', 'baragarh'],
      bargarh: ['baragada', 'baragarh'],
      sundaragada: ['sundergarh', 'sundargarh'],
      sundargarh: ['sundergarh', 'sundaragada'],
      anugola: ['angul'],
      angul: ['anugola'],
      kendrapada: ['kendrapara'],
      kendrapara: ['kendrapada'],
      jagatsinghapur: ['jagatsinghpur'],
      jagatsinghpur: ['jagatsinghapur'],
      nayagada: ['nayagarh'],
      nayagarh: ['nayagada'],
      balangir: ['bolangir'],
      bolangir: ['balangir'],
      subarnapur: ['sonepur'],
      sonepur: ['subarnapur'],
      kandhamala: ['kandhamal'],
      kandhamal: ['kandhamala'],
      debagada: ['deogarh'],
      deogarh: ['debagada'],
      bengaluruurban: ['bangalore', 'bangaloreurban', 'bengaluru'],
      bengalururural: ['bangalorerural'],
      belagavi: ['belgaum'],
      ballari: ['bellary'],
      vijayapura: ['bijapur'],
      kalaburagi: ['gulbarga'],
      mysuru: ['mysore'],
      shivamogga: ['shimoga'],
      tumakuru: ['tumkur'],
      prayagraj: ['allahabad'],
      ayodhya: ['faizabad'],
      kasganj: ['kanshiramnagar'],
      bhadohi: ['santravidasnagar'],
    };

    const riskByDistrict = new Map<string, DistrictRiskSummary>();
    for (const d of mapData.districts) {
      const sKey = normalizeGeoKey(d.state);
      const dKey = normalizeGeoKey(d.district);

      riskByDistrict.set(`${sKey}:::${dKey}`, d);
      riskByDistrict.set(`${d.state.toLowerCase()}:::${d.district.toLowerCase()}`, d);
      riskByDistrict.set(dKey, d);
      riskByDistrict.set(d.district.toLowerCase(), d);

      // Register all known alias variants
      const aliases = ALIAS_MAP[dKey] || [];
      for (const alias of aliases) {
        riskByDistrict.set(`${sKey}:::${alias}`, d);
        riskByDistrict.set(alias, d);
      }
    }

    // Default center on India
    let centerLon = 78.9629;
    let centerLat = 21.5937;
    let initialZoom = 4.3;

    // Center on state if user is restricted
    if (mapData.userScope.state) {
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
              'raster-saturation': -0.15,
              'raster-contrast': 0.1,
            },
          },
        ],
      },
      center: [centerLon, centerLat],
      zoom: initialZoom,
      maxZoom: 14,
      minZoom: 3,
      scrollZoom: false, // Initially disabled to prevent scroll hijack
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
        geoFeaturesRef.current = geoJsonData.features || [];

        // Enrich GeoJSON features with real aggregated risk metrics
        const enrichedFeatures = (geoJsonData.features || []).map((feat: any, idx: number) => {
          const p: FeatureProperties = feat.properties;
          const sKey = normalizeGeoKey(p.state);
          const dKey = normalizeGeoKey(p.district || p.dtname);

          const riskInfo =
            riskByDistrict.get(`${sKey}:::${dKey}`) ||
            riskByDistrict.get(`${(p.state || '').toLowerCase()}:::${(p.district || '').toLowerCase()}`) ||
            riskByDistrict.get(dKey) ||
            riskByDistrict.get((p.district || '').toLowerCase());

          const totalWorks = riskInfo?.totalWorks || 0;
          const avgScore = riskInfo?.averageRiskScore || 0;
          const riskLevel = riskInfo?.riskLevel || 'NONE';

          let fillColor = RISK_COLORS.NONE;
          let fillOpacity = 0.30;

          if (totalWorks > 0) {
            fillOpacity = 0.75;
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
          type: 'FeatureCollection' as const,
          features: enrichedFeatures,
        };

        map.addSource('districts-source', {
          type: 'geojson',
          data: enrichedGeoJson,
          generateId: true,
        });

        // Initial state filter logic (if user is locked to a state)
        const initialActiveState = mapData.userScope.state || selectedStateFilter;
        const initialFilter =
          initialActiveState && initialActiveState !== 'ALL'
            ? ['==', ['downcase', ['get', 'state']], initialActiveState.toLowerCase().trim()]
            : ['!=', ['get', 'state'], ''];

        // 1. Fill Layer (Choropleth by Risk) — strictly filtered to selected state if scoped
        map.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts-source',
          filter: initialFilter as any,
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

        // 2. District Border Lines — strictly filtered to selected state if scoped
        map.addLayer({
          id: 'districts-borders',
          type: 'line',
          source: 'districts-source',
          filter: initialFilter as any,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ffffff',
              '#1e293b',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              2.4,
              1.2,
            ],
          },
        });

        // 3. Selected State Red Dotted Outline Layer
        map.addLayer({
          id: 'state-selected-outline',
          type: 'line',
          source: 'districts-source',
          filter: (initialActiveState && initialActiveState !== 'ALL'
            ? ['==', ['downcase', ['get', 'state']], initialActiveState.toLowerCase().trim()]
            : ['==', ['downcase', ['get', 'state']], '__NONE__']) as any,
          paint: {
            'line-color': '#dc2626',
            'line-width': 3.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.95,
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
              <div style="padding: 6px 8px; font-family: var(--font-ui, sans-serif); min-width: 150px;">
                <div style="font-weight: 700; font-size: 13.5px; color: #0f172a;">${districtName}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${stateName}</div>
                ${
                  totalWorks > 0
                    ? `<div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 4px;">
                        <span style="color: #475569;">Projects: <strong style="color: #0f172a;">${totalWorks}</strong></span>
                        <span style="color: #475569;">Avg Risk: <strong style="color: #0f172a;">${avgScore}</strong></span>
                      </div>
                      <div style="font-size: 11.5px; font-weight: 700; color: ${
                        riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
                          ? '#b23a3a'
                          : riskLevel === 'MEDIUM'
                          ? '#a97418'
                          : '#2f7a4f'
                      };">
                        Risk Level: ${riskLevel}
                      </div>`
                    : `<div style="font-size: 11px; color: #94a3b8; font-style: italic;">No active projects in scope</div>`
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

          const sKey = normalizeGeoKey(stateName);
          const dKey = normalizeGeoKey(districtName);

          const summary =
            riskByDistrict.get(`${sKey}:::${dKey}`) ||
            riskByDistrict.get(`${(stateName || '').toLowerCase()}:::${(districtName || '').toLowerCase()}`) ||
            riskByDistrict.get(dKey) ||
            riskByDistrict.get((districtName || '').toLowerCase());

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

  // 5. State selection zoom & removal of shapes of other states
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyStateFilterAndZoom = () => {
      if (!map.getSource('districts-source')) return;

      const effectiveState = mapData?.userScope.state || selectedStateFilter;

      if (!effectiveState || effectiveState === 'ALL') {
        // Show all states
        if (map.getLayer('districts-fill')) {
          map.setFilter('districts-fill', ['!=', ['get', 'state'], ''] as any);
        }
        if (map.getLayer('districts-borders')) {
          map.setFilter('districts-borders', ['!=', ['get', 'state'], ''] as any);
        }
        if (map.getLayer('state-selected-outline')) {
          map.setFilter('state-selected-outline', ['==', ['downcase', ['get', 'state']], '__NONE__'] as any);
        }
        map.flyTo({ center: [78.9629, 21.5937], zoom: 4.3, duration: 1000 });
        return;
      }

      // Filter map to ONLY show the selected state's shapes (removes all other state shapes)
      const normState = effectiveState.toLowerCase().trim();

      const stateOnlyFilter = ['==', ['downcase', ['get', 'state']], normState] as any;

      if (map.getLayer('districts-fill')) {
        map.setFilter('districts-fill', stateOnlyFilter);
      }
      if (map.getLayer('districts-borders')) {
        map.setFilter('districts-borders', stateOnlyFilter);
      }
      if (map.getLayer('state-selected-outline')) {
        map.setFilter('state-selected-outline', stateOnlyFilter);
      }

      // Calculate state bounding box
      const matchingFeatures = geoFeaturesRef.current.filter((f) => {
        const st = (f.properties?.state || '').toLowerCase().trim();
        return st === normState;
      });

      if (matchingFeatures.length > 0) {
        let minLon = 180,
          minLat = 90,
          maxLon = -180,
          maxLat = -90;

        matchingFeatures.forEach((feat) => {
          const coords = feat.geometry?.coordinates;
          const processRing = (ring: [number, number][]) => {
            ring.forEach(([lon, lat]: [number, number]) => {
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            });
          };

          if (feat.geometry?.type === 'Polygon' && coords) {
            coords.forEach(processRing);
          } else if (feat.geometry?.type === 'MultiPolygon' && coords) {
            coords.forEach((poly: any) => poly.forEach(processRing));
          }
        });

        if (minLon < maxLon && minLat < maxLat) {
          map.fitBounds(
            [
              [minLon, minLat],
              [maxLon, maxLat],
            ],
            { padding: 50, maxZoom: 8.5, duration: 1200 }
          );
        }
      }
    };

    if (map.isStyleLoaded()) {
      applyStateFilterAndZoom();
    } else {
      map.once('load', applyStateFilterAndZoom);
    }
  }, [selectedStateFilter, mapData]);

  // Extract unique states available in authorized scope with district counts
  const stateStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of mapData?.districts || []) {
      if (d.state) {
        map.set(d.state, (map.get(d.state) || 0) + 1);
      }
    }
    return map;
  }, [mapData]);

  const availableStates = useMemo(() => {
    return Array.from(stateStats.keys()).sort();
  }, [stateStats]);

  // Filtered list of states based on search query in the combobox
  const filteredStateOptions = useMemo(() => {
    if (!stateSearchQuery.trim()) return availableStates;
    const q = stateSearchQuery.toLowerCase().trim();
    return availableStates.filter((s) => s.toLowerCase().includes(q));
  }, [availableStates, stateSearchQuery]);

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

  const isStateLocked = Boolean(mapData?.userScope.state);

  const resetZoom = () => {
    if (!isStateLocked) {
      setSelectedStateFilter('ALL');
    }
    if (mapRef.current) {
      if (!isStateLocked) {
        mapRef.current.flyTo({
          center: [78.9629, 21.5937],
          zoom: 4.3,
          duration: 1000,
        });
      }
    }
  };

  return (
    <div className="heatmap-container" style={{ marginTop: 20 }}>
      <div className="panel" style={{ overflow: 'hidden', borderRadius: '12px' }}>
        {/* Header with Title, Scope Disclaimers, and Controls */}
        <div
          className="panel-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--slate-50)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--slate-900)' }}>
                Geographic Risk Heatmap
              </h3>
              <span
                className="badge"
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {isStateLocked ? `${mapData?.userScope.state} Authority View` : 'MapLibre GIS'}
              </span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              {isStateLocked
                ? `Isolated state monitoring view showing exclusively ${mapData?.userScope.state} district works.`
                : 'Spatial monitoring of MPLADS projects aggregated by district risk posture across India.'}
            </p>
            {mapData?.userScope.scopeNote && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>ℹ️</span> {mapData.userScope.scopeNote}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Searchable State Dropdown (For National/Multi-State Viewers) */}
            {!isStateLocked && availableStates.length > 1 && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setStateDropdownOpen((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 14px',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid var(--border-card)',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: 200,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748b' }}>State:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {selectedStateFilter === 'ALL'
                        ? `All States (${availableStates.length})`
                        : selectedStateFilter}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {stateDropdownOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* Dropdown Popup Menu */}
                {stateDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      zIndex: 30,
                      width: 260,
                      maxHeight: 320,
                      background: '#ffffff',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search Input Bar */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-default)', background: 'var(--slate-50)' }}>
                      <input
                        type="text"
                        placeholder="🔍 Search states..."
                        value={stateSearchQuery}
                        onChange={(e) => setStateSearchQuery(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 12,
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Options List */}
                    <div style={{ overflowY: 'auto', maxHeight: 250, padding: '4px 0' }}>
                      <div
                        onClick={() => {
                          setSelectedStateFilter('ALL');
                          setStateDropdownOpen(false);
                          setStateSearchQuery('');
                        }}
                        style={{
                          padding: '8px 14px',
                          fontSize: 12.5,
                          fontWeight: selectedStateFilter === 'ALL' ? 700 : 500,
                          color: selectedStateFilter === 'ALL' ? 'var(--navy-800)' : '#334155',
                          background: selectedStateFilter === 'ALL' ? 'var(--slate-100)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--slate-100)')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            selectedStateFilter === 'ALL' ? 'var(--slate-100)' : 'transparent')
                        }
                      >
                        <span>All States (National View)</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{availableStates.length} states</span>
                      </div>

                      {filteredStateOptions.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                          No states found
                        </div>
                      ) : (
                        filteredStateOptions.map((s) => {
                          const isSelected = selectedStateFilter === s;
                          const count = stateStats.get(s) || 0;
                          return (
                            <div
                              key={s}
                              onClick={() => {
                                setSelectedStateFilter(s);
                                setStateDropdownOpen(false);
                                setStateSearchQuery('');
                              }}
                              style={{
                                padding: '8px 14px',
                                fontSize: 12.5,
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected ? 'var(--navy-800)' : '#334155',
                                background: isSelected ? 'var(--slate-100)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--slate-100)')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = isSelected ? 'var(--slate-100)' : 'transparent')
                              }
                            >
                              <span>{s}</span>
                              <span
                                style={{
                                  fontSize: 11,
                                  background: isSelected ? '#1e293b' : 'var(--slate-200)',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {count} districts
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isStateLocked && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 14px', height: 38, borderRadius: '6px', fontSize: 13 }}
                onClick={resetZoom}
              >
                Reset Map View
              </button>
            )}
          </div>
        </div>

        {/* Heatmap Body */}
        <div
          ref={mapWrapperRef}
          onClick={handleMapFocus}
          className="panel-body panel-body--tight"
          style={{ position: 'relative', minHeight: 600 }}
        >
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.9)',
                zIndex: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>
                Loading geographic risk assessments...
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
                Failed to load geographic risk map
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
              <button type="button" className="btn btn-primary" onClick={loadRiskData}>
                Retry Loading
              </button>
            </div>
          )}

          {/* Interactive Scroll Zoom Status Badge */}
          <div
            onClick={handleMapFocus}
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              zIndex: 6,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: isMapActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.82)',
              color: '#ffffff',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: isMapActive
                ? '1px solid rgba(255,255,255,0.4)'
                : '1px solid rgba(255,255,255,0.15)',
              userSelect: 'none',
            }}
          >
            {isMapActive ? (
              <>
                <span style={{ fontSize: '13px' }}>🔓</span>
                <span>Map Active (Scroll to zoom) • Click outside to lock</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '13px' }}>👆</span>
                <span>Click map to enable scroll zoom</span>
              </>
            )}
          </div>

          {/* Map Container and Overlay Drawer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedDistrict ? '1fr 380px' : '1fr',
              height: 600,
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
                  minHeight: 600,
                  background: 'var(--slate-100)',
                }}
              />

              {/* Map Legend Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  background: 'rgba(15, 23, 42, 0.92)',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  fontSize: 12,
                  zIndex: 5,
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 8,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#94a3b8',
                  }}
                >
                  District Risk Level
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
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
                        borderRadius: 3,
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
                        borderRadius: 3,
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
                        borderRadius: 3,
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
                        borderRadius: 3,
                        background: RISK_COLORS.NONE,
                        border: '1px solid #64748b',
                      }}
                    />
                    <span style={{ color: '#94a3b8' }}>No Active Works</span>
                  </div>
                  {selectedStateFilter !== 'ALL' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 4,
                        paddingTop: 6,
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 0,
                          borderTop: '2px dashed #dc2626',
                        }}
                      />
                      <span style={{ color: '#fca5a5', fontWeight: 600 }}>
                        {selectedStateFilter} Scope
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected District Drill-Down Sidebar Panel */}
            {selectedDistrict && (
              <div
                style={{
                  borderLeft: '1px solid var(--border-default)',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 600,
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
                    background: '#ffffff',
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

                {/* District Financial Summary */}
                <div
                  style={{
                    padding: '10px 16px',
                    background: 'var(--slate-50)',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--slate-500)' }}>Allocated: </span>
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {formatCurrencyCompact(selectedDistrict.totalAllocated)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)' }}>Expenditure: </span>
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {formatCurrencyCompact(selectedDistrict.totalExpenditure)}
                    </strong>
                  </div>
                </div>

                {/* Project Search Bar */}
                <div
                  style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search projects in district..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: 12,
                      border: '1px solid var(--border-card)',
                      borderRadius: 4,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Projects List Drill-Down */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--slate-400)',
                      marginBottom: 8,
                    }}
                  >
                    Projects ({filteredProjects.length})
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate-400)', fontSize: 13 }}>
                      No projects match your filter.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredProjects.map((p) => (
                        <div
                          key={p.workId}
                          onClick={() => navigate(`/works/${p.workId}`)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-card)',
                            background: 'var(--slate-50)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--navy-600)';
                            e.currentTarget.style.background = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-card)';
                            e.currentTarget.style.background = 'var(--slate-50)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy-900)' }}>
                              {p.workId}
                            </span>
                            <RiskBadge level={p.riskLevel} />
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--slate-700)',
                              fontWeight: 500,
                              lineHeight: 1.3,
                              marginBottom: 6,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {p.description}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--slate-500)' }}>
                            <span>{p.category}</span>
                            <StatusPill status={p.status as any} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
