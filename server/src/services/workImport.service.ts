import { WorkModel, IWork } from '../models/Work';

export interface WorkImportStats {
  processed: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ workId: string; reason: string }>;
}

/**
 * Robust CSV parser that handles quotes, escaped quotes, and commas.
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && currentRow.some((f) => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] ? row[idx].trim() : '';
    });
    records.push(record);
  }

  return records;
}

function parseDateSafely(val?: string): Date | null {
  if (!val || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

const VALID_STATUSES: Array<'RECOMMENDED' | 'SANCTIONED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED'> = [
  'RECOMMENDED',
  'SANCTIONED',
  'IN_PROGRESS',
  'COMPLETED',
  'DROPPED',
];

/**
 * Maps a single flat CSV record to the nested Work document schema.
 */
export function mapCsvRecordToWork(record: Record<string, string>, datasetName: string = 'unified_works_v1') {
  const workId = (record['workId'] || '').trim();
  const recAmount = parseFloat(record['recommendedAmount']) || 0;
  const finAmount = parseFloat(record['finalAmount']) || recAmount;
  const totExp = parseFloat(record['totalExpenditure']) || 0;

  const rawStatus = (record['workStatus'] || record['status'] || 'IN_PROGRESS').toUpperCase().replace(/\s+/g, '_');
  const status = VALID_STATUSES.includes(rawStatus as any)
    ? (rawStatus as 'RECOMMENDED' | 'SANCTIONED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED')
    : 'IN_PROGRESS';

  const rawHouse = (record['house'] || '').toLowerCase();
  const house: 'Lok Sabha' | 'Rajya Sabha' = rawHouse.includes('rajya') ? 'Rajya Sabha' : 'Lok Sabha';

  return {
    workId,
    description: record['workDescription'] || record['description'] || 'MPLADS Work',
    category: record['category'] || 'General Infrastructure',
    mp: {
      name: record['mpName'] || 'Hon. MP',
      house,
    },
    location: {
      state: record['state'] || 'Unspecified State',
      district: record['district'] || 'Unspecified District',
      constituency: record['constituency'] || record['district'] || 'General',
    },
    implementingAgency: {
      name: record['ida'] || 'District Implementing Agency',
      type: 'Government Agency',
    },
    recommendation: {
      date: parseDateSafely(record['recommendationDate']),
      amount: recAmount,
    },
    execution: {
      startDate: parseDateSafely(record['startDate']),
      completionDate: parseDateSafely(record['completedDate'] || record['completionDate']),
      status,
    },
    financial: {
      finalAmount: finAmount,
      totalExpenditure: totExp,
    },
    asset: {
      description: status === 'COMPLETED' ? record['workDescription'] || 'Completed Asset' : null,
      status: status === 'COMPLETED' ? ('CREATED' as const) : ('PENDING' as const),
    },
    source: {
      dataset: datasetName,
      lastUpdated: new Date(),
    },
  };
}

/**
 * Upserts works into MongoDB Work collection from raw CSV content.
 */
export async function upsertWorksFromCsv(
  csvContent: string,
  datasetName: string = 'unified_works_v1'
): Promise<WorkImportStats> {
  const records = parseCsv(csvContent);
  return upsertWorksFromRecords(records, datasetName);
}

/**
 * Upserts works into MongoDB Work collection from parsed records.
 */
export async function upsertWorksFromRecords(
  records: Array<Record<string, string>>,
  datasetName: string = 'unified_works_v1'
): Promise<WorkImportStats> {
  const stats: WorkImportStats = {
    processed: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  const validDocs = [];

  for (const record of records) {
    stats.processed++;
    const workId = (record['workId'] || '').trim();
    if (!workId) {
      stats.failed++;
      stats.errors.push({ workId: 'unknown', reason: 'Missing workId' });
      continue;
    }

    try {
      const workDoc = mapCsvRecordToWork(record, datasetName);
      validDocs.push(workDoc);
    } catch (err: any) {
      stats.failed++;
      stats.errors.push({ workId, reason: err.message || 'Failed to map CSV record' });
    }
  }

  // Batch bulkWrite operations in chunks of 1000
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < validDocs.length; i += CHUNK_SIZE) {
    const chunk = validDocs.slice(i, i + CHUNK_SIZE);
    const bulkOps = chunk.map((doc) => ({
      updateOne: {
        filter: { workId: doc.workId },
        update: { $set: doc },
        upsert: true,
      },
    }));

    try {
      const result = await WorkModel.bulkWrite(bulkOps, { ordered: false });
      stats.inserted += result.upsertedCount || 0;
      stats.updated += (result.modifiedCount || 0) + (result.matchedCount ? result.matchedCount - (result.modifiedCount || 0) : 0);
    } catch (err: any) {
      if (err.result) {
        stats.inserted += err.result.nUpserted || 0;
        stats.updated += err.result.nModified || 0;
      }
      stats.failed += err.writeErrors ? err.writeErrors.length : 1;
      stats.errors.push({
        workId: 'batch',
        reason: err.message || 'Error during bulk write',
      });
    }
  }

  return stats;
}
