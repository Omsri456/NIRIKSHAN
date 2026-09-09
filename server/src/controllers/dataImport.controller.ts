import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils';
import * as dataImportService from '../services/dataImport.service';

/**
 * POST /api/data-imports — Execute data import pipeline (ADMIN only).
 * Accepts raw CSV string in body or JSON { csvContent, filename, dataset }.
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  let csvContent = '';
  let filename = (req.headers['x-filename'] as string) || '';
  let dataset = (req.headers['x-dataset'] as string) || '';

  if (typeof req.body === 'string') {
    csvContent = req.body;
  } else if (req.body && typeof req.body === 'object') {
    csvContent = req.body.csvContent || req.body.csv || '';
    if (!filename && req.body.filename) filename = req.body.filename;
    if (!dataset && req.body.dataset) dataset = req.body.dataset;
  }

  if (!csvContent || !csvContent.trim()) {
    throw new AppError(400, 'INVALID_REQUEST', 'CSV content is required.');
  }

  const userId = req.user?._id;
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  const data = await dataImportService.processDataImport({
    filename: filename || 'unified_works_upload.csv',
    dataset: dataset || 'unified_works_v1',
    csvContent,
    userId,
  });

  res.status(201).json({ success: true, data });
});

/**
 * GET /api/data-imports — List all data import history records (ADMIN only).
 */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dataImportService.listImports();
  res.json({ success: true, data });
});

/**
 * GET /api/data-imports/:id — Get details of a single data import record (ADMIN only).
 */
export const get = asyncHandler(async (req: Request, res: Response) => {
  const data = await dataImportService.getImportById(req.params.id);
  if (!data) {
    return res.status(404).json({
      success: false,
      error: { code: 'IMPORT_NOT_FOUND', message: 'Data import record not found.' },
    });
  }
  res.json({ success: true, data });
});