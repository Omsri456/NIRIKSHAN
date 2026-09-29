import type { ApiResponse } from '@nirikshan/shared';
import { apiClient } from './client';

export interface VendorWork {
  workId: string;
  description: string;
  category: string;
  status: string;
  district: string;
  state: string;
  riskScore: number;
  riskLevel: string;
  expenditure: number;
}

export interface VendorProfile {
  name: string;
  type: 'vendor' | 'agency';
  worksCount: number;
  workIds: string[];
  distinctDistricts: string[];
  distinctStates: string[];
  totalExpenditure: number;
  averageRiskScore: number;
  highRiskCount: number;
  criticalCount: number;
  highRiskPercentage: number;
  activeInvestigations: number;
  concentrationScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  works: VendorWork[];
}

export async function fetchVendorProfiles(): Promise<VendorProfile[]> {
  const { data } = await apiClient.get<ApiResponse<VendorProfile[]>>('/vendor-network/vendors');
  return data.data;
}

export async function fetchAgencyProfiles(): Promise<VendorProfile[]> {
  const { data } = await apiClient.get<ApiResponse<VendorProfile[]>>('/vendor-network/agencies');
  return data.data;
}
