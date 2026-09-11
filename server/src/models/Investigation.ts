import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestigation extends Document {
  workId: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'PENDING_VERIFICATION' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: mongoose.Types.ObjectId | null;
  notes: Array<{
    author: mongoose.Types.ObjectId;
    authorName: string;
    authorRole?: string | null;
    content: string;
    createdAt: Date;
  }>;
  finding: 'NO_ISSUE' | 'MINOR_IRREGULARITY' | 'MAJOR_IRREGULARITY' | 'REFERRED_FOR_ACTION' | null;
  history: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changedBy: mongoose.Types.ObjectId | null;
    changedByName: string;
    changedAt: Date;
  }>;
}

const InvestigationSchema = new Schema<IInvestigation>(
  {
    workId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'PENDING_VERIFICATION', 'RESOLVED', 'DISMISSED'],
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
        authorRole: { type: String, default: null },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    finding: {
      type: String,
      enum: ['NO_ISSUE', 'MINOR_IRREGULARITY', 'MAJOR_IRREGULARITY', 'REFERRED_FOR_ACTION', null],
      default: null,
    },
    history: [
      {
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed, default: null },
        newValue: { type: Schema.Types.Mixed, default: null },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        changedByName: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);


export const InvestigationModel = mongoose.model<IInvestigation>(
  'Investigation',
  InvestigationSchema
);
