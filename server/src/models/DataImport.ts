import mongoose, { Schema, Document } from 'mongoose';

export interface IDataImport extends Document {
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
  importedBy: mongoose.Types.ObjectId;
  startedAt: Date;
  completedAt: Date | null;
}

const DataImportSchema = new Schema<IDataImport>(
  {
    filename: { type: String, required: true },
    dataset: { type: String, required: true },
    status: {
      type: String,
      enum: ['RECEIVED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'RECEIVED',
    },
    totalRecords: { type: Number, default: 0 },
    processedRecords: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    errorMessages: [{ type: String }],
    stats: { type: Schema.Types.Mixed, default: {} },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const DataImportModel = mongoose.model<IDataImport>('DataImport', DataImportSchema);
