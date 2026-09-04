/**
 * Dashboard data access.
 * NOTE: These currently return the existing mock datasets. Real MongoDB
 * aggregations are a later milestone and must NOT be implemented here.
 */
export function getOverview() {
  return {
    totalWorks: 15420,
    totalExpenditure: 4850000000,
    totalAllocated: 6200000000,
    utilizationPercentage: 78.2,
    riskDistribution: { LOW: 8500, MEDIUM: 4200, HIGH: 2100, CRITICAL: 620 },
    activeInvestigations: 145,
    alertCount: 38,
    completedWorks: 9800,
    inProgressWorks: 4200,
    delayedWorks: 1420,
  };
}

export function getTrends() {
  return [
    { period: '2024-Q1', expenditure: 1200000000, worksCompleted: 2400, averageRiskScore: 32, highRiskCount: 180 },
    { period: '2024-Q2', expenditure: 1350000000, worksCompleted: 2600, averageRiskScore: 29, highRiskCount: 160 },
    { period: '2024-Q3', expenditure: 1100000000, worksCompleted: 2300, averageRiskScore: 35, highRiskCount: 210 },
    { period: '2024-Q4', expenditure: 1200000000, worksCompleted: 2500, averageRiskScore: 31, highRiskCount: 170 },
  ];
}

export function getRiskDistribution() {
  return [
    { level: 'LOW', count: 8500, percentage: 55.1 },
    { level: 'MEDIUM', count: 4200, percentage: 27.2 },
    { level: 'HIGH', count: 2100, percentage: 13.6 },
    { level: 'CRITICAL', count: 620, percentage: 4.1 },
  ];
}

export function getStates() {
  return [
    { state: 'Maharashtra', totalWorks: 2100, totalExpenditure: 680000000, utilizationPercentage: 82.5, averageRiskScore: 28, criticalWorks: 45, highRiskWorks: 180 },
    { state: 'Uttar Pradesh', totalWorks: 3200, totalExpenditure: 920000000, utilizationPercentage: 71.3, averageRiskScore: 38, criticalWorks: 120, highRiskWorks: 420 },
    { state: 'Tamil Nadu', totalWorks: 1800, totalExpenditure: 540000000, utilizationPercentage: 88.1, averageRiskScore: 22, criticalWorks: 18, highRiskWorks: 95 },
  ];
}