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
  validate(createInvestigationSchema),
  authenticate,
  investigationController.create
);

// GET /api/investigations
router.get(
  '/',
  validate(listInvestigationsSchema),
  authenticate,
  investigationController.list
);

// GET /api/investigations/:id
router.get(
  '/:id',
  validate(investigationIdSchema),
  authenticate,
  investigationController.get
);

// PATCH /api/investigations/:id
router.patch(
  '/:id',
  validate({
    params: investigationIdSchema.params,
    body: updateInvestigationSchema.body,
  }),
  authenticate,
  investigationController.update
);

// POST /api/investigations/:id/notes
router.post(
  '/:id/notes',
  validate({
    params: investigationIdSchema.params,
    body: addNoteSchema.body,
  }),
  authenticate,
  investigationController.addNote
);

export default router;
