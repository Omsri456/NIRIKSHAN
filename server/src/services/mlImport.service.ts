import fs from 'fs';
import path from 'path';
import { WorkModel } from '../models/Work';
import { RiskAssessmentModel } from '../models/RiskAssessment';

export interface ImportStats {
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ workId: string; reason: string }>;
}

export interface RawMlRiskReport {
  workId: string;
  modelVersion: string;
  evaluatedAt: string;
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  scores: {
    costAnomalyScore?: number;
    timelineDelayScore?: number;
    paymentAnomalyScore?: number;
    duplicateSimilarityScore?: number;
  };
  explainability: {
    summary?: string;
    evidence?: Array<{
      category: string;
      severity: string;
      title: string;
      description: string;
      metrics?: Record<string, unknown>;
    }>;
  };
}

/**
 * Maps category string to standard signal type.
 */
function mapCategoryToSignalType(category: string): string {
  const upper = (category || '').toUpperCase();
  switch (upper) {
    case 'COST':
      return 'COST_ANOMALY';
    case 'TIMELINE':
      return 'TIMELINE_ANOMALY';
    case 'PAYMENT':
      return 'PAYMENT_ANOMALY';
    case 'DUPLICATE':
      return 'POTENTIAL_DUPLICATE';
    case 'COMPLIANCE':
      return 'COMPLIANCE_INDICATOR';
    default:
      return upper ? `${upper}_SIGNAL` : 'RISK_SIGNAL';
  }
}

/**
 * Import ML risk scores from JSON file into MongoDB RiskAssessment collection.
 *
 * Importer features:
 *  - Validates work existence (or checks workIds)
 *  - Supports safe re-running (upserts based on workId + modelVersion)
 *  - Maps ML evidence to RiskAssessment signals schema
 *  - Provides detailed import statistics
 */
export async function importMlRiskScores(jsonFilePath?: string): Promise<ImportStats> {
  const filePath = jsonFilePath || path.resolve(__dirname, '../../../data/processed/risk_scores.json');

  const stats: ImportStats = {
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!fs.existsSync(filePath)) {
    throw new Error(`ML risk scores file not found at: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  let reports: RawMlRiskReport[];
  try {
    reports = JSON.parse(rawData);
    if (!Array.isArray(reports)) {
      throw new Error('Expected JSON array of risk reports');
    }
  } catch (err: any) {
    throw new Error(`Failed to parse risk_scores.json: ${err.message}`);
  }

  // Pre-fetch existing valid workIds from MongoDB to validate works
  const existingWorks = await WorkModel.find({}, { workId: 1 }).lean();
  const validWorkIdSet = new Set(existingWorks.map((w) => w.workId));

  for (const report of reports) {
    stats.processed++;

    if (!report.workId || typeof report.overallRiskScore !== 'number') {
      stats.failed++;
      stats.errors.push({ workId: report.workId || 'unknown', reason: 'Missing workId or overallRiskScore' });
      continue;
    }

    const workId = String(report.workId).trim();

    // If MongoDB has works populated, check if workId exists (if not, log warning but import if valid format)
    if (validWorkIdSet.size > 0 && !validWorkIdSet.has(workId)) {
      // Create a lightweight placeholder work if needed or skip
      // To ensure database integrity, we only skip if invalid format
      if (!workId.startsWith('MPLADS-W-') && !/^\d+$/.test(workId)) {
        stats.skipped++;
        stats.errors.push({ workId, reason: 'Invalid workId format or non-existent work' });
        continue;
      }
    }

    const generatedAt = report.evaluatedAt ? new Date(report.evaluatedAt) : new Date();
    const modelVersion = report.modelVersion || 'nirikshan-ml-v1.0';

    // Map evidence items to RiskAssessment signals
    const evidenceList = report.explainability?.evidence || [];
    const signals = evidenceList.map((ev) => {
      const type = mapCategoryToSignalType(ev.category);
      let subScore = 0.5;
      if (ev.category === 'COST') subScore = (report.scores?.costAnomalyScore || 50) / 100;
      else if (ev.category === 'TIMELINE') subScore = (report.scores?.timelineDelayScore || 50) / 100;
      else if (ev.category === 'PAYMENT') subScore = (report.scores?.paymentAnomalyScore || 50) / 100;
      else if (ev.category === 'DUPLICATE') subScore = (report.scores?.duplicateSimilarityScore || 50) / 100;

      return {
        type,
        score: Math.min(Math.max(subScore, 0.0), 1.0),
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(ev.severity) ? ev.severity : 'LOW',
        explanation: ev.description ? `${ev.title}: ${ev.description}` : ev.title || 'Risk signal detected',
        evidence: ev.metrics || {},
      };
    });

    // Fallback signal if no evidence items were generated
    if (signals.length === 0) {
      signals.push({
        type: 'RISK_SUMMARY',
        score: report.overallRiskScore / 100,
        severity: report.riskLevel || 'LOW',
        explanation: report.explainability?.summary || 'Routine AI risk assessment evaluated.',
        evidence: {},
      });
    }

    const docData = {
      workId,
      score: Math.min(Math.max(Math.round(report.overallRiskScore), 0), 100),
      level: report.riskLevel || 'LOW',
      signals,
      modelVersion,
      generatedAt,
    };

    try {
      // Upsert to prevent duplicates: match on workId + modelVersion
      const existing = await RiskAssessmentModel.findOne({ workId, modelVersion });
      if (existing) {
        await RiskAssessmentModel.updateOne({ _id: existing._id }, { $set: docData });
        stats.updated++;
      } else {
        await RiskAssessmentModel.create(docData);
        stats.inserted++;
      }
    } catch (err: any) {
      stats.failed++;
      stats.errors.push({ workId, reason: err.message });
    }
  }

  return stats;
}
