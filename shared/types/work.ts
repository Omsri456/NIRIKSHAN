// ============================================================
// Work Contracts
// Matches: 04-DATABASE.md → works collection
// ============================================================

export interface WorkMp {
  name: string;
  house: 'Lok Sabha' | 'Rajya Sabha';
}

export interface WorkLocation {
  state: string;
  district: string;
  constituency: string;
}

export interface ImplementingAgency {
  name: string;
  type: string;
}

export interface WorkRecommendation {
  date: string | null;
  amount: number;
}

export type WorkStatus =
  | 'RECOMMENDED'
  | 'SANCTIONED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DROPPED';

export interface WorkExecution {
  startDate: string | null;
  completionDate: string | null;
  status: WorkStatus;
}

export interface WorkFinancial {
  finalAmount: number;
  totalExpenditure: number;
}

export interface WorkAsset {
  description: string | null;
  status: 'CREATED' | 'PENDING' | 'NOT_APPLICABLE';
}

export interface WorkSource {
  dataset: string;
  lastUpdated: string;
}

/** Core work record — the central entity of the platform */
export interface Work {
  _id: string;
  workId: string; // Primary business identifier, e.g. "MPLADS-W-12345"
  description: string;
  category: string;
  mp: WorkMp;
  location: WorkLocation;
  implementingAgency: ImplementingAgency;
  recommendation: WorkRecommendation;
  execution: WorkExecution;
  financial: WorkFinancial;
  asset: WorkAsset;
  source: WorkSource;
  createdAt: string;
  updatedAt: string;
}
