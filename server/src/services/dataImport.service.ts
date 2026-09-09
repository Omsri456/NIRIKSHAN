/**
 * Data import service — existing placeholder behavior only.
 * The ETL pipeline is a later milestone and must not be implemented here.
 */
export function createPlaceholder(body: { filename?: string; dataset?: string }) {
  return {
    _id: 'placeholder',
    filename: body.filename || 'unknown',
    dataset: body.dataset || 'unknown',
    status: 'PENDING',
    totalRecords: 0,
    processedRecords: 0,
    errorCount: 0,
    message: 'Data import endpoint ready. ETL pipeline to be implemented by Member 4.',
  };
}

/**
 * GET /api/data-imports — currently returns an empty list (existing behavior).
 */
export function listImports() {
  return [];
}