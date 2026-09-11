import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkRecommendation extends Document {
  recommendedBy: mongoose.Types.ObjectId;
  constituency: string;
  district: string;
  state: string;
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  createdWorkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkRecommendationSchema = new Schema<IWorkRecommendation>(
  {
    recommendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    constituency: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    estimatedCost: { type: Number, required: true },
    justification: { type: String, required: true },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
      index: true,
    },
    createdWorkId: { type: String, default: null },
  },
  { timestamps: true }
);

WorkRecommendationSchema.index({ state: 1, district: 1, constituency: 1 });

export const WorkRecommendationModel = mongoose.model<IWorkRecommendation>(
  'WorkRecommendation',
  WorkRecommendationSchema
);
