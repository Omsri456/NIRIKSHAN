/**
 * Vendor Network Service — Cross-work pattern analysis for vendors and
 * implementing agencies.
 *
 * Surfaces which vendors/agencies appear across multiple flagged works,
 * potentially across different districts or states. This is a relational
 * analytics layer that the per-work risk scoring cannot see.
 *
 * Uses existing Expenditure (vendor.name) and Work (implementingAgency.name)
 * data — no new data ingestion required.
 */

import { ExpenditureModel } from '../models/Expenditure';
import { WorkModel } from '../models/Work';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { InvestigationModel } from '../models/Investigation';

// ── Types ─────────────────────────────────────────────────────────────

export interface VendorProfile {
  name: string;
  type: 'vendor' | 'agency';
  worksCount: number;
  workIds: string[];
  distinctDistricts: string[];
  distinctStates: string[];
  totalExpenditure: number;
  averageRiskScore: number;
  highRiskCount: number;
  criticalCount: number;
  highRiskPercentage: number;
  activeInvestigations: number;
  concentrationScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  works: VendorWork[];
}

export interface VendorWork {
  workId: string;
  description: string;
  category: string;
  status: string;
  district: string;
  state: string;
  riskScore: number;
  riskLevel: string;
  expenditure: number;
}

// ── Vendor Profiles ───────────────────────────────────────────────────

export async function getVendorProfiles(
  scopeFilter: Record<string, unknown>
): Promise<VendorProfile[]> {
  // 1. Get all scoped works
  const works = await WorkModel.find(scopeFilter, {
    workId: 1,
    description: 1,
    category: 1,
    'location.state': 1,
    'location.district': 1,
    'execution.status': 1,
    'financial.totalExpenditure': 1,
  }).lean();

  const workIds = works.map(w => w.workId);
  if (workIds.length === 0) return [];

  const workMap = new Map(works.map(w => [w.workId, w]));

  // 2. Aggregate expenditures by vendor
  const vendorAgg = await ExpenditureModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    {
      $group: {
        _id: '$vendor.name',
        workIds: { $addToSet: '$workId' },
        totalExpenditure: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { totalExpenditure: -1 } },
  ]);

  // 3. Fetch latest risk assessments for all works
  const latestRisks = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    {
      $group: {
        _id: '$workId',
        score: { $first: '$score' },
        level: { $first: '$level' },
      },
    },
  ]);
  const riskMap = new Map(latestRisks.map(r => [r._id, { score: r.score, level: r.level }]));

  // 4. Fetch active investigations
  const activeInvestigations = await InvestigationModel.find(
    {
      workId: { $in: workIds },
      status: { $in: ['OPEN', 'UNDER_REVIEW', 'PENDING_VERIFICATION'] },
    },
    { workId: 1 }
  ).lean();
  const investigatedWorkIds = new Set(activeInvestigations.map(inv => inv.workId));

  // 5. Build vendor profiles
  const profiles: VendorProfile[] = [];

  for (const vendor of vendorAgg) {
    const vendorName = vendor._id as string;
    const vendorWorkIds = vendor.workIds as string[];

    const districts = new Set<string>();
    const states = new Set<string>();
    let totalRiskScore = 0;
    let riskCount = 0;
    let highRiskCount = 0;
    let criticalCount = 0;
    let investigationCount = 0;
    const vendorWorks: VendorWork[] = [];

    for (const wId of vendorWorkIds) {
      const work = workMap.get(wId);
      if (!work) continue;

      const district = work.location?.district || '';
      const state = work.location?.state || '';
      if (district) districts.add(district);
      if (state) states.add(state);

      const risk = riskMap.get(wId);
      const riskScore = risk?.score ?? 0;
      const riskLevel = risk?.level ?? 'LOW';

      totalRiskScore += riskScore;
      riskCount++;

      if (riskLevel === 'HIGH') highRiskCount++;
      if (riskLevel === 'CRITICAL') criticalCount++;
      if (investigatedWorkIds.has(wId)) investigationCount++;

      vendorWorks.push({
        workId: wId,
        description: work.description || '',
        category: work.category || '',
        status: work.execution?.status || 'IN_PROGRESS',
        district,
        state,
        riskScore,
        riskLevel,
        expenditure: work.financial?.totalExpenditure || 0,
      });
    }

    const avgRiskScore = riskCount > 0 ? Math.round(totalRiskScore / riskCount) : 0;
    const highRiskPercentage =
      vendorWorkIds.length > 0
        ? Math.round(((highRiskCount + criticalCount) / vendorWorkIds.length) * 100)
        : 0;

    // Concentration score: works × districts × avgRisk / 100
    // Higher = more spread across districts with higher average risk
    const concentrationScore = Math.round(
      (vendorWorkIds.length * districts.size * avgRiskScore) / 100
    );

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (concentrationScore >= 50 || highRiskPercentage >= 60) riskLevel = 'CRITICAL';
    else if (concentrationScore >= 20 || highRiskPercentage >= 40) riskLevel = 'HIGH';
    else if (concentrationScore >= 5 || highRiskPercentage >= 20) riskLevel = 'MEDIUM';

    // Sort vendor works by risk score descending
    vendorWorks.sort((a, b) => b.riskScore - a.riskScore);

    profiles.push({
      name: vendorName,
      type: 'vendor',
      worksCount: vendorWorkIds.length,
      workIds: vendorWorkIds,
      distinctDistricts: Array.from(districts),
      distinctStates: Array.from(states),
      totalExpenditure: vendor.totalExpenditure,
      averageRiskScore: avgRiskScore,
      highRiskCount,
      criticalCount,
      highRiskPercentage,
      activeInvestigations: investigationCount,
      concentrationScore,
      riskLevel,
      works: vendorWorks,
    });
  }

  // Sort by concentration score descending
  profiles.sort((a, b) => b.concentrationScore - a.concentrationScore);

  return profiles;
}

// ── Agency Profiles ───────────────────────────────────────────────────

export async function getAgencyProfiles(
  scopeFilter: Record<string, unknown>
): Promise<VendorProfile[]> {
  // Aggregate by implementingAgency.name on Works
  const works = await WorkModel.find(scopeFilter, {
    workId: 1,
    description: 1,
    category: 1,
    'location.state': 1,
    'location.district': 1,
    'execution.status': 1,
    'financial.totalExpenditure': 1,
    'implementingAgency.name': 1,
  }).lean();

  const workIds = works.map(w => w.workId);
  if (workIds.length === 0) return [];

  // Group works by agency
  const agencyMap = new Map<
    string,
    typeof works
  >();
  for (const w of works) {
    const agencyName = w.implementingAgency?.name;
    if (!agencyName) continue;
    if (!agencyMap.has(agencyName)) agencyMap.set(agencyName, []);
    agencyMap.get(agencyName)!.push(w);
  }

  // Fetch risk assessments
  const latestRisks = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: { _id: '$workId', score: { $first: '$score' }, level: { $first: '$level' } } },
  ]);
  const riskMap = new Map(latestRisks.map(r => [r._id, { score: r.score, level: r.level }]));

  // Fetch active investigations
  const activeInvestigations = await InvestigationModel.find(
    {
      workId: { $in: workIds },
      status: { $in: ['OPEN', 'UNDER_REVIEW', 'PENDING_VERIFICATION'] },
    },
    { workId: 1 }
  ).lean();
  const investigatedWorkIds = new Set(activeInvestigations.map(inv => inv.workId));

  const profiles: VendorProfile[] = [];

  for (const [agencyName, agencyWorks] of agencyMap.entries()) {
    const districts = new Set<string>();
    const states = new Set<string>();
    let totalRiskScore = 0;
    let riskCount = 0;
    let highRiskCount = 0;
    let criticalCount = 0;
    let totalExpenditure = 0;
    let investigationCount = 0;
    const agencyWorkDetails: VendorWork[] = [];

    for (const w of agencyWorks) {
      const district = w.location?.district || '';
      const state = w.location?.state || '';
      if (district) districts.add(district);
      if (state) states.add(state);

      totalExpenditure += w.financial?.totalExpenditure || 0;

      const risk = riskMap.get(w.workId);
      const riskScore = risk?.score ?? 0;
      const riskLevel = risk?.level ?? 'LOW';

      totalRiskScore += riskScore;
      riskCount++;

      if (riskLevel === 'HIGH') highRiskCount++;
      if (riskLevel === 'CRITICAL') criticalCount++;
      if (investigatedWorkIds.has(w.workId)) investigationCount++;

      agencyWorkDetails.push({
        workId: w.workId,
        description: w.description || '',
        category: w.category || '',
        status: w.execution?.status || 'IN_PROGRESS',
        district,
        state,
        riskScore,
        riskLevel,
        expenditure: w.financial?.totalExpenditure || 0,
      });
    }

    const avgRiskScore = riskCount > 0 ? Math.round(totalRiskScore / riskCount) : 0;
    const agencyWorkIds = agencyWorks.map(w => w.workId);
    const highRiskPercentage =
      agencyWorkIds.length > 0
        ? Math.round(((highRiskCount + criticalCount) / agencyWorkIds.length) * 100)
        : 0;

    const concentrationScore = Math.round(
      (agencyWorkIds.length * districts.size * avgRiskScore) / 100
    );

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (concentrationScore >= 50 || highRiskPercentage >= 60) riskLevel = 'CRITICAL';
    else if (concentrationScore >= 20 || highRiskPercentage >= 40) riskLevel = 'HIGH';
    else if (concentrationScore >= 5 || highRiskPercentage >= 20) riskLevel = 'MEDIUM';

    agencyWorkDetails.sort((a, b) => b.riskScore - a.riskScore);

    profiles.push({
      name: agencyName,
      type: 'agency',
      worksCount: agencyWorkIds.length,
      workIds: agencyWorkIds,
      distinctDistricts: Array.from(districts),
      distinctStates: Array.from(states),
      totalExpenditure,
      averageRiskScore: avgRiskScore,
      highRiskCount,
      criticalCount,
      highRiskPercentage,
      activeInvestigations: investigationCount,
      concentrationScore,
      riskLevel,
      works: agencyWorkDetails,
    });
  }

  profiles.sort((a, b) => b.concentrationScore - a.concentrationScore);

  return profiles;
}

// ── Detailed Vendor Profile ───────────────────────────────────────────

export async function getVendorDetail(
  name: string,
  scopeFilter: Record<string, unknown>
): Promise<VendorProfile | null> {
  const profiles = await getVendorProfiles(scopeFilter);
  return profiles.find(p => p.name === name) || null;
}
