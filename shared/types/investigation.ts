// ============================================================
// Investigation Contracts
// Matches: 04-DATABASE.md → investigations collection
// ============================================================

export enum InvestigationStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export type InvestigationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface InvestigationNote {
  _id: string;
  author: string;          // User _id
  authorName: string;
  content: string;
  createdAt: string;
}

export type InvestigationFinding =
  | 'NO_ISSUE'
  | 'MINOR_IRREGULARITY'
  | 'MAJOR_IRREGULARITY'
  | 'REFERRED_FOR_ACTION'
  | null;

export interface InvestigationHistoryEntry {
  _id?: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy?: string | null;
  changedByName: string;
  changedAt: string;
}

export interface Investigation {
  _id: string;
  workId: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  assignedTo: string | null;  // User _id
  notes: InvestigationNote[];
  finding: InvestigationFinding;
  history?: InvestigationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

