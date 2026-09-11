import { InvestigationModel } from '../models/Investigation';
import { WorkModel } from '../models/Work';
import { AppError } from '../utils';

export interface InvestigationListQuery {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * POST /api/investigations — create a new investigation.
 */
export async function createInvestigation(body: { workId: string; priority?: string }, userId?: string, scopeFilter: Record<string, unknown> = {}) {
  const work = await WorkModel.findOne({ workId: body.workId });
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  if (Object.keys(scopeFilter).length > 0) {
    const isWorkInScope = await WorkModel.exists({ workId: body.workId, ...scopeFilter });
    if (!isWorkInScope) {
      throw new AppError(403, 'FORBIDDEN', 'Work is outside of your scope.');
    }
  }

  // Prevent duplicate open investigations for the same work
  const existing = await InvestigationModel.findOne({
    workId: body.workId,
    status: { $in: ['OPEN', 'UNDER_REVIEW', 'PENDING_VERIFICATION'] },
  });
  if (existing) {
    throw new AppError(409, 'INVESTIGATION_EXISTS', 'An active investigation already exists for this work.');
  }

  return InvestigationModel.create({
    workId: body.workId,
    priority: body.priority || 'MEDIUM',
    assignedTo: userId || null,
    notes: [],
    finding: null,
  });
}

/**
 * GET /api/investigations — paginated list, optionally filtered by status.
 */
export async function listInvestigations(query: InvestigationListQuery, scopeFilter: Record<string, unknown> = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  if (Object.keys(scopeFilter).length > 0) {
    const scopedWorkIds = await WorkModel.find(scopeFilter).distinct('workId');
    filter.workId = { $in: scopedWorkIds };
  }

  const [investigations, total] = await Promise.all([
    InvestigationModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InvestigationModel.countDocuments(filter),
  ]);

  return {
    investigations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /api/investigations/:id — fetch a single investigation.
 */
export async function getInvestigation(id: string, scopeFilter: Record<string, unknown> = {}) {
  const investigation = await InvestigationModel.findById(id).lean();
  if (!investigation) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }

  const work = await WorkModel.findOne({ workId: investigation.workId });
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  if (Object.keys(scopeFilter).length > 0) {
    const isWorkInScope = await WorkModel.exists({ workId: investigation.workId, ...scopeFilter });
    if (!isWorkInScope) {
      throw new AppError(403, 'FORBIDDEN', 'Investigation is outside of your scope.');
    }
  }

  return investigation;
}

/**
 * PATCH /api/investigations/:id — update status / priority / finding /
 * assignee. Only provided fields are updated.
 */
export async function updateInvestigation(
  id: string,
  body: Record<string, unknown>,
  scopeFilter: Record<string, unknown> = {},
  user?: { _id?: string; name?: string; role?: string }
) {
  const investigationToCheck = await InvestigationModel.findById(id).lean();
  if (!investigationToCheck) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }

  const work = await WorkModel.findOne({ workId: investigationToCheck.workId });
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  if (Object.keys(scopeFilter).length > 0) {
    const isWorkInScope = await WorkModel.exists({ workId: investigationToCheck.workId, ...scopeFilter });
    if (!isWorkInScope) {
      throw new AppError(403, 'FORBIDDEN', 'Investigation is outside of your scope.');
    }
  }

  const targetStatus = body.status !== undefined ? (body.status as string) : undefined;
  const effectiveFinding =
    body.finding !== undefined ? (body.finding as string | null) : investigationToCheck.finding;
  const userRole = user?.role;

  // Rule: MP can view and comment on investigations but cannot modify status, priority, finding, or assignment
  if (userRole === 'MP') {
    if (
      body.status !== undefined ||
      body.priority !== undefined ||
      body.finding !== undefined ||
      body.assignedTo !== undefined
    ) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'MPs can view and comment on investigations but cannot modify their status or findings.'
      );
    }
  }

  // Rule 1: PENDING_VERIFICATION requires a finding to already be set or provided
  if (targetStatus === 'PENDING_VERIFICATION') {
    if (!effectiveFinding) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A finding must be set before requesting verification.');
    }
  }

  // Rule 2: Setting status to RESOLVED or DISMISSED requires role MINISTRY, STATE_AUTHORITY, or ADMIN
  if (targetStatus === 'RESOLVED' || targetStatus === 'DISMISSED') {
    const canClose = ['MINISTRY', 'STATE_AUTHORITY', 'ADMIN'].includes(userRole || '');
    if (!canClose) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only State Authority, Ministry, or Admin can resolve or dismiss an investigation.'
      );
    }

    // Rule 3: If finding is REFERRED_FOR_ACTION, only MINISTRY or ADMIN may set status to RESOLVED or DISMISSED
    if (effectiveFinding === 'REFERRED_FOR_ACTION' && userRole === 'STATE_AUTHORITY') {
      throw new AppError(403, 'FORBIDDEN', 'Only Ministry can close a case referred for action.');
    }
  }

  // Prevent changing finding to REFERRED_FOR_ACTION on already resolved/dismissed case if user is STATE_AUTHORITY
  if (
    body.finding === 'REFERRED_FOR_ACTION' &&
    (targetStatus === 'RESOLVED' ||
      targetStatus === 'DISMISSED' ||
      (!targetStatus &&
        (investigationToCheck.status === 'RESOLVED' || investigationToCheck.status === 'DISMISSED'))) &&
    userRole === 'STATE_AUTHORITY'
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Only Ministry can close a case referred for action.');
  }

  const update: Record<string, unknown> = {};
  const historyEntries: Array<Record<string, unknown>> = [];
  const changedByName = user?.name || 'System';
  const changedBy = user?._id || null;
  const now = new Date();

  if (body.status !== undefined && body.status !== investigationToCheck.status) {
    update.status = body.status;
    historyEntries.push({
      field: 'status',
      oldValue: investigationToCheck.status,
      newValue: body.status,
      changedBy,
      changedByName,
      changedAt: now,
    });
  }

  if (body.priority !== undefined && body.priority !== investigationToCheck.priority) {
    update.priority = body.priority;
    historyEntries.push({
      field: 'priority',
      oldValue: investigationToCheck.priority,
      newValue: body.priority,
      changedBy,
      changedByName,
      changedAt: now,
    });
  }

  if (body.finding !== undefined && body.finding !== investigationToCheck.finding) {
    update.finding = body.finding;
    historyEntries.push({
      field: 'finding',
      oldValue: investigationToCheck.finding,
      newValue: body.finding,
      changedBy,
      changedByName,
      changedAt: now,
    });
  }

  if (body.assignedTo !== undefined && String(body.assignedTo ?? '') !== String(investigationToCheck.assignedTo ?? '')) {
    update.assignedTo = body.assignedTo;
    historyEntries.push({
      field: 'assignedTo',
      oldValue: investigationToCheck.assignedTo,
      newValue: body.assignedTo,
      changedBy,
      changedByName,
      changedAt: now,
    });
  }

  const mongoUpdate: Record<string, unknown> = { $set: update };
  if (historyEntries.length > 0) {
    mongoUpdate.$push = { history: { $each: historyEntries } };
  }

  const investigation = await InvestigationModel.findByIdAndUpdate(
    id,
    mongoUpdate,
    { new: true, runValidators: true }
  ).lean();

  if (!investigation) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }
  return investigation;
}


/**
 * POST /api/investigations/:id/notes — append a note to an investigation.
 */
export async function addNote(id: string, content: string, user?: { _id?: string; name?: string; role?: string }, scopeFilter: Record<string, unknown> = {}) {
  const investigationToCheck = await InvestigationModel.findById(id).lean();
  if (!investigationToCheck) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }

  const work = await WorkModel.findOne({ workId: investigationToCheck.workId });
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  if (Object.keys(scopeFilter).length > 0) {
    const isWorkInScope = await WorkModel.exists({ workId: investigationToCheck.workId, ...scopeFilter });
    if (!isWorkInScope) {
      throw new AppError(403, 'FORBIDDEN', 'Investigation is outside of your scope.');
    }
  }

  const investigation = await InvestigationModel.findByIdAndUpdate(
    id,
    {
      $push: {
        notes: {
          author: user?._id,
          authorName: user?.name || 'Unknown',
          authorRole: user?.role || null,
          content,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  ).lean();

  if (!investigation) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }
  return investigation;
}