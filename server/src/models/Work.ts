import mongoose, { Schema, Document } from 'mongoose';

export interface IWork extends Document {
  workId: string;
  description: string;
  category: string;
  mp: {
    name: string;
    house: 'Lok Sabha' | 'Rajya Sabha';
  };
  location: {
    state: string;
    district: string;
    constituency: string;
  };
  implementingAgency: {
    name: string;
    type: string;
  };
  recommendation: {
    date: Date | null;
    amount: number;
  };
  execution: {
    startDate: Date | null;
    completionDate: Date | null;
    status: 'RECOMMENDED' | 'SANCTIONED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
  };
  financial: {
    finalAmount: number;
    totalExpenditure: number;
  };
  asset: {
    description: string | null;
    status: 'CREATED' | 'PENDING' | 'NOT_APPLICABLE';
  };
  source: {
    dataset: string;
    lastUpdated: Date;
  };
}

const WorkSchema = new Schema<IWork>(
  {
    workId: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    mp: {
      name: { type: String, required: true },
      house: { type: String, enum: ['Lok Sabha', 'Rajya Sabha'], required: true },
    },
    location: {
      state: { type: String, required: true, index: true },
      district: { type: String, required: true, index: true },
      constituency: { type: String, required: true, index: true },
    },
    implementingAgency: {
      name: { type: String, required: true },
      type: { type: String, required: true },
    },
    recommendation: {
      date: { type: Date, default: null },
      amount: { type: Number, required: true },
    },
    execution: {
      startDate: { type: Date, default: null },
      completionDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ['RECOMMENDED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'],
        default: 'RECOMMENDED',
        index: true,
      },
    },
    financial: {
      finalAmount: { type: Number, default: 0 },
      totalExpenditure: { type: Number, default: 0 },
    },
    asset: {
      description: { type: String, default: null },
      status: { type: String, enum: ['CREATED', 'PENDING', 'NOT_APPLICABLE'], default: 'PENDING' },
    },
    source: {
      dataset: { type: String, required: true },
      lastUpdated: { type: Date, required: true },
    },
  },
  { timestamps: true }
);

export const WorkModel = mongoose.model<IWork>('Work', WorkSchema);
