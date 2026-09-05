// ============================================================
// Expenditure Contracts
// Matches: 04-DATABASE.md → expenditures collection
// ============================================================

export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL' | 'CANCELLED';

export interface ExpenditureVendor {
  name: string;
}

export interface ExpenditureSource {
  dataset: string;
  recordId: string;
}

/** One work can have many expenditure records */
export interface Expenditure {
  _id: string;
  workId: string;
  amount: number;
  date: string;
  paymentStatus: PaymentStatus;
  vendor: ExpenditureVendor;
  implementingAgency: string;
  source: ExpenditureSource;
  createdAt: string;
  updatedAt: string;
}
