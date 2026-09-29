import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import {
  getVendorProfiles,
  getAgencyProfiles,
  getVendorDetail,
} from '../services/vendorNetwork.service';

/**
 * GET /api/vendor-network/vendors
 * Returns all vendor profiles with concentration scores, scoped to user.
 */
export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const vendors = await getVendorProfiles(scopeFilter);
  res.json({ success: true, data: vendors });
});

/**
 * GET /api/vendor-network/agencies
 * Returns all agency profiles with concentration scores, scoped to user.
 */
export const listAgencies = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const agencies = await getAgencyProfiles(scopeFilter);
  res.json({ success: true, data: agencies });
});

/**
 * GET /api/vendor-network/vendor/:name
 * Returns detailed profile for a specific vendor.
 */
export const vendorDetail = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const name = decodeURIComponent(req.params.name);
  const vendor = await getVendorDetail(name, scopeFilter);

  if (!vendor) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Vendor not found.' },
    });
    return;
  }

  res.json({ success: true, data: vendor });
});
