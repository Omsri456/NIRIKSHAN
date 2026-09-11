import { useEffect, useState, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import defaultIndiaGeo from './indiaGeoData';

export interface TelemetryNode {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  pulse?: boolean;
  delay?: string;
}

// 10 naturally distributed regional telemetry nodes across India
export const REGIONAL_MONITORING_NODES: TelemetryNode[] = [
  { id: 'delhi', name: 'Northern HQ', coordinates: [77.209, 28.6139], pulse: true, delay: '0s' },
  { id: 'srinagar', name: 'Northern Outpost', coordinates: [74.7973, 34.0837], pulse: false, delay: '0.6s' },
  { id: 'mumbai', name: 'Western Hub', coordinates: [72.8777, 19.076], pulse: true, delay: '1.2s' },
  { id: 'ahmedabad', name: 'Western Node', coordinates: [72.5714, 23.0225], pulse: false, delay: '1.8s' },
  { id: 'bhopal', name: 'Central Node', coordinates: [77.4126, 23.2599], pulse: false, delay: '2.4s' },
  { id: 'kolkata', name: 'Eastern Hub', coordinates: [88.3639, 22.5726], pulse: true, delay: '3.0s' },
  { id: 'guwahati', name: 'North-Eastern Hub', coordinates: [91.7362, 26.1445], pulse: false, delay: '3.6s' },
  { id: 'hyderabad', name: 'Deccan Node', coordinates: [78.4867, 17.385], pulse: false, delay: '4.2s' },
  { id: 'bengaluru', name: 'Southern Tech Hub', coordinates: [77.5946, 12.9716], pulse: true, delay: '4.8s' },
  { id: 'chennai', name: 'Southern Coastal Hub', coordinates: [80.2707, 13.0827], pulse: false, delay: '5.4s' },
];

// 4 restrained curved network transmission arcs
export const MONITORING_CONNECTIONS: [string, string][] = [
  ['delhi', 'mumbai'],
  ['delhi', 'kolkata'],
  ['delhi', 'hyderabad'],
  ['mumbai', 'bengaluru'],
  ['kolkata', 'guwahati'],
];
/**
 * Sub-component: Base Geographic Map (State Boundaries & National Outline)
 */
export function IndiaMonitoringMap({
  geoData,
  pathGenerator,
}: {
  geoData: FeatureCollection<Geometry>;
  pathGenerator: (feature: any) => string | null;
}) {
  return (
    <g className="india-geo-layers">
      {/* 1. State Geographies & Interior Fill */}
      {geoData.features.map((feature, idx) => {
        const d = pathGenerator(feature);
        if (!d) return null;
        return (
          <path
            key={`state-${feature.properties?.NAME_1 || idx}`}
            d={d}
            fill="url(#india-interior-gradient)"
            stroke="rgba(20, 184, 166, 0.16)"
            strokeWidth="0.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}

      {/* 2. Crisp National Outer Outline */}
      <g stroke="#14b8a6" strokeWidth="1.15" fill="none" opacity="0.85">
        {geoData.features.map((feature, idx) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          return <path key={`outline-${idx}`} d={d} />;
        })}
      </g>
    </g>
  );
}

/**
 * Sub-component: Curved Network Telemetry Connections
 */
export function MonitoringConnections({
  links,
}: {
  links: Array<{ id: string; d: string } | null>;
}) {
  return (
    <g className="india-network-connections" opacity="0.7">
      {links.map((link) => {
        if (!link) return null;
        return (
          <path
            key={link.id}
            d={link.d}
            stroke="url(#network-arc-gradient)"
            strokeWidth="1.2"
            fill="none"
            className="telemetry-arc"
          />
        );
      })}
    </g>
  );
}

/**
 * Sub-component: Data Monitoring Telemetry Nodes
 */
export function MonitoringNodes({
  projectedNodes,
}: {
  projectedNodes: Array<{ x: number; y: number; node: TelemetryNode }>;
}) {
  return (
    <g className="india-monitoring-nodes">
      {projectedNodes.map(({ x, y, node }) => (
        <g key={node.id} className="telemetry-node-group" style={{ animationDelay: node.delay }}>
          {/* Subtle Outer Pulse for Priority Hubs */}
          {node.pulse && (
            <circle
              cx={x}
              cy={y}
              r="7.5"
              fill="rgba(20, 184, 166, 0.22)"
              className="pulse-node"
            />
          )}
          {/* Node Core Body */}
          <circle
            cx={x}
            cy={y}
            r="2.6"
            fill="#2dd4bf"
            stroke="#042f2e"
            strokeWidth="0.7"
          />
          {/* Center Signal Dot */}
          <circle cx={x} cy={y} r="0.9" fill="#ffffff" />
        </g>
      ))}
    </g>
  );
}

/**
 * Dedicated Brand Visualization Component: IndiaMonitoringVisualization
 * Orchestrates authentic geographic geometry, network arcs, and monitoring nodes.
 */
export function IndiaMonitoringVisualization({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry>>(
    defaultIndiaGeo as unknown as FeatureCollection<Geometry>
  );

  const viewBoxWidth = 600;
  const viewBoxHeight = 700;

  useEffect(() => {
    let isMounted = true;
    fetch('/maps/india.json')
      .then((res) => {
        if (!res.ok) throw new Error('Local map fetch failed');
        return res.json();
      })
      .then((data: FeatureCollection<Geometry>) => {
        if (isMounted && data?.features?.length) {
          setGeoData(data);
        }
      })
      .catch(() => {
        // Silently use embedded fallback
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Set up d3-geo Mercator projection tailored and fitted with natural margins
  const { pathGenerator, projectedNodes, projectedLinks } = useMemo(() => {
    // Mercator fitted inside viewBox with 35px padding
    const projection = geoMercator().fitExtent(
      [
        [35, 35],
        [viewBoxWidth - 35, viewBoxHeight - 35],
      ],
      geoData
    );

    const pathGen = geoPath().projection(projection);

    const nodesMap = new Map<string, { x: number; y: number; node: TelemetryNode }>();
    REGIONAL_MONITORING_NODES.forEach((hub) => {
      const coords = projection(hub.coordinates);
      if (coords) {
        nodesMap.set(hub.id, { x: coords[0], y: coords[1], node: hub });
      }
    });

    const links = MONITORING_CONNECTIONS.map(([sourceId, targetId]) => {
      const source = nodesMap.get(sourceId);
      const target = nodesMap.get(targetId);
      if (!source || !target) return null;

      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const curvature = 0.16;
      const cx = midX - dy * curvature;
      const cy = midY + dx * curvature;

      return {
        id: `${sourceId}-${targetId}`,
        d: `M ${source.x},${source.y} Q ${cx},${cy} ${target.x},${target.y}`,
      };
    }).filter(Boolean);

    return {
      pathGenerator: pathGen,
      projectedNodes: Array.from(nodesMap.values()),
      projectedLinks: links,
    };
  }, [geoData]);

  return (
    <div
      className={`india-monitoring-vis-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <svg
        className="india-monitoring-svg"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '520px',
          maxHeight: '600px',
          objectFit: 'contain',
        }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="National Infrastructure Monitoring Visualization"
      >
        <defs>
          {/* Delicate background coordinate grid */}
          <pattern id="vis-grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(20, 184, 166, 0.035)" strokeWidth="0.65" />
          </pattern>

          {/* Deep Navy / Transparent Map Gradient */}
          <linearGradient id="india-interior-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08283b" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#061c2c" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#04121f" stopOpacity="0.6" />
          </linearGradient>

          {/* Network Arc Transmission Gradient */}
          <linearGradient id="network-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* 1. Subtle Grid Pattern */}
        <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#vis-grid-pattern)" />

        {/* 2. Geographic State Boundaries & National Outline */}
        <IndiaMonitoringMap geoData={geoData} pathGenerator={pathGenerator} />

        {/* 3. Curved Network Connections */}
        <MonitoringConnections links={projectedLinks} />

        {/* 4. Monitoring Telemetry Nodes */}
        <MonitoringNodes projectedNodes={projectedNodes} />
      </svg>
    </div>
  );
}

export default IndiaMonitoringVisualization;
