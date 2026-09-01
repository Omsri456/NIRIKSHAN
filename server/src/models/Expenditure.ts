import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenditure extends Document {
  workId: string;
  amount: number;
  date: Date;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'CANCELLED';
  vendor: {
    name: string;
  };
  implementingAgency: string;
  source: {
    dataset: string;
    recordId: string;
  };
}

const ExpenditureSchema = new Schema<IExpenditure>(
  {
    workId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'PARTIAL', 'CANCELLED'],
      default: 'PENDING',
    },
    vendor: {
      name: { type: String, required: true },
    },
    implementingAgency: { type: String, required: true },
    source: {
      dataset: { type: String, required: true },
      recordId: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const ExpenditureModel = mongoose.model<IExpenditure>('Expenditure', ExpenditureSchema);
