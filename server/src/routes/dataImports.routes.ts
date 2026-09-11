import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createDataImportSchema } from '../validators';
import * as dataImportController from '../controllers/dataImport.controller';

const router = Router();

// POST /api/data-imports — Admin-only unless explicitly permitted
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createDataImportSchema),
  dataImportController.create
);

// GET /api/data-imports — Admin-only unless explicitly permitted
router.get('/', authenticate, authorize('ADMIN'), dataImportController.list);

// GET /api/data-imports/:id — Admin-only unless explicitly permitted
router.get('/:id', authenticate, authorize('ADMIN'), dataImportController.get);

export default router;
