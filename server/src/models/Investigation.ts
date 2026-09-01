import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestigation extends Document {
  workId: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: mongoose.Types.ObjectId | null;
  notes: Array<{
    author: mongoose.Types.ObjectId;
    authorName: string;
    content: string;
    createdAt: Date;
  }>;
  finding: 'NO_ISSUE' | 'MINOR_IRREGULARITY' | 'MAJOR_IRREGULARITY' | 'REFERRED_FOR_ACTION' | null;
}

const InvestigationSchema = new Schema<IInvestigation>(
  {
    workId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    finding: {
      type: String,
      enum: ['NO_ISSUE', 'MINOR_IRREGULARITY', 'MAJOR_IRREGULARITY', 'REFERRED_FOR_ACTION', null],
      default: null,
    },
  },
  { timestamps: true }
);

export const InvestigationModel = mongoose.model<IInvestigation>(
  'Investigation',
  InvestigationSchema
);
