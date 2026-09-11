/**
 * Notification Service — Generates role-filtered alerts from existing data.
 *
 * Reads existing Work, RiskAssessment, EarlyWarningAlert, and Investigation
 * models to produce notifications dynamically. Nothing is stored in a new
 * collection — this is a read-only view layer over existing data.
 *
 * Uses the same buildScopeFilter() pattern as every other service in the
 * project, so geographic scoping is consistent with the rest of the app.
 */

import { WorkModel } from '../models/Work';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { EarlyWarningAlertModel } from '../models/EarlyWarningAlert';
import type { AppNotification, NotificationType, NotificationSeverity } from '../types/notification';

// ── Helpers ───────────────────────────────────────────────────────────

function makeId(type: string, workId: string, extra = ''): string {
  const raw = `${type}::${workId}::${extra}`;
  // Simple deterministic hash so IDs are stable across requests
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `notif-${Math.abs(hash).toString(36)}`;
}

function truncate(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + '…';
}

// ── Role visibility rules ─────────────────────────────────────────────

const ROLE_VISIBILITY: Record<NotificationType, string[]> = {
  CRITICAL_RISK:     ['MINISTRY', 'ADMIN', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP'],
  HIGH_RISK:         ['MINISTRY', 'ADMIN', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP'],
  RISK_ESCALATION:   ['MINISTRY', 'ADMIN', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP'],
  PROJECT_DELAY:     ['MINISTRY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP'],
  FINANCIAL_ANOMALY: ['MINISTRY', 'ADMIN', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY'],
  DATA_QUALITY:      ['ADMIN'],
  STATUS_CHANGE:     ['MINISTRY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP'],
};

function isVisibleToRole(type: NotificationType, role: string): boolean {
  return (ROLE_VISIBILITY[type] || []).includes(role);
}

// ── Main Generator ────────────────────────────────────────────────────

interface NotificationQuery {
  role: string;
  scopeFilter: Record<string, unknown>;
}

export async function generateNotifications(query: NotificationQuery): Promise<AppNotification[]> {
  const { role, scopeFilter } = query;
  const notifications: AppNotification[] = [];

  // Fetch scoped works once — reused by all generators
  const works = await WorkModel.find(scopeFilter, {
    workId: 1,
    description: 1,
    category: 1,
    'location.state': 1,
    'location.district': 1,
    'location.constituency': 1,
    'execution.status': 1,
    'execution.startDate': 1,
    'execution.completionDate': 1,
    'financial.finalAmount': 1,
    'financial.totalExpenditure': 1,
    'recommendation.amount': 1,
    updatedAt: 1,
  }).lean();

  const workIds = works.map(w => w.workId);
  const workMap = new Map(works.map(w => [w.workId, w]));

  // Fetch latest risk assessment per work (single aggregation)
  const latestRisks = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    { $group: {
      _id: '$workId',
      score: { $first: '$score' },
      level: { $first: '$level' },
      generatedAt: { $first: '$generatedAt' },
      signals: { $first: '$signals' },
    }},
  ]);
  const riskMap = new Map(latestRisks.map(r => [r._id, r]));

  // ── 1. Critical Risk (score >= 80) ──────────────────────────────────
  if (isVisibleToRole('CRITICAL_RISK', role)) {
    for (const risk of latestRisks) {
      if (risk.score >= 80) {
        const work = workMap.get(risk._id);
        if (!work) continue;
        notifications.push({
          id: makeId('CRITICAL_RISK', risk._id),
          type: 'CRITICAL_RISK',
          severity: 'critical',
          title: 'Critical Risk Detected',
          message: `${truncate(work.description)} has reached Risk Score ${risk.score}.`,
          workId: risk._id,
          riskScore: risk.score,
          timestamp: risk.generatedAt?.toISOString?.() || new Date(risk.generatedAt).toISOString(),
          targetRoute: `/works/${risk._id}`,
          state: work.location?.state || null,
          district: work.location?.district || null,
        });
      }
    }
  }

  // ── 2. High Risk (score >= 60, < 80) ────────────────────────────────
  if (isVisibleToRole('HIGH_RISK', role)) {
    for (const risk of latestRisks) {
      if (risk.score >= 60 && risk.score < 80) {
        const work = workMap.get(risk._id);
        if (!work) continue;
        notifications.push({
          id: makeId('HIGH_RISK', risk._id),
          type: 'HIGH_RISK',
          severity: 'high',
          title: 'High Risk Work',
          message: `${truncate(work.description)} currently has a risk score of ${risk.score}.`,
          workId: risk._id,
          riskScore: risk.score,
          timestamp: risk.generatedAt?.toISOString?.() || new Date(risk.generatedAt).toISOString(),
          targetRoute: `/works/${risk._id}`,
          state: work.location?.state || null,
          district: work.location?.district || null,
        });
      }
    }
  }

  // ── 3. Risk Escalation (from EarlyWarningAlert collection) ──────────
  if (isVisibleToRole('RISK_ESCALATION', role)) {
    const alerts = await EarlyWarningAlertModel.find({
      workId: { $in: workIds },
      status: 'UNSEEN',
    }).sort({ triggeredAt: -1 }).limit(20).lean();

    for (const alert of alerts) {
      const work = workMap.get(alert.workId);
      notifications.push({
        id: makeId('RISK_ESCALATION', alert.workId, alert._id.toString()),
        type: 'RISK_ESCALATION',
        severity: alert.newLevel === 'CRITICAL' ? 'critical' : 'high',
        title: 'Risk Score Escalation',
        message: `${truncate(work?.description || alert.workId)} escalated from ${alert.previousLevel} (${alert.previousScore}) to ${alert.newLevel} (${alert.newScore}).`,
        workId: alert.workId,
        riskScore: alert.newScore,
        timestamp: alert.triggeredAt?.toISOString?.() || new Date(alert.triggeredAt).toISOString(),
        targetRoute: `/works/${alert.workId}`,
        state: work?.location?.state || null,
        district: work?.location?.district || null,
      });
    }
  }

  // ── 4. Project Delay (IN_PROGRESS > 12 months since start) ──────────
  if (isVisibleToRole('PROJECT_DELAY', role)) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    for (const work of works) {
      if (
        work.execution?.status === 'IN_PROGRESS' &&
        work.execution.startDate &&
        new Date(work.execution.startDate) < twelveMonthsAgo
      ) {
        const startDate = new Date(work.execution.startDate);
        const monthsElapsed = Math.round(
          (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        notifications.push({
          id: makeId('PROJECT_DELAY', work.workId),
          type: 'PROJECT_DELAY',
          severity: monthsElapsed > 24 ? 'high' : 'medium',
          title: 'Project Delay',
          message: `${truncate(work.description)} has been in progress for ${monthsElapsed} months without completion.`,
          workId: work.workId,
          riskScore: riskMap.get(work.workId)?.score ?? null,
          timestamp: work.execution.startDate?.toISOString?.() || new Date(work.execution.startDate).toISOString(),
          targetRoute: `/works/${work.workId}`,
          state: work.location?.state || null,
          district: work.location?.district || null,
        });
      }
    }
  }

  // ── 5. Financial Anomaly (expenditure > 110% of sanctioned) ─────────
  if (isVisibleToRole('FINANCIAL_ANOMALY', role)) {
    for (const work of works) {
      const finalAmt = work.financial?.finalAmount || 0;
      const expAmt = work.financial?.totalExpenditure || 0;
      if (finalAmt > 0 && expAmt > finalAmt * 1.1) {
        const overPercent = Math.round(((expAmt - finalAmt) / finalAmt) * 100);
        notifications.push({
          id: makeId('FINANCIAL_ANOMALY', work.workId),
          type: 'FINANCIAL_ANOMALY',
          severity: overPercent > 30 ? 'high' : 'medium',
          title: 'Financial Anomaly',
          message: `${truncate(work.description)} has expenditure ${overPercent}% over sanctioned amount.`,
          workId: work.workId,
          riskScore: riskMap.get(work.workId)?.score ?? null,
          timestamp: (work as any).updatedAt?.toISOString?.() || new Date().toISOString(),
          targetRoute: `/works/${work.workId}`,
          state: work.location?.state || null,
          district: work.location?.district || null,
        });
      }
    }
  }

  // ── 6. Data Quality (Admin-only: missing critical fields) ───────────
  if (isVisibleToRole('DATA_QUALITY', role)) {
    for (const work of works) {
      const issues: string[] = [];
      if (!work.description || work.description.trim().length === 0) issues.push('missing description');
      if (!work.recommendation?.amount || work.recommendation.amount === 0) issues.push('zero recommended amount');
      if (!work.location?.state) issues.push('missing state');
      if (!work.location?.district) issues.push('missing district');

      if (issues.length > 0) {
        notifications.push({
          id: makeId('DATA_QUALITY', work.workId),
          type: 'DATA_QUALITY',
          severity: 'low',
          title: 'Data Quality Issue',
          message: `${work.workId}: ${issues.join(', ')}.`,
          workId: work.workId,
          riskScore: null,
          timestamp: (work as any).updatedAt?.toISOString?.() || new Date().toISOString(),
          targetRoute: `/works/${work.workId}`,
          state: work.location?.state || null,
          district: work.location?.district || null,
        });
      }
    }
  }

  // ── 7. Status Change (completed in last 7 days) ─────────────────────
  if (isVisibleToRole('STATUS_CHANGE', role)) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const work of works) {
      if (work.execution?.status === 'COMPLETED') {
        const updatedAt = new Date((work as any).updatedAt || 0);
        if (updatedAt >= sevenDaysAgo) {
          notifications.push({
            id: makeId('STATUS_CHANGE', work.workId),
            type: 'STATUS_CHANGE',
            severity: 'info',
            title: 'Work Completed',
            message: `${truncate(work.description)} has been marked as completed.`,
            workId: work.workId,
            riskScore: riskMap.get(work.workId)?.score ?? null,
            timestamp: updatedAt.toISOString(),
            targetRoute: `/works/${work.workId}`,
            state: work.location?.state || null,
            district: work.location?.district || null,
          });
        }
      }
    }
  }

  // ── Sort: severity priority (critical first), then most recent ──────
  const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  notifications.sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Cap at 50 notifications to keep responses lean
  return notifications.slice(0, 50);
}
