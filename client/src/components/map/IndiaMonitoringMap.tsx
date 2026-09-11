import { useEffect, useState, useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';

// Embedded GeoJSON dataset as instant fallback / zero-latency baseline
import defaultIndiaGeo from './indiaGeoData';

export interface TelemetryNode {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  pulse?: boolean;
  delay?: string;
}

const DEFAULT_TELEMETRY_HUBS: TelemetryNode[] = [
  { id: 'delhi', name: 'New Delhi HQ', coordinates: [77.209, 28.6139], pulse: true, delay: '0s' },
  { id: 'srinagar', name: 'Srinagar Node', coordinates: [74.7973, 34.0837], pulse: false, delay: '0.4s' },
  { id: 'mumbai', name: 'Mumbai Hub', coordinates: [72.8777, 19.076], pulse: true, delay: '0.8s' },
  { id: 'kolkata', name: 'Kolkata Hub', coordinates: [88.3639, 22.5726], pulse: false, delay: '1.2s' },
  { id: 'hyderabad', name: 'Hyderabad Node', coordinates: [78.4867, 17.385], pulse: true, delay: '1.6s' },
  { id: 'bengaluru', name: 'Bengaluru Core', coordinates: [77.5946, 12.9716], pulse: true, delay: '2.0s' },
  { id: 'chennai', name: 'Chennai Node', coordinates: [80.2707, 13.0827], pulse: false, delay: '2.4s' },
  { id: 'ahmedabad', name: 'Ahmedabad Node', coordinates: [72.5714, 23.0225], pulse: false, delay: '2.8s' },
  { id: 'lucknow', name: 'Lucknow Node', coordinates: [80.9462, 26.8467], pulse: false, delay: '3.2s' },
  { id: 'guwahati', name: 'Guwahati Hub', coordinates: [91.7362, 26.1445], pulse: true, delay: '3.6s' },
  { id: 'bhopal', name: 'Bhopal Node', coordinates: [77.4126, 23.2599], pulse: false, delay: '4.0s' },
  { id: 'bhubaneswar', name: 'Bhubaneswar Node', coordinates: [85.8245, 20.2961], pulse: false, delay: '4.4s' },
];

const TELEMETRY_LINKS: [string, string][] = [
  ['delhi', 'mumbai'],
  ['delhi', 'kolkata'],
  ['delhi', 'lucknow'],
  ['delhi', 'srinagar'],
  ['delhi', 'bhopal'],
  ['kolkata', 'guwahati'],
  ['kolkata', 'bhubaneswar'],
  ['mumbai', 'hyderabad'],
  ['mumbai', 'ahmedabad'],
  ['hyderabad', 'bengaluru'],
  ['bengaluru', 'chennai'],
  ['bhopal', 'hyderabad'],
];

export interface IndiaMonitoringMapProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

export function IndiaMonitoringMap({
  className = '',
  style = {},
  width = 540,
  height = 620,
}: IndiaMonitoringMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry>>(defaultIndiaGeo as unknown as FeatureCollection<Geometry>);

  useEffect(() => {
    let isMounted = true;
    fetch('/maps/india.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load local map');
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

  // Set up d3-geo Mercator projection tailored for India's exact bounding box
  const { pathGenerator, projectedNodes, projectedLinks } = useMemo(() => {
    const projection = geoMercator()
      .center([82.8, 22.6])
      .scale(820)
      .translate([width / 2, height / 2 + 10]);

    const pathGen = geoPath().projection(projection);

    const nodesMap = new Map<string, { x: number; y: number; node: TelemetryNode }>();
    DEFAULT_TELEMETRY_HUBS.forEach((hub) => {
      const coords = projection(hub.coordinates);
      if (coords) {
        nodesMap.set(hub.id, { x: coords[0], y: coords[1], node: hub });
      }
    });

    const links = TELEMETRY_LINKS.map(([sourceId, targetId]) => {
      const source = nodesMap.get(sourceId);
      const target = nodesMap.get(targetId);
      if (!source || !target) return null;

      // Calculate a controlled bezier control point for elegant curved network arcs
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      // Perpendicular arc curve
      const curvature = 0.18;
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
  }, [width, height]);

  return (
    <svg
      className={`india-telemetry-map ${className}`}
      style={{ width: '100%', height: '100%', ...style }}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="National Infrastructure Monitoring Visualization"
    >
      <defs>
        {/* Subtle grid pattern */}
        <pattern id="map-grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(20, 184, 166, 0.04)" strokeWidth="0.75" />
        </pattern>

        {/* Soft Map Fill Gradient */}
        <linearGradient id="map-fill-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#08283b" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#061c2c" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#04121f" stopOpacity="0.7" />
        </linearGradient>

        {/* Network Arc Gradient */}
        <linearGradient id="network-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.2" />
        </linearGradient>

        {/* Node Glow Filter */}
        <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Grid Canvas */}
      <rect width={width} height={height} fill="url(#map-grid-pattern)" />

      {/* State Geographies rendered via d3-geo */}
      <g className="india-states-group">
        {geoData.features.map((feature, idx) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          return (
            <path
              key={feature.properties?.id || idx}
              d={d}
              fill="url(#map-fill-gradient)"
              stroke="rgba(20, 184, 166, 0.2)"
              strokeWidth="0.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Crisp Outer Boundary Stroke */}
      <g className="india-outer-boundary" stroke="#14b8a6" strokeWidth="1.2" fill="none">
        {geoData.features.map((feature, idx) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          return <path key={`outer-${idx}`} d={d} />;
        })}
      </g>

      {/* Curved Telemetry Network Transmission Arcs */}
      <g className="telemetry-arcs-group">
        {projectedLinks.map((link) => {
          if (!link) return null;
          return (
            <path
              key={link.id}
              d={link.d}
              stroke="url(#network-arc-gradient)"
              strokeWidth="1.3"
              fill="none"
              className="telemetry-arc"
            />
          );
        })}
      </g>

      {/* Telemetry Data Hubs (Nodes) */}
      <g className="telemetry-nodes-group">
        {projectedNodes.map(({ x, y, node }) => (
          <g key={node.id} className="telemetry-node-group" style={{ animationDelay: node.delay }}>
            {/* Outer Pulsing Glow */}
            <circle
              cx={x}
              cy={y}
              r={node.pulse ? 8.5 : 6}
              fill="rgba(20, 184, 166, 0.22)"
              className={node.pulse ? 'pulse-node' : undefined}
            />
            {/* Inner Core Point */}
            <circle cx={x} cy={y} r="3" fill="#2dd4bf" stroke="#042f2e" strokeWidth="0.8" />
            {/* White Signal Dot */}
            <circle cx={x} cy={y} r="1.1" fill="#ffffff" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default IndiaMonitoringMap;
