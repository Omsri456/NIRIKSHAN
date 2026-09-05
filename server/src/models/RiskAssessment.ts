import mongoose, { Schema, Document } from 'mongoose';

export interface IRiskAssessment extends Document {
  workId: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: Array<{
    type: string;
    score: number;
    severity: string;
    explanation: string;
    evidence: Record<string, unknown>;
  }>;
  modelVersion: string;
  generatedAt: Date;
}

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    workId: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    level: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    signals: [
      {
        type: { type: String, required: true },
        score: { type: Number, required: true },
        severity: { type: String, required: true },
        explanation: { type: String, required: true },
        evidence: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    modelVersion: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Risk assessments are historical — never overwrite, always append
RiskAssessmentSchema.index({ workId: 1, generatedAt: -1 });

export const RiskAssessmentModel = mongoose.model<IRiskAssessment>(
  'RiskAssessment',
  RiskAssessmentSchema
);
