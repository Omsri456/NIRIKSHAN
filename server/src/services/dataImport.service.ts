import mongoose from 'mongoose';
import { DataImportModel, IDataImport } from '../models/DataImport';
import { triggerBatchIngest } from './mlClient';
import { upsertWorksFromCsv } from './workImport.service';
import { importMlRiskScores } from './mlImport.service';
import { AppError } from '../utils';

export interface ProcessImportParams {
  filename?: string;
  dataset?: string;
  csvContent: string;
  userId: string | mongoose.Types.ObjectId;
}

/**
 * Executes end-to-end admin data ingestion:
 * 1. Tracks import in DataImport collection (RECEIVED -> PROCESSING).
 * 2. Forwards CSV to Python ML service for merge & batch scoring on full dataset.
 * 3. Upserts works into MongoDB Work collection (fills Work-import gap).
 * 4. Imports fresh risk scores into RiskAssessment collection (alert engine auto-evaluates).
 * 5. Marks DataImport as COMPLETED or FAILED.
 */
export async function processDataImport(params: ProcessImportParams): Promise<IDataImport> {
  const filename = params.filename || 'uploaded_works.csv';
  const dataset = params.dataset || 'unified_works_v1';
  const csvContent = (params.csvContent || '').trim();

  if (!csvContent) {
    throw new AppError(400, 'INVALID_CSV', 'CSV content cannot be empty.');
  }

  // 1. Create initial DataImport record in RECEIVED status
  const importRecord = await DataImportModel.create({
    filename,
    dataset,
    status: 'RECEIVED',
    importedBy: params.userId,
    startedAt: new Date(),
  });

  try {
    // Transition to PROCESSING
    importRecord.status = 'PROCESSING';
    await importRecord.save();

    // 2. Call ML Service to merge CSV into unified_works.csv and run full batch scoring
    const mlResponse = await triggerBatchIngest(csvContent);
    if (!mlResponse.success || !mlResponse.data) {
      const errorMsg = mlResponse.error || 'ML batch scoring service encountered an error.';
      importRecord.status = 'FAILED';
      importRecord.errorCount = 1;
      importRecord.errorMessages = [errorMsg];
      importRecord.completedAt = new Date();
      await importRecord.save();
      throw new AppError(502, 'ML_SCORING_FAILED', errorMsg);
    }

    // 3. Upsert works into MongoDB Work collection
    const workStats = await upsertWorksFromCsv(csvContent, dataset);

    // 4. Import newly generated risk scores from risk_scores.json into RiskAssessment collection
    const scoreStats = await importMlRiskScores();

    // 5. Mark COMPLETED
    importRecord.status = 'COMPLETED';
    importRecord.totalRecords = mlResponse.data.totalWorksScored || workStats.processed;
    importRecord.processedRecords = (mlResponse.data.updated || 0) + (mlResponse.data.inserted || 0);
    importRecord.errorCount = workStats.failed + scoreStats.failed;
    importRecord.errorMessages = [
      ...workStats.errors.map((e) => `[Work] ${e.workId}: ${e.reason}`),
      ...scoreStats.errors.map((e) => `[Score] ${e.workId}: ${e.reason}`),
    ].slice(0, 10);
    importRecord.stats = {
      updated: mlResponse.data.updated,
      inserted: mlResponse.data.inserted,
      totalWorksScored: mlResponse.data.totalWorksScored,
      riskDistribution: mlResponse.data.riskDistribution,
      elapsedSeconds: mlResponse.data.elapsedSeconds,
    };
    importRecord.completedAt = new Date();
    await importRecord.save();

    return importRecord;
  } catch (error: any) {
    if (importRecord.status !== 'FAILED') {
      importRecord.status = 'FAILED';
      importRecord.errorCount = (importRecord.errorCount || 0) + 1;
      importRecord.errorMessages = [error.message || 'Data import pipeline failed'];
      importRecord.completedAt = new Date();
      await importRecord.save();
    }
    throw error;
  }
}

/**
 * Lists all data import history records, sorted newest first.
 */
export async function listImports() {
  return DataImportModel.find()
    .sort({ startedAt: -1 })
    .populate('importedBy', 'name email role')
    .lean();
}

/**
 * Gets details of a specific data import record by ID.
 */
export async function getImportById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return DataImportModel.findById(id)
    .populate('importedBy', 'name email role')
    .lean();
}