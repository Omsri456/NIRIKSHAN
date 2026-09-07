// ============================================================
// API Response Contracts
// Matches: 05-API.md → Standard Response / Error / Pagination
// ============================================================

/** Standard success response wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Standard error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;     // e.g. "WORK_NOT_FOUND"
    message: string;
  };
}

/** Pagination metadata for list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

/** Common query params for list endpoints */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  state?: string;
  district?: string;
  constituency?: string;
  status?: string;
  riskLevel?: string;
  search?: string;
}

/** Data import tracking */
export interface DataImport {
  _id: string;
  filename: string;
  dataset: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  errorMessages: string[];
  importedBy: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}
