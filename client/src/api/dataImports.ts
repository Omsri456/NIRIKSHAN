import type { ApiResponse } from '@nirikshan/shared';
import { apiClient } from './client';

export interface DataImportRecord {
  _id: string;
  filename: string;
  dataset: string;
  status: 'RECEIVED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  errorMessages: string[];
  stats?: {
    updated?: number;
    inserted?: number;
    totalWorksScored?: number;
    riskDistribution?: Record<string, number>;
    elapsedSeconds?: number;
  };
  importedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  startedAt: string;
  completedAt: string | null;
  createdAt?: string;
}

export async function uploadCsvData(csvContent: string, filename: string): Promise<DataImportRecord> {
  const { data } = await apiClient.post<ApiResponse<DataImportRecord>>(
    '/data-imports',
    {
      filename,
      csvContent,
    },
    {
      timeout: 600000, // 10 minutes timeout for scoring pipeline
    }
  );
  return data.data;
}

export async function fetchDataImports(): Promise<DataImportRecord[]> {
  const { data } = await apiClient.get<ApiResponse<DataImportRecord[]>>('/data-imports');
  return data.data;
}

export async function fetchDataImport(id: string): Promise<DataImportRecord> {
  const { data } = await apiClient.get<ApiResponse<DataImportRecord>>(`/data-imports/${id}`);
  return data.data;
}
