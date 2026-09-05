import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import { WorkModel } from '../models/Work';
import { ExpenditureModel } from '../models/Expenditure';
import { RiskAssessmentModel } from '../models/RiskAssessment';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/works
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', state, district, constituency, status, search, sort } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    if (state) filter['location.state'] = state;
    if (district) filter['location.district'] = district;
    if (constituency) filter['location.constituency'] = constituency;
    if (status) filter['execution.status'] = status;
    if (search) filter['description'] = { $regex: search, $options: 'i' };

    const sortObj: Record<string, 1 | -1> = {};
    if (sort) {
      const sortField = (sort as string).startsWith('-') ? (sort as string).slice(1) : (sort as string);
      sortObj[sortField] = (sort as string).startsWith('-') ? -1 : 1;
    } else {
      sortObj['updatedAt'] = -1;
    }

    const [works, total] = await Promise.all([
      WorkModel.find(filter).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      WorkModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: works,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch works.' },
    });
  }
});

// GET /api/works/:workId
router.get('/:workId', async (req: Request, res: Response) => {
  try {
    const work = await WorkModel.findOne({ workId: req.params.workId }).lean();
    if (!work) {
      res.status(404).json({
        success: false,
        error: { code: 'WORK_NOT_FOUND', message: 'Work could not be found.' },
      });
      return;
    }
    res.json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch work.' },
    });
  }
});

// GET /api/works/:workId/expenditures
router.get('/:workId/expenditures', async (req: Request, res: Response) => {
  try {
    const expenditures = await ExpenditureModel.find({ workId: req.params.workId })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data: expenditures });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch expenditures.' },
    });
  }
});

// GET /api/works/:workId/risk
router.get('/:workId/risk', async (req: Request, res: Response) => {
  try {
    const latest = await RiskAssessmentModel.findOne({ workId: req.params.workId })
      .sort({ generatedAt: -1 })
      .lean();
    if (!latest) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch risk assessment.' },
    });
  }
});

// GET /api/works/:workId/risk-history
router.get('/:workId/risk-history', async (req: Request, res: Response) => {
  try {
    const history = await RiskAssessmentModel.find({ workId: req.params.workId })
      .sort({ generatedAt: -1 })
      .lean();
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch risk history.' },
    });
  }
});

// GET /api/works/:workId/similar
router.get('/:workId/similar', async (req: Request, res: Response) => {
  try {
    // TODO: Member 5 — Wire to ML similarity service
    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch similar works.' },
    });
  }
});

export default router;
