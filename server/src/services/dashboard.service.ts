import { WorkModel } from '../models/Work';
import { ExpenditureModel } from '../models/Expenditure';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { InvestigationModel } from '../models/Investigation';

export async function getOverview(scopeFilter: Record<string, unknown>) {
  const works = await WorkModel.find(scopeFilter, { workId: 1, 'execution.status': 1, 'execution.startDate': 1, 'financial.finalAmount': 1, 'financial.totalExpenditure': 1 }).lean();
  const workIds = works.map(w => w.workId);

  let totalWorks = works.length;
  let totalExpenditure = 0;
  let totalAllocated = 0;
  let completedWorks = 0;
  let inProgressWorks = 0;
  let delayedWorks = 0;
  
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  for (const w of works) {
    totalExpenditure += w.financial?.totalExpenditure || 0;
    totalAllocated += w.financial?.finalAmount || 0;
    
    if (w.execution?.status === 'COMPLETED') completedWorks++;
    if (w.execution?.status === 'IN_PROGRESS') {
      inProgressWorks++;
      if (w.execution.startDate && new Date(w.execution.startDate) < twelveMonthsAgo) {
        delayedWorks++;
      }
    }
  }
  
  const utilizationPercentage = totalAllocated > 0 ? Number(((totalExpenditure / totalAllocated) * 100).toFixed(1)) : 0;
  
  const riskAssessments = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: "$workId", level: { $first: "$level" } } }
  ]);
  
  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of riskAssessments) {
    if (riskDistribution[r.level as keyof typeof riskDistribution] !== undefined) {
        riskDistribution[r.level as keyof typeof riskDistribution]++;
    }
  }
  const alertCount = riskDistribution.HIGH + riskDistribution.CRITICAL;
  
  const activeInvestigations = await InvestigationModel.countDocuments({
    workId: { $in: workIds },
    status: { $in: ['OPEN', 'UNDER_REVIEW'] }
  });
  
  return {
    totalWorks,
    totalExpenditure,
    totalAllocated,
    utilizationPercentage,
    riskDistribution,
    activeInvestigations,
    alertCount,
    completedWorks,
    inProgressWorks,
    delayedWorks
  };
}

export async function getTrends(scopeFilter: Record<string, unknown>) {
  const works = await WorkModel.find(scopeFilter).lean();
  const workIds = works.map(w => w.workId);
  
  const riskAssessments = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: "$workId", score: { $first: "$score" }, level: { $first: "$level" } } }
  ]);
  
  const riskMap = new Map(riskAssessments.map(r => [r._id, r]));

  const quarters = new Map<string, any>();
  
  for (const w of works) {
    const dateToUse = w.execution?.completionDate ? new Date(w.execution.completionDate) : new Date((w as any).updatedAt || new Date());
    const year = dateToUse.getFullYear();
    const q = Math.floor(dateToUse.getMonth() / 3) + 1;
    const period = `${year}-Q${q}`;
    
    if (!quarters.has(period)) {
      quarters.set(period, {
        period,
        expenditure: 0,
        worksCompleted: 0,
        totalRiskScore: 0,
        riskCount: 0,
        highRiskCount: 0
      });
    }
    
    const qData = quarters.get(period);
    qData.expenditure += w.financial?.totalExpenditure || 0;
    if (w.execution?.status === 'COMPLETED') {
        qData.worksCompleted++;
    }
    
    const risk = riskMap.get(w.workId);
    if (risk) {
      qData.totalRiskScore += risk.score || 0;
      qData.riskCount++;
      if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
        qData.highRiskCount++;
      }
    }
  }
  
  const results = Array.from(quarters.values()).map(q => ({
    period: q.period,
    expenditure: q.expenditure,
    worksCompleted: q.worksCompleted,
    averageRiskScore: q.riskCount > 0 ? Math.round(q.totalRiskScore / q.riskCount) : 0,
    highRiskCount: q.highRiskCount
  }));
  
  results.sort((a, b) => a.period.localeCompare(b.period));
  
  return results.slice(-4);
}

export async function getRiskDistribution(scopeFilter: Record<string, unknown>) {
  const works = await WorkModel.find(scopeFilter, { workId: 1 }).lean();
  const workIds = works.map(w => w.workId);
  
  const riskAssessments = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: "$workId", level: { $first: "$level" } } }
  ]);
  
  let total = 0;
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of riskAssessments) {
    if (counts[r.level as keyof typeof counts] !== undefined) {
        counts[r.level as keyof typeof counts]++;
        total++;
    }
  }
  
  return (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(level => ({
    level,
    count: counts[level],
    percentage: total > 0 ? Number(((counts[level] / total) * 100).toFixed(1)) : 0
  }));
}

export async function getStates(scopeFilter: Record<string, unknown>) {
  const works = await WorkModel.find(scopeFilter).lean();
  const workIds = works.map(w => w.workId);
  
  const riskAssessments = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: "$workId", score: { $first: "$score" }, level: { $first: "$level" } } }
  ]);
  const riskMap = new Map(riskAssessments.map(r => [r._id, r]));
  
  const stateMap = new Map<string, any>();
  
  for (const w of works) {
    const state = w.location?.state;
    if (!state) continue;
    
    if (!stateMap.has(state)) {
      stateMap.set(state, {
        state,
        totalWorks: 0,
        totalExpenditure: 0,
        totalAllocated: 0,
        totalRiskScore: 0,
        riskCount: 0,
        criticalWorks: 0,
        highRiskWorks: 0
      });
    }
    
    const sData = stateMap.get(state);
    sData.totalWorks++;
    sData.totalExpenditure += w.financial?.totalExpenditure || 0;
    sData.totalAllocated += w.financial?.finalAmount || 0;
    
    const risk = riskMap.get(w.workId);
    if (risk) {
      sData.totalRiskScore += risk.score || 0;
      sData.riskCount++;
      if (risk.level === 'CRITICAL') sData.criticalWorks++;
      if (risk.level === 'HIGH') sData.highRiskWorks++;
    }
  }
  
  return Array.from(stateMap.values()).map(s => ({
    state: s.state,
    totalWorks: s.totalWorks,
    totalExpenditure: s.totalExpenditure,
    utilizationPercentage: s.totalAllocated > 0 ? Number(((s.totalExpenditure / s.totalAllocated) * 100).toFixed(1)) : 0,
    averageRiskScore: s.riskCount > 0 ? Math.round(s.totalRiskScore / s.riskCount) : 0,
    criticalWorks: s.criticalWorks,
    highRiskWorks: s.highRiskWorks
  }));
}