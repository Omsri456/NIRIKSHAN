import { InvestigationModel } from '../models/Investigation';
import { AppError } from '../utils';

export interface InvestigationListQuery {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * POST /api/investigations — create a new investigation.
 */
export async function createInvestigation(body: { workId: string; priority?: string }, userId?: string) {
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
export async function listInvestigations(query: InvestigationListQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

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
export async function getInvestigation(id: string) {
  const investigation = await InvestigationModel.findById(id).lean();
  if (!investigation) {
    throw new AppError(404, 'INVESTIGATION_NOT_FOUND', 'Investigation not found.');
  }
  return investigation;
}

/**
 * PATCH /api/investigations/:id — update status / priority / finding /
 * assignee. Only provided fields are updated.
 */
export async function updateInvestigation(id: string, body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.finding !== undefined) update.finding = body.finding;
  if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo;

  const investigation = await InvestigationModel.findByIdAndUpdate(
    id,
    { $set: update },
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
export async function addNote(id: string, content: string, user?: { _id?: string; name?: string }) {
  const investigation = await InvestigationModel.findByIdAndUpdate(
    id,
    {
      $push: {
        notes: {
          author: user?._id,
          authorName: user?.name || 'Unknown',
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