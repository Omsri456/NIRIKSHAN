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
    status: { $in: ['OPEN', 'UNDER_REVIEW', 'PENDING_VERIFICATION'] }
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

// Canonical cross-state and district normalization maps
const CROSS_STATE_DISTRICTS: Record<string, string> = {
  'azamgarh': 'Uttar Pradesh',
  'etah': 'Uttar Pradesh',
  'gopalganj': 'Bihar',
  'purbi champaran': 'Bihar',
  'pakyong': 'Sikkim',
  'betul': 'Madhya Pradesh',
  'saharsa': 'Bihar',
  'tumakuru': 'Karnataka',
  'kupwara': 'Jammu and Kashmir',
  'vidisha': 'Madhya Pradesh',
};

const CANONICAL_DISTRICT_MAP: Record<string, Record<string, string>> = {
  'maharashtra': {
    'ahilyanagar': 'Ahmednagar',
    'ahmednagar': 'Ahmednagar',
    'ahmadnagar': 'Ahmednagar',
    'chhatrapati sambhajinagar': 'Aurangabad',
    'aurangabad': 'Aurangabad',
    'sambhajinagar': 'Aurangabad',
    'dharashiv': 'Osmanabad',
    'osmanabad': 'Osmanabad',
    'bid': 'Beed',
    'beed': 'Beed',
    'buldana': 'Buldhana',
    'buldhana': 'Buldhana',
    'garhchiroli': 'Gadchiroli',
    'gadchiroli': 'Gadchiroli',
    'gondiya': 'Gondia',
    'gondia': 'Gondia',
    'raigarh': 'Raigad',
    'raigad': 'Raigad',
    'mumbai': 'Mumbai',
    'mumbai city': 'Mumbai',
    'greater bombay': 'Mumbai',
    'mumbai suburban': 'Mumbai Suburban',
    'mumbai suburban district': 'Mumbai Suburban',
    'thane': 'Thane',
    'palghar': 'Palghar',
  },
  'odisha': {
    'anugola': 'Angul',
    'angul': 'Angul',
    'baleshwar': 'Balasore',
    'balasore': 'Balasore',
    'baragarh': 'Bargarh',
    'bargarh': 'Bargarh',
    'baudh': 'Boudh',
    'boudh': 'Boudh',
    'debagada': 'Deogarh',
    'deogarh': 'Deogarh',
    'jagatsinghapur': 'Jagatsinghpur',
    'jagatsinghpur': 'Jagatsinghpur',
    'jajapur': 'Jajpur',
    'jajpur': 'Jajpur',
    'kandhamala': 'Kandhamal',
    'kandhamal': 'Kandhamal',
    'kendrapada': 'Kendrapara',
    'kendrapara': 'Kendrapara',
    'kendujhar': 'Keonjhar',
    'keonjhar': 'Keonjhar',
    'khordha': 'Khurda',
    'khurda': 'Khurda',
    'nabarangapur': 'Nabarangpur',
    'nabarangpur': 'Nabarangpur',
    'nayagada': 'Nayagarh',
    'nayagarh': 'Nayagarh',
    'subarnapur': 'Sonepur',
    'sonepur': 'Sonepur',
    'sundargarh': 'Sundargarh',
    'sundergarh': 'Sundargarh',
  },
  'karnataka': {
    'bangalore': 'Bengaluru Urban',
    'bangalore urban': 'Bengaluru Urban',
    'bengaluru urban': 'Bengaluru Urban',
    'bangalore rural': 'Bengaluru Rural',
    'bengaluru rural': 'Bengaluru Rural',
    'belgaum': 'Belagavi',
    'belagavi': 'Belagavi',
    'bellary': 'Ballari',
    'ballari': 'Ballari',
    'bijapur': 'Vijayapura',
    'vijayapura': 'Vijayapura',
    'chikmagalur': 'Chikkamagaluru',
    'chikkamagaluru': 'Chikkamagaluru',
    'gulbarga': 'Kalaburagi',
    'kalaburagi': 'Kalaburagi',
    'mysore': 'Mysuru',
    'mysuru': 'Mysuru',
    'shimoga': 'Shivamogga',
    'shivamogga': 'Shivamogga',
    'tumkur': 'Tumakuru',
    'tumakuru': 'Tumakuru',
  },
  'uttar pradesh': {
    'allahabad': 'Prayagraj',
    'prayagraj': 'Prayagraj',
    'faizabad': 'Ayodhya',
    'ayodhya': 'Ayodhya',
    'kanshiram nagar': 'Kasganj',
    'kasganj': 'Kasganj',
    'sant ravidas nagar': 'Bhadohi',
    'bhadohi': 'Bhadohi',
    'siddharth nagar': 'Siddharthnagar',
    'siddharthnagar': 'Siddharthnagar',
  }
};

function resolveCanonicalLocation(rawState: string, rawDistrict: string): { state: string; district: string } {
  const cleanState = (rawState || '').trim();
  const cleanDist = (rawDistrict || '').trim();
  const distLower = cleanDist.toLowerCase();

  const trueState = CROSS_STATE_DISTRICTS[distLower];
  const effectiveState = trueState || cleanState;
  const stateLower = effectiveState.toLowerCase();

  const stateDistMap = CANONICAL_DISTRICT_MAP[stateLower];
  const canonicalDist = (stateDistMap && stateDistMap[distLower]) || cleanDist;

  return {
    state: effectiveState,
    district: canonicalDist,
  };
}

export async function getDistrictsRiskSummary(
  scopeFilter: Record<string, unknown>,
  userInfo?: { role?: string; scope?: { state?: string | null; district?: string | null; constituency?: string | null } }
) {
  // 1. Authorized query: Scope filtering happens BEFORE district aggregation
  const works = await WorkModel.find(scopeFilter, {
    workId: 1,
    description: 1,
    category: 1,
    'location.state': 1,
    'location.district': 1,
    'location.constituency': 1,
    'financial.finalAmount': 1,
    'financial.totalExpenditure': 1,
    'execution.status': 1,
  }).lean();

  const workIds = works.map((w) => w.workId);

  // 2. Fetch latest risk assessments for these authorized works ONLY
  const riskAssessments = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: '$workId', score: { $first: '$score' }, level: { $first: '$level' } } },
  ]);

  const riskMap = new Map<string, { score: number; level: string }>();
  for (const r of riskAssessments) {
    riskMap.set(r._id, { score: r.score || 0, level: r.level || 'LOW' });
  }

  // 3. District-level aggregation with canonical district resolution
  const districtMap = new Map<string, {
    district: string;
    state: string;
    totalWorks: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    totalRiskScore: number;
    riskCount: number;
    totalExpenditure: number;
    totalAllocated: number;
    projects: Array<{
      workId: string;
      description: string;
      category: string;
      status: string;
      riskScore: number;
      riskLevel: string;
      finalAmount: number;
      totalExpenditure: number;
      constituency: string;
    }>;
  }>();

  for (const w of works) {
    const rawDist = w.location?.district;
    const rawState = w.location?.state;
    if (!rawDist || !rawState) continue;

    const { state, district } = resolveCanonicalLocation(rawState, rawDist);

    // If user is restricted to a state authority role, ensure cross-state works do not leak
    if (userInfo?.role === 'STATE_AUTHORITY' && userInfo?.scope?.state) {
      if (state.toLowerCase() !== userInfo.scope.state.toLowerCase()) {
        continue;
      }
    }

    const key = `${state}:::${district}`;
    if (!districtMap.has(key)) {
      districtMap.set(key, {
        district,
        state,
        totalWorks: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        totalRiskScore: 0,
        riskCount: 0,
        totalExpenditure: 0,
        totalAllocated: 0,
        projects: [],
      });
    }

    const dData = districtMap.get(key)!;
    dData.totalWorks++;
    dData.totalExpenditure += w.financial?.totalExpenditure || 0;
    dData.totalAllocated += w.financial?.finalAmount || 0;

    const risk = riskMap.get(w.workId);
    const score = risk ? risk.score : 0;
    const level = risk ? risk.level : 'LOW';

    if (risk) {
      dData.totalRiskScore += score;
      dData.riskCount++;
    }

    if (level === 'HIGH' || level === 'CRITICAL') {
      dData.highRisk++;
    } else if (level === 'MEDIUM') {
      dData.mediumRisk++;
    } else {
      dData.lowRisk++;
    }

    dData.projects.push({
      workId: w.workId,
      description: w.description,
      category: w.category,
      status: w.execution?.status || 'IN_PROGRESS',
      riskScore: score,
      riskLevel: level,
      finalAmount: w.financial?.finalAmount || 0,
      totalExpenditure: w.financial?.totalExpenditure || 0,
      constituency: w.location?.constituency || '',
    });
  }

  // Determine userScopeNote for geographic role constraints
  let userScopeNote: string | undefined;
  if (userInfo?.role === 'STATE_AUTHORITY' && userInfo?.scope?.state) {
    userScopeNote = `State Scope: ${userInfo.scope.state} (State Authority Restricted View)`;
  } else if (userInfo?.role === 'DISTRICT_AUTHORITY' && userInfo?.scope?.district) {
    userScopeNote = `District Scope: ${userInfo.scope.district} (${userInfo.scope.state || ''})`;
  } else if (userInfo?.role === 'MP') {
    if (userInfo?.scope?.constituency) {
      userScopeNote = `Constituency Scope: ${userInfo.scope.constituency} (MP Restricted View)`;
    } else if (userInfo?.scope?.district) {
      userScopeNote = `District Scope: ${userInfo.scope.district} (${userInfo.scope.state || ''}) (MP View)`;
    } else if (userInfo?.scope?.state) {
      userScopeNote = `State Scope: ${userInfo.scope.state} (MP View)`;
    }
  }

  const districts = Array.from(districtMap.values()).map((d) => {
    const averageRiskScore = d.riskCount > 0 ? Math.round(d.totalRiskScore / d.riskCount) : 0;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (averageRiskScore >= 75) riskLevel = 'CRITICAL';
    else if (averageRiskScore >= 50) riskLevel = 'HIGH';
    else if (averageRiskScore >= 25) riskLevel = 'MEDIUM';

    d.projects.sort((a, b) => b.riskScore - a.riskScore);

    return {
      district: d.district,
      state: d.state,
      totalWorks: d.totalWorks,
      highRisk: d.highRisk,
      mediumRisk: d.mediumRisk,
      lowRisk: d.lowRisk,
      averageRiskScore,
      riskLevel,
      totalExpenditure: d.totalExpenditure,
      totalAllocated: d.totalAllocated,
      userScopeNote,
      projects: d.projects,
    };
  });

  return {
    districts,
    userScope: {
      role: userInfo?.role || 'ANONYMOUS',
      state: userInfo?.scope?.state || null,
      district: userInfo?.scope?.district || null,
      constituency: userInfo?.scope?.constituency || null,
      scopeNote: userScopeNote || null,
    },
  };
}
