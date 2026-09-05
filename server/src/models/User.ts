import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'MINISTRY' | 'STATE_AUTHORITY' | 'DISTRICT_AUTHORITY' | 'MP' | 'ADMIN';
  scope: {
    state: string | null;
    district: string | null;
    constituency: string | null;
  };
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['MINISTRY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP', 'ADMIN'],
    },
    scope: {
      state: { type: String, default: null },
      district: { type: String, default: null },
      constituency: { type: String, default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
