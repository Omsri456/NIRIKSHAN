import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as dataImportService from '../services/dataImport.service';

/**
 * POST /api/data-imports — placeholder response (ETL is a later milestone).
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = dataImportService.createPlaceholder(req.body);
  res.status(201).json({ success: true, data });
});

/**
 * GET /api/data-imports — currently returns an empty list.
 */
export const list = (_req: Request, res: Response) => {
  res.json({ success: true, data: dataImportService.listImports() });
};

/**
 * GET /api/data-imports/:id — not implemented; controlled 404.
 */
export const get = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'IMPORT_NOT_FOUND', message: 'Data import not found.' },
  });
};