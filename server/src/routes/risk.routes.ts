import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import { RiskAssessmentModel } from '../models/RiskAssessment';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/risk/high-risk
router.get('/high-risk', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Get latest risk assessment per work, filtered to HIGH/CRITICAL
    const pipeline: any[] = [
      { $sort: { generatedAt: -1 } },
      { $group: { _id: '$workId', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } },
      { $match: { level: { $in: ['HIGH', 'CRITICAL'] } } },
      { $sort: { score: -1 } },
      { $facet: {
          data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
          total: [{ $count: 'count' }],
        }
      },
    ];

    const [result] = await RiskAssessmentModel.aggregate(pipeline);
    const data = result.data || [];
    const total = result.total[0]?.count || 0;

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch high-risk works.' },
    });
  }
});

// GET /api/risk/alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    // TODO: Member 6 — Implement alert generation when risk changes
    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alerts.' },
    });
  }
});

// GET /api/risk/signals
router.get('/signals', async (req: Request, res: Response) => {
  try {
    // TODO: Member 6 — Aggregate signal type distribution
    res.json({
      success: true,
      data: {
        COST_ANOMALY: 420,
        TIMELINE_ANOMALY: 380,
        PAYMENT_ANOMALY: 210,
        SIMILARITY: 95,
        COMPLIANCE: 340,
        EARLY_WARNING: 155,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch signal summary.' },
    });
  }
});

export default router;
