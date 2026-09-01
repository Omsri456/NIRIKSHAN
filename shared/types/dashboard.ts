// ============================================================
// Dashboard Contracts
// Response shapes for /api/dashboard/* endpoints
// ============================================================

import { RiskLevel } from './risk';

export interface DashboardOverview {
  totalWorks: number;
  totalExpenditure: number;
  totalAllocated: number;
  utilizationPercentage: number;
  riskDistribution: Record<RiskLevel, number>;
  activeInvestigations: number;
  alertCount: number;
  completedWorks: number;
  inProgressWorks: number;
  delayedWorks: number;
}

export interface TrendDataPoint {
  period: string;      // e.g. "2024-Q1", "2024-08"
  expenditure: number;
  worksCompleted: number;
  averageRiskScore: number;
  highRiskCount: number;
}

export interface StateOverview {
  state: string;
  totalWorks: number;
  totalExpenditure: number;
  utilizationPercentage: number;
  averageRiskScore: number;
  criticalWorks: number;
  highRiskWorks: number;
}

export interface RiskDistributionItem {
  level: RiskLevel;
  count: number;
  percentage: number;
}
