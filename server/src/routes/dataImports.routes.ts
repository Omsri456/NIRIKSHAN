import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// Admin-only unless explicitly permitted
router.use(authenticate, authorize('ADMIN'));

// POST /api/data-imports
router.post('/', async (req: Request, res: Response) => {
  // TODO: Member 4 — Implement file upload + ETL pipeline trigger
  res.status(201).json({
    success: true,
    data: {
      _id: 'placeholder',
      filename: req.body.filename || 'unknown',
      dataset: req.body.dataset || 'unknown',
      status: 'PENDING',
      totalRecords: 0,
      processedRecords: 0,
      errorCount: 0,
      message: 'Data import endpoint ready. ETL pipeline to be implemented by Member 4.',
    },
  });
});

// GET /api/data-imports
router.get('/', async (req: Request, res: Response) => {
  // TODO: Member 4 — Query DataImport collection
  res.json({ success: true, data: [] });
});

// GET /api/data-imports/:id
router.get('/:id', async (req: Request, res: Response) => {
  // TODO: Member 4 — Fetch specific import status
  res.status(404).json({
    success: false,
    error: { code: 'IMPORT_NOT_FOUND', message: 'Data import not found.' },
  });
});

export default router;
