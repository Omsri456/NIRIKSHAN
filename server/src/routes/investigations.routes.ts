import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createInvestigationSchema,
  listInvestigationsSchema,
  investigationIdSchema,
  updateInvestigationSchema,
  addNoteSchema,
} from '../validators';
import * as investigationController from '../controllers/investigation.controller';

const router = Router();

// POST /api/investigations
router.post(
  '/',
  authenticate,
  validate(createInvestigationSchema),
  investigationController.create
);

// GET /api/investigations
router.get(
  '/',
  authenticate,
  validate(listInvestigationsSchema),
  investigationController.list
);

// GET /api/investigations/:id
router.get(
  '/:id',
  authenticate,
  validate(investigationIdSchema),
  investigationController.get
);

// PATCH /api/investigations/:id
router.patch(
  '/:id',
  authenticate,
  validate({
    params: investigationIdSchema.params,
    body: updateInvestigationSchema.body,
  }),
  investigationController.update
);

// POST /api/investigations/:id/notes
router.post(
  '/:id/notes',
  authenticate,
  validate({
    params: investigationIdSchema.params,
    body: addNoteSchema.body,
  }),
  investigationController.addNote
);

export default router;
