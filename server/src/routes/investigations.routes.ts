import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { InvestigationModel } from '../models/Investigation';

const router = Router();

router.use(authenticate);

// POST /api/investigations
router.post('/', async (req: Request, res: Response) => {
  try {
    const { workId, priority } = req.body;
    if (!workId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workId is required.' },
      });
      return;
    }

    const investigation = await InvestigationModel.create({
      workId,
      priority: priority || 'MEDIUM',
      assignedTo: req.user?._id || null,
      notes: [],
      finding: null,
    });

    res.status(201).json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create investigation.' },
    });
  }
});

// GET /api/investigations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [investigations, total] = await Promise.all([
      InvestigationModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      InvestigationModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: investigations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investigations.' },
    });
  }
});

// GET /api/investigations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const investigation = await InvestigationModel.findById(req.params.id).lean();
    if (!investigation) {
      res.status(404).json({
        success: false,
        error: { code: 'INVESTIGATION_NOT_FOUND', message: 'Investigation not found.' },
      });
      return;
    }
    res.json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investigation.' },
    });
  }
});

// PATCH /api/investigations/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, priority, finding, assignedTo } = req.body;
    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (finding !== undefined) update.finding = finding;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;

    const investigation = await InvestigationModel.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!investigation) {
      res.status(404).json({
        success: false,
        error: { code: 'INVESTIGATION_NOT_FOUND', message: 'Investigation not found.' },
      });
      return;
    }

    res.json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update investigation.' },
    });
  }
});

// POST /api/investigations/:id/notes
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Note content is required.' },
      });
      return;
    }

    const investigation = await InvestigationModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            author: req.user?._id,
            authorName: req.user?.name || 'Unknown',
            content,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!investigation) {
      res.status(404).json({
        success: false,
        error: { code: 'INVESTIGATION_NOT_FOUND', message: 'Investigation not found.' },
      });
      return;
    }

    res.json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add note.' },
    });
  }
});

export default router;
