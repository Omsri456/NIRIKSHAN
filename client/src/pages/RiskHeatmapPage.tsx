import { GeographicRiskHeatmap } from '@/components/map/GeographicRiskHeatmap';

export function RiskHeatmapPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Geographic Risk Heatmap</h2>
          <p className="subtitle">
            Interactive GIS monitoring of MPLADS projects aggregated by district risk posture.
          </p>
        </div>
      </div>

      <GeographicRiskHeatmap />
    </div>
  );
}
