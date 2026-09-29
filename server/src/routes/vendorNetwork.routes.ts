import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import * as vendorNetworkController from '../controllers/vendorNetwork.controller';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/vendor-network/vendors — Vendor profiles with concentration scores
router.get('/vendors', vendorNetworkController.listVendors);

// GET /api/vendor-network/agencies — Agency profiles with concentration scores
router.get('/agencies', vendorNetworkController.listAgencies);

// GET /api/vendor-network/vendor/:name — Detailed vendor profile
router.get('/vendor/:name', vendorNetworkController.vendorDetail);

export default router;
