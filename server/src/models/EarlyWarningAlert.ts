import mongoose, { Schema, Document } from 'mongoose';

export interface IEarlyWarningAlert extends Document {
  workId: string;
  triggerType: 'LEVEL_ESCALATION' | 'RAPID_SCORE_INCREASE';
  previousScore: number;
  newScore: number;
  previousLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  newLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreDelta: number;
  status: 'UNSEEN' | 'ACKNOWLEDGED';
  modelVersion: string;
  triggeredAt: Date;
}

const EarlyWarningAlertSchema = new Schema<IEarlyWarningAlert>(
  {
    workId: { type: String, required: true, index: true },
    triggerType: {
      type: String,
      enum: ['LEVEL_ESCALATION', 'RAPID_SCORE_INCREASE'],
      required: true,
    },
    previousScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    previousLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    newLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    scoreDelta: { type: Number, required: true },
    status: {
      type: String,
      enum: ['UNSEEN', 'ACKNOWLEDGED'],
      default: 'UNSEEN',
      required: true,
    },
    modelVersion: { type: String, required: true },
    triggeredAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true }
);

EarlyWarningAlertSchema.index({ workId: 1, triggeredAt: -1 });

export const EarlyWarningAlertModel = mongoose.model<IEarlyWarningAlert>(
  'EarlyWarningAlert',
  EarlyWarningAlertSchema
);
